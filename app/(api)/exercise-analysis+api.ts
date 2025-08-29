import dotenv from 'dotenv';
// import { exerciseAnalysisRateLimiter } from '@/lib/rateLimiter';

// Load environment variables
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: Request) {
	const maxRetries = 3;
	let lastError: Error | null = null;

	// Read request body once before retry loop
	let requestBody;
	try {
		requestBody = await request.json();
		console.log('Exercise analysis request received');
	} catch (parseError) {
		console.error('Failed to parse request body:', parseError);
		return Response.json({ error: 'Invalid request body' }, { status: 400 });
	}

	const { exerciseDescription, duration, userId } = requestBody;

	// Rate limiting check
	if (!userId) {
		return Response.json({ error: 'User ID is required for rate limiting' }, { status: 400 });
	}

	// Rate limiting temporarily disabled for production build
	// if (!exerciseAnalysisRateLimiter.canMakeRequest(userId)) {
	// 	const usageInfo = exerciseAnalysisRateLimiter.getUsageInfo(userId);
	// 	return Response.json(
	// 		{
	// 			error: 'Daily exercise analysis limit reached. You can analyze 20 exercises per day.',
	// 			rateLimitInfo: {
	// 				used: usageInfo.count,
	// 				remaining: usageInfo.remaining,
	// 				resetDate: usageInfo.date,
	// 			},
	// 		},
	// 		{ status: 429 }
	// 	);
	// }

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			console.log(`=== EXERCISE ANALYSIS API CALLED (Attempt ${attempt}/${maxRetries}) ===`);

			if (!exerciseDescription) {
				return Response.json({ error: 'Exercise description is required' }, { status: 400 });
			}

			if (!GEMINI_API_KEY) {
				return Response.json({ error: 'Gemini API key not configured' }, { status: 500 });
			}

			const prompt = `Analyze this exercise and estimate calories burned in JSON format ONLY. Do not include any other text, explanations, or markdown formatting.

Exercise: ${exerciseDescription}
Duration: ${duration}

Return ONLY a valid JSON object with this exact structure:
{
  "calories_burned": number,
  "confidence": number (0-1),
  "notes": "string with additional exercise info or recommendations"
}

Be realistic with the calorie estimates. Consider the exercise type, intensity, and duration. Do not include any text before or after the JSON object.`;

			// Gemini API request
			const requestBody = {
				contents: [
					{
						parts: [
							{
								text: `You are a fitness expert. Provide accurate calorie burn estimates in JSON format only. ${prompt}`,
							},
						],
					},
				],
				generationConfig: {
					temperature: 0.3,
					maxOutputTokens: 300,
				},
			};

			const response = await fetch(
				`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(requestBody),
				}
			);

			console.log('Gemini API response status:', response.status);

			if (!response.ok) {
				const errorText = await response.text();
				console.error('Gemini API error response:', errorText);

				// Handle specific Gemini API errors
				if (response.status === 503) {
					throw new Error(
						'Gemini API is temporarily unavailable. Please try again in a few minutes.'
					);
				} else if (response.status === 429) {
					throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
				} else if (response.status === 400) {
					throw new Error('Invalid request to Gemini API. Please check your input.');
				} else {
					throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
				}
			}

			const data = await response.json();
			console.log('Gemini API response received');

			const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
			console.log('Extracted content from Gemini');

			if (!content) {
				throw new Error('No response from Gemini');
			}

			// Parse the JSON response
			let exerciseData;
			try {
				// First, try to parse the content directly
				exerciseData = JSON.parse(content);
			} catch (error) {
				console.error('Direct JSON parse error:', error);
				console.error('Raw content that failed to parse:', content);

				// Try multiple extraction strategies
				let extractedJson = null;

				// Strategy 1: Look for JSON object with regex
				try {
					const jsonMatch = content.match(/\{[\s\S]*\}/);
					if (jsonMatch) {
						extractedJson = JSON.parse(jsonMatch[0]);
					}
				} catch (regexError) {
					console.error('Regex extraction failed:', regexError);
				}

				// Strategy 2: Look for JSON between backticks (markdown code blocks)
				if (!extractedJson) {
					try {
						const codeBlockMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
						if (codeBlockMatch) {
							extractedJson = JSON.parse(codeBlockMatch[1]);
						}
					} catch (codeBlockError) {
						console.error('Code block extraction failed:', codeBlockError);
					}
				}

				// Strategy 3: Look for JSON after "JSON:" or similar prefixes
				if (!extractedJson) {
					try {
						const prefixMatch = content.match(/(?:JSON|json|Response|response):\s*(\{[\s\S]*\})/);
						if (prefixMatch) {
							extractedJson = JSON.parse(prefixMatch[1]);
						}
					} catch (prefixError) {
						console.error('Prefix extraction failed:', prefixError);
					}
				}

				// Strategy 4: Try to find any valid JSON object in the content
				if (!extractedJson) {
					try {
						// Split by lines and try to find JSON
						const lines = content.split('\n');
						for (const line of lines) {
							const trimmed = line.trim();
							if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
								extractedJson = JSON.parse(trimmed);

								break;
							}
						}
					} catch (lineError) {
						console.error('Line-by-line extraction failed:', lineError);
					}
				}

				if (extractedJson) {
					exerciseData = extractedJson;
				} else {
					console.error('All JSON extraction strategies failed');
					console.error('Full raw content:', content);
					throw new Error(
						`Could not parse JSON from Gemini response. Raw response: ${content.substring(0, 500)}...`
					);
				}
			}

			// Validate the exercise data structure
			console.log('Parsed exercise data:', exerciseData);

			// Ensure all required fields exist with fallbacks
			const validatedData = {
				calories_burned: exerciseData.calories_burned || 0,
				confidence: exerciseData.confidence || 0.5,
				notes: exerciseData.notes || '',
			};

			console.log('Validated exercise data:', validatedData);

			// Record successful request for rate limiting
			// exerciseAnalysisRateLimiter.recordRequest(userId);

			return Response.json({
				success: true,
				data: validatedData,
				tokens: data.usageMetadata?.totalTokenCount || 0,
				rateLimitInfo: {
					used: 0, // temporarily disabled
					remaining: 20, // temporarily disabled
				},
			});
		} catch (error) {
			lastError = error instanceof Error ? error : new Error('Unknown error');
			console.error(`Exercise analysis error (attempt ${attempt}):`, lastError);

			// If this is a retryable error and we haven't exhausted retries, wait and try again
			if (
				attempt < maxRetries &&
				(lastError.message.includes('temporarily unavailable') ||
					lastError.message.includes('overloaded') ||
					lastError.message.includes('rate limit'))
			) {
				const waitTime = attempt * 1000; // 1s, 2s, 3s
				console.log(`Retrying in ${waitTime}ms...`);
				await new Promise(resolve => setTimeout(resolve, waitTime));
				continue;
			}

			// If we've exhausted retries or it's a non-retryable error, return the error
			return Response.json(
				{
					error: 'Failed to analyze exercise',
					details: lastError.message,
				},
				{ status: 500 }
			);
		}
	}

	// This should never be reached, but just in case
	return Response.json(
		{
			error: 'Failed to analyze exercise after all retries',
			details: lastError?.message || 'Unknown error',
		},
		{ status: 500 }
	);
}
