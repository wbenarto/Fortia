import { neon } from '@neondatabase/serverless';

export async function GET(request: Request) {
	try {
		const sql = neon(`${process.env.DATABASE_URL}`);
		const { searchParams } = new URL(request.url);
		const clerkId = searchParams.get('clerkId');

		if (!clerkId) {
			return Response.json({ error: 'Clerk ID is required' }, { status: 400 });
		}

		const result = await sql`
      SELECT * FROM users 
      WHERE clerk_id = ${clerkId}
    `;

		if (result.length === 0) {
			return Response.json(
				{
					error: 'User not found',
					needsSetup: true,
				},
				{ status: 404 }
			);
		}

		return Response.json({
			success: true,
			data: result[0],
		});
	} catch (error) {
		console.error('Get user error:', error);
		return Response.json({ error: 'Failed to get user' }, { status: 500 });
	}
}

export async function POST(request: Request) {
	const sql = neon(`${process.env.DATABASE_URL}`);
	let email: string = '',
		clerkId: string = '';

	try {
		const { firstName, lastName, email: emailParam, clerkId: clerkIdParam } = await request.json();
		email = emailParam;
		clerkId = clerkIdParam;

		if (!firstName || !lastName || !email || !clerkId) {
			console.error('Missing required fields in POST request');
			return Response.json({ error: 'Missing required fields' }, { status: 400 });
		}

		// First check if user already exists
		const existingUser = await sql`
			SELECT id FROM users WHERE email = ${email} OR clerk_id = ${clerkId}
		`;

		if (existingUser.length > 0) {
			return Response.json(
				{
					success: true,
					data: existingUser[0],
					message: 'User already exists',
				},
				{ status: 200 }
			);
		}

		const response = await sql`
        INSERT INTO users (
            first_name,
            last_name,
            email,
            clerk_id
        )
        VALUES (
            ${firstName},
            ${lastName},
            ${email},
            ${clerkId}
        )
        RETURNING *
        `;

		return Response.json({ success: true, data: response[0] }, { status: 201 });
	} catch (err) {
		console.error('User creation error:', err);

		// Check for specific database errors
		if (err instanceof Error) {
			if (err.message.includes('duplicate key')) {
				// If we still get a duplicate key error, try to fetch the existing user
				try {
					const existingUser = await sql`
						SELECT id FROM users WHERE email = ${email} OR clerk_id = ${clerkId}
					`;

					if (existingUser.length > 0) {
						return Response.json(
							{
								success: true,
								data: existingUser[0],
								message: 'User already exists',
							},
							{ status: 200 }
						);
					}
				} catch (fetchError) {
					console.error('Error fetching existing user:', fetchError);
				}

				return Response.json({ error: 'User already exists with this email' }, { status: 409 });
			} else if (err.message.includes('connection')) {
				return Response.json({ error: 'Database connection failed' }, { status: 500 });
			}
		}

		return Response.json(
			{
				error: 'Failed to create user',
				details: err instanceof Error ? err.message : 'Unknown error',
			},
			{ status: 400 }
		);
	}
}

export async function PUT(request: Request) {
	try {
		const sql = neon(`${process.env.DATABASE_URL}`);

		const {
			clerkId,
			firstName,
			lastName,
			dob,
			age,
			weight,
			startingWeight,
			targetWeight,
			height,
			gender,
			activityLevel,
			fitnessGoal,
			dailyCalories,
			dailyProtein,
			dailyCarbs,
			dailyFats,
			bmr,
			tdee,
			customCalories,
			customProtein,
			customCarbs,
			customFats,
		} = await request.json();

		if (!clerkId) {
			console.error('Missing clerkId in PUT request');
			return Response.json({ error: 'Clerk ID is required' }, { status: 400 });
		}

		// First check if user exists
		const existingUser = await sql`
			SELECT id FROM users WHERE clerk_id = ${clerkId}
		`;

		if (existingUser.length === 0) {
			console.error('User not found for clerkId:', clerkId);
			return Response.json(
				{ error: 'User not found. Please complete sign-up first.' },
				{ status: 404 }
			);
		}

		// Only update fields that are provided (not undefined)
		const response = await sql`
        UPDATE users 
        SET 
            first_name = COALESCE(${firstName}, first_name),
            last_name = COALESCE(${lastName}, last_name),
            dob = COALESCE(${dob}, dob),
            age = COALESCE(${age}, age),
            weight = COALESCE(${weight}, weight),
            starting_weight = COALESCE(${startingWeight}, starting_weight),
            target_weight = COALESCE(${targetWeight}, target_weight),
            height = COALESCE(${height}, height),
            gender = COALESCE(${gender}, gender),
            activity_level = COALESCE(${activityLevel}, activity_level),
            fitness_goal = COALESCE(${fitnessGoal}, fitness_goal),
            daily_calories = COALESCE(${dailyCalories}, daily_calories),
            daily_protein = COALESCE(${dailyProtein}, daily_protein),
            daily_carbs = COALESCE(${dailyCarbs}, daily_carbs),
            daily_fats = COALESCE(${dailyFats}, daily_fats),
            bmr = COALESCE(${bmr}, bmr),
            tdee = COALESCE(${tdee}, tdee),
            custom_calories = COALESCE(${customCalories}, custom_calories),
            custom_protein = COALESCE(${customProtein}, custom_protein),
            custom_carbs = COALESCE(${customCarbs}, custom_carbs),
            custom_fats = COALESCE(${customFats}, custom_fats),
            updated_at = NOW()
        WHERE clerk_id = ${clerkId}
        `;

		return Response.json({ success: true, data: response });
	} catch (err) {
		console.error('Update user error:', err);
		return Response.json({ error: 'Failed to update user' }, { status: 400 });
	}
}

// See https://neon.tech/docs/serverless/serverless-driver
// for more information
