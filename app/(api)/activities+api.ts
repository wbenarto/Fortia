import { neon } from '@neondatabase/serverless';
import { getTodayDate } from '@/lib/dateUtils';

export async function POST(request: Request) {
	try {
		const sql = neon(`${process.env.DATABASE_URL}`);

		const { clerkId, activityDescription, estimatedCalories } = await request.json();
		if (!activityDescription || !clerkId) {
			return Response.json({ error: 'Missing required fields' }, { status: 400 });
		}

		const today = getTodayDate();

		// Insert the activity into the database
		const result = await sql`
			INSERT INTO activities (user_id, activity_description, estimated_calories, date)
			VALUES (${clerkId}, ${activityDescription}, ${estimatedCalories || null}, ${today})
			RETURNING id, activity_description, estimated_calories, date, created_at
		`;

		return new Response(
			JSON.stringify({
				success: true,
				data: result[0],
				message: 'Activity logged successfully',
			}),
			{ status: 201 }
		);
	} catch (error) {
		console.error('Activity POST error:', error);
		return Response.json({ error: 'Failed to save activity' }, { status: 400 });
	}
}

export async function DELETE(request: Request) {
	try {
		const sql = neon(`${process.env.DATABASE_URL}`);

		const { searchParams } = new URL(request.url);
		const activityId = searchParams.get('id');
		const userId = searchParams.get('userId');

		if (!activityId || !userId) {
			return Response.json({ error: 'Activity ID and User ID are required' }, { status: 400 });
		}

		// Delete the activity from the database
		const result = await sql`
			DELETE FROM activities 
			WHERE id = ${activityId} AND user_id = ${userId}
			RETURNING id
		`;

		if (result.length === 0) {
			return Response.json({ error: 'Activity not found or unauthorized' }, { status: 404 });
		}

		return new Response(
			JSON.stringify({
				success: true,
				message: 'Activity deleted successfully',
			}),
			{ status: 200 }
		);
	} catch (error) {
		console.error('Activity DELETE error:', error);
		return Response.json({ error: 'Failed to delete activity' }, { status: 400 });
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

		if (date) {
			const response = await sql`
				SELECT id, activity_description, estimated_calories, date, created_at
				FROM activities
				WHERE user_id = ${userId} AND date = ${date}
				ORDER BY created_at DESC
			`;
			return Response.json({ success: true, data: response });
		} else {
			const response = await sql`
				SELECT id, activity_description, estimated_calories, date, created_at
				FROM activities
				WHERE user_id = ${userId}
				ORDER BY created_at DESC
			`;
			return Response.json({ success: true, data: response });
		}
	} catch (error) {
		console.error('Activity GET error:', error);
		return Response.json({ error: 'Failed to fetch activities' }, { status: 400 });
	}
}
