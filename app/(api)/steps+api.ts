import { neon } from '@neondatabase/serverless';

// Calorie calculation function
function calculateCaloriesFromSteps(steps: number, params: any): number {
	const { weight, height, gender, strideLength } = params;

	// Calculate stride length if not provided
	let calculatedStrideLength = strideLength;
	if (!calculatedStrideLength) {
		// Average stride length based on height and gender
		if (gender === 'male') {
			calculatedStrideLength = (height * 0.415) / 100; // Convert cm to meters
		} else {
			calculatedStrideLength = (height * 0.413) / 100; // Convert cm to meters
		}
	}

	// Calculate distance walked in meters
	const distanceMeters = steps * calculatedStrideLength;

	// Convert to kilometers
	const distanceKm = distanceMeters / 1000;

	// Calories burned per km varies by weight and walking speed
	// Average walking speed is ~5 km/h, moderate pace
	// Calories per km = weight (kg) × 0.6 (for moderate walking)
	const caloriesPerKm = weight * 0.6;

	// Total calories burned
	const totalCalories = distanceKm * caloriesPerKm;

	return Math.round(totalCalories);
}

export async function POST(request: Request) {
	try {
		const sql = neon(`${process.env.DATABASE_URL}`);

		const { userId, steps, goal = 10000, date, caloriesBurned } = await request.json();
		if (!userId || steps === undefined || !date) {
			return Response.json({ error: 'Missing required fields' }, { status: 400 });
		}

		// Fetch user's nutrition profile for calorie calculation
		let calculatedCalories = caloriesBurned;
		try {
			const userProfile = await sql`
				SELECT weight, height, age, gender 
				FROM user_nutrition_goals 
				WHERE user_id = ${userId}
			`;

			if (userProfile.length > 0 && steps > 0) {
				const profile = userProfile[0];
				if (profile.weight && profile.height && profile.gender) {
					calculatedCalories = calculateCaloriesFromSteps(steps, {
						weight: Number(profile.weight),
						height: Number(profile.height),
						gender: profile.gender,
					});
				}
			}
		} catch (error) {
			// Use provided caloriesBurned or fallback to 0
			calculatedCalories = caloriesBurned || 0;
		}

		// Upsert step data (insert or update) - only update if steps have changed
		const result = await sql`
			INSERT INTO steps (user_id, steps, goal, calories_burned, date)
			VALUES (${userId}, ${steps}, ${goal}, ${calculatedCalories}, ${date})
			ON CONFLICT (user_id, date) 
			DO UPDATE SET 
				steps = CASE 
					WHEN steps.steps != EXCLUDED.steps THEN EXCLUDED.steps
					ELSE steps.steps
				END,
				goal = EXCLUDED.goal,
				calories_burned = EXCLUDED.calories_burned,
				created_at = CASE 
					WHEN steps.steps != EXCLUDED.steps THEN NOW()
					ELSE steps.created_at
				END
			RETURNING *
		`;

		return Response.json({
			success: true,
			data: result[0],
		});
	} catch (err) {
		console.error('Steps POST error:', err);
		return Response.json({ error: 'Failed to save steps' }, { status: 400 });
	}
}

export async function GET(request: Request) {
	const sql = neon(`${process.env.DATABASE_URL}`);

	try {
		const { searchParams } = new URL(request.url);
		const userId = searchParams.get('userId');
		const date = searchParams.get('date');

		if (!userId) {
			return Response.json({ error: 'User ID is required' }, { status: 400 });
		}

		let query;
		if (date) {
			// Get steps for specific date
			query = sql`
				SELECT * FROM steps 
				WHERE user_id = ${userId} AND date = ${date}
				ORDER BY created_at DESC
				LIMIT 1
			`;
		} else {
			// Get all steps for user
			query = sql`
				SELECT * FROM steps 
				WHERE user_id = ${userId}
				ORDER BY date DESC
				LIMIT 30
			`;
		}

		const response = await query;

		return Response.json({ success: true, data: response });
	} catch (err) {
		console.error('Steps GET error:', err);
		return Response.json({ error: 'Failed to fetch steps' }, { status: 400 });
	}
}
