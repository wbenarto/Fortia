import dotenv from 'dotenv';
// import { mealAnalysisRateLimiter } from '@/lib/rateLimiter';

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
	} catch (parseError) {
		console.error('Failed to parse request body:', parseError);
		return Response.json({ error: 'Invalid request body' }, { status: 400 });
	}

	const { foodDescription, portionSize = '100g', userId } = requestBody;

	// Rate limiting check
	if (!userId) {
		return Response.json({ error: 'User ID is required for rate limiting' }, { status: 400 });
	}

	// Rate limiting temporarily disabled for production build
	// if (!mealAnalysisRateLimiter.canMakeRequest(userId)) {
	// 	const usageInfo = mealAnalysisRateLimiter.getUsageInfo(userId);
	// 	return Response.json(
	// 		{
	// 			error: 'Daily meal analysis limit reached. You can analyze 20 meals per day.',
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
			console.log(`=== MEAL ANALYSIS API CALLED (Attempt ${attempt}/${maxRetries}) ===`);
			console.log('Processing meal analysis request');

			if (!foodDescription) {
				return Response.json({ error: 'Food description is required' }, { status: 400 });
			}

			if (!GEMINI_API_KEY) {
				return Response.json({ error: 'Gemini API key not configured' }, { status: 500 });
			}

			const prompt = `Analyze this food item and return nutrition facts in JSON format ONLY. Do not include any other text, explanations, or markdown formatting.

Food: ${foodDescription}
Portion: ${portionSize}

Return ONLY a valid JSON object with this exact structure:
{
  "calories": number,
  "protein": number,
  "carbs": number,
  "fats": number,
  "fiber": number,
  "sugar": number,
  "sodium": number,
  "confidence": number (0-1),
  "suggestions": ["food1", "food2", "food3"],
  "notes": "string with additional nutrition info"
}

Be accurate and realistic with the values. Do not include any text before or after the JSON object.`;

			// Comment out OpenAI request
			/*
		const response = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${OPENAI_API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model: 'gpt-4o-mini',
				messages: [
					{
						role: 'system',
						content: 'You are a nutrition expert. Provide accurate nutrition information in JSON format only.'
					},
					{
						role: 'user',
						content: prompt
					}
				],
				temperature: 0.3,
				max_tokens: 500,
			}),
		});
		*/

			// Gemini API request
			const requestBody = {
				contents: [
					{
						parts: [
							{
								text: `You are a nutrition expert. Provide accurate nutrition information in JSON format only. ${prompt}`,
							},
						],
					},
				],
				generationConfig: {
					temperature: 0.3,
					maxOutputTokens: 500,
				},
			};

			console.log('Sending request to Gemini API...');

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
			const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

			if (!content) {
				throw new Error('No response from Gemini');
			}

			// Parse the JSON response
			let nutritionData;
			try {
				// First, try to parse the content directly
				nutritionData = JSON.parse(content);
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
						console.log('Successfully extracted JSON with regex:', extractedJson);
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
							console.log('Successfully extracted JSON from code block:', extractedJson);
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
							console.log('Successfully extracted JSON after prefix:', extractedJson);
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
								console.log('Successfully extracted JSON from line:', extractedJson);
								break;
							}
						}
					} catch (lineError) {
						console.error('Line-by-line extraction failed:', lineError);
					}
				}

				if (extractedJson) {
					nutritionData = extractedJson;
				} else {
					console.error('All JSON extraction strategies failed');
					console.error('Full raw content:', content);
					throw new Error(
						`Could not parse JSON from Gemini response. Raw response: ${content.substring(0, 500)}...`
					);
				}
			}

			// Validate the nutrition data structure
			console.log('Parsed nutrition data:', nutritionData);

			// Ensure all required fields exist with fallbacks
			const validatedData = {
				calories: nutritionData.calories || 0,
				protein: nutritionData.protein || 0,
				carbs: nutritionData.carbs || 0,
				fats: nutritionData.fats || 0,
				fiber: nutritionData.fiber || 0,
				sugar: nutritionData.sugar || 0,
				sodium: nutritionData.sodium || 0,
				confidence: nutritionData.confidence || 0.5,
				suggestions: nutritionData.suggestions || [],
				notes: nutritionData.notes || '',
			};

			console.log('Validated nutrition data:', validatedData);

			// Record successful request for rate limiting
			// mealAnalysisRateLimiter.recordRequest(userId);

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
			console.error(`Meal analysis error (attempt ${attempt}):`, lastError);

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
					error: 'Failed to analyze meal',
					details: lastError.message,
				},
				{ status: 500 }
			);
		}
	}

	// This should never be reached, but just in case
	return Response.json(
		{
			error: 'Failed to analyze meal after all retries',
			details: lastError?.message || 'Unknown error',
		},
		{ status: 500 }
	);
}
