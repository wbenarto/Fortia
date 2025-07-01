import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: Request) {
	try {
		const { foodDescription, portionSize = '100g' } = await request.json();

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
		const response = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
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
				}),
			}
		);

		if (!response.ok) {
			throw new Error(`Gemini API error: ${response.status}`);
		}

		const data = await response.json();

		const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

		if (!content) {
			throw new Error('No response from Gemini');
		}

		// Parse the JSON response
		let nutritionData;
		try {
			nutritionData = JSON.parse(content);
		} catch (error) {
			console.error('JSON parse error:', error);
			console.error('Raw content that failed to parse:', content);

			// Try to extract JSON from the response if it contains extra text
			try {
				const jsonMatch = content.match(/\{[\s\S]*\}/);
				if (jsonMatch) {
					nutritionData = JSON.parse(jsonMatch[0]);
				} else {
					throw new Error('No JSON object found in response');
				}
			} catch (extractError) {
				console.error('JSON extraction also failed:', extractError);
				throw new Error(
					`Invalid JSON response from Gemini. Raw response: ${content.substring(0, 200)}...`
				);
			}
		}

		return Response.json({
			success: true,
			data: nutritionData,
			tokens: data.usageMetadata?.totalTokenCount || 0,
		});
	} catch (error) {
		console.error('Meal analysis error:', error);
		return Response.json(
			{
				error: 'Failed to analyze meal',
				details: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 }
		);
	}
}
