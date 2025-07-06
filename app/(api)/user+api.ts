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

		console.log('POST request received:', { firstName, lastName, email, clerkId });

		if (!firstName || !lastName || !email || !clerkId) {
			console.error('Missing required fields in POST request');
			return Response.json({ error: 'Missing required fields' }, { status: 400 });
		}

		// First check if user already exists
		const existingUser = await sql`
			SELECT id FROM users WHERE email = ${email} OR clerk_id = ${clerkId}
		`;

		if (existingUser.length > 0) {
			console.log('User already exists, returning success');
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

		console.log('User creation response:', response);
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
						console.log('User already exists (duplicate key), returning success');
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

		console.log('PUT request received:', {
			clerkId,
			dob,
			age,
			weight,
			startingWeight,
			targetWeight,
			height,
			gender,
			activityLevel,
			fitnessGoal,
		});

		if (!clerkId) {
			console.error('Missing clerkId in PUT request');
			return Response.json({ error: 'Clerk ID is required' }, { status: 400 });
		}

		// First check if user exists
		const existingUser = await sql`
			SELECT id FROM users WHERE clerk_id = ${clerkId}
		`;

		console.log('Existing user check:', existingUser);

		if (existingUser.length === 0) {
			console.error('User not found for clerkId:', clerkId);
			return Response.json(
				{ error: 'User not found. Please complete sign-up first.' },
				{ status: 404 }
			);
		}

		const response = await sql`
        UPDATE users 
        SET 
            dob = ${dob},
            age = ${age},
            weight = ${weight},
            starting_weight = ${startingWeight},
            target_weight = ${targetWeight},
            height = ${height},
            gender = ${gender},
            activity_level = ${activityLevel},
            fitness_goal = ${fitnessGoal},
            daily_calories = ${dailyCalories},
            daily_protein = ${dailyProtein},
            daily_carbs = ${dailyCarbs},
            daily_fats = ${dailyFats},
            bmr = ${bmr},
            tdee = ${tdee},
            custom_calories = ${customCalories},
            custom_protein = ${customProtein},
            custom_carbs = ${customCarbs},
            custom_fats = ${customFats},
            updated_at = NOW()
        WHERE clerk_id = ${clerkId}
        `;

		console.log('Update response:', response);

		return Response.json({ success: true, data: response });
	} catch (err) {
		console.error('Update user error:', err);
		return Response.json({ error: 'Failed to update user' }, { status: 400 });
	}
}

// See https://neon.tech/docs/serverless/serverless-driver
// for more information
