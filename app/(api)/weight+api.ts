import { neon } from '@neondatabase/serverless';
import { calculateBMR, calculateTDEE } from '@/lib/bmrUtils';
import { calculateBodyFatPercentage } from '@/lib/bodyFatUtils';

export async function POST(request: Request) {
	try {
		const sql = neon(`${process.env.DATABASE_URL}`);

		const { clerkId, weight, date } = await request.json();
		if (!weight || !date || !clerkId) {
			return Response.json({ error: 'Missing required fields' }, { status: 400 });
		}

		// Insert the weight record
		const weightResponse = await sql`
        INSERT INTO weights (
            weight,
            date,
            clerk_id
        )
        VALUES (
            ${weight},
            ${date},
            ${clerkId}
        )
        `;

		// Update BMR and TDEE in user table if they exist
		try {
			// Get user's data to calculate new BMR
			const userData = await sql`
				SELECT height, age, gender, activity_level 
				FROM users 
				WHERE clerk_id = ${clerkId}
			`;

			if (userData.length > 0) {
				const user = userData[0];
				const newBMR = Math.round(calculateBMR(weight, user.height, user.age, user.gender));
				const newTDEE = calculateTDEE(newBMR, user.activity_level);

				// Calculate body fat percentage
				const heightInInches = user.height / 2.54; // Convert cm to inches
				const bodyFatPercentage = calculateBodyFatPercentage(
					weight,
					heightInInches,
					user.age,
					user.gender
				);

				// Update user with new weight, BMR, TDEE, and body fat percentage
				await sql`
					UPDATE users 
					SET 
						weight = ${weight},
						bmr = ${newBMR},
						tdee = ${newTDEE},
						body_fat_percentage = ${bodyFatPercentage},
						updated_at = NOW()
					WHERE clerk_id = ${clerkId}
				`;

				// BMR and TDEE updated successfully
			}
		} catch (bmrError) {
			console.error('Failed to update BMR:', bmrError);
			// Don't fail the weight logging if BMR update fails
		}

		return new Response(
			JSON.stringify({
				data: weightResponse,
				message: 'Weight logged, BMR and body fat percentage updated successfully',
			}),
			{ status: 201 }
		);
	} catch (err) {
		console.error('Weight POST error:', err);
		return Response.json({ error: 'Failed to save weight' }, { status: 400 });
	}
}

export async function GET(request: Request) {
	const sql = neon(`${process.env.DATABASE_URL}`);

	try {
		const { searchParams } = new URL(request.url);
		const clerkId = searchParams.get('clerkId');

		if (!clerkId) {
			return Response.json({ error: 'Clerk ID is required' }, { status: 400 });
		}

		const response = await sql`
        SELECT * FROM weights 
        WHERE clerk_id = ${clerkId}
        ORDER BY date ASC, created_at ASC
        `;

		return Response.json({ data: response });
	} catch (err) {
		console.error('Weight GET error:', err);
		return Response.json({ error: 'Failed to fetch weights' }, { status: 400 });
	}
}

// See https://neon.tech/docs/serverless/serverless-driver
// for more information
