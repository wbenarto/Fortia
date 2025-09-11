import { neon } from '@neondatabase/serverless';

export async function DELETE(request: Request) {
	try {
		const sql = neon(`${process.env.DATABASE_URL}`);
		const { searchParams } = new URL(request.url);
		const clerkId = searchParams.get('clerkId');

		if (!clerkId) {
			return Response.json({ error: 'Clerk ID is required' }, { status: 400 });
		}

		// Delete all user data from all tables in the correct order
		// Start with tables that reference other tables, then move to main tables

		// 1. Delete API logs
		await sql`
			DELETE FROM api_logs 
			WHERE clerk_id = ${clerkId}
		`;

		// 2. Delete deep focus sessions
		await sql`
			DELETE FROM deep_focus_sessions 
			WHERE clerk_id = ${clerkId}
		`;

		// 3. Delete activities
		await sql`
			DELETE FROM activities 
			WHERE clerk_id = ${clerkId}
		`;

		// 4. Delete steps
		await sql`
			DELETE FROM steps 
			WHERE clerk_id = ${clerkId}
		`;

		// 5. Delete weights
		await sql`
			DELETE FROM weights 
			WHERE clerk_id = ${clerkId}
		`;

		// 6. Delete meals
		await sql`
			DELETE FROM meals 
			WHERE clerk_id = ${clerkId}
		`;

		// 7. Delete consent data
		await sql`
			DELETE FROM data_consent 
			WHERE clerk_id = ${clerkId}
		`;

		await sql`
			DELETE FROM privacy_consent 
			WHERE clerk_id = ${clerkId}
		`;

		// 8. Finally, delete the user record

		const userResult = await sql`
			DELETE FROM users 
			WHERE clerk_id = ${clerkId}
			RETURNING id
		`;

		if (userResult.length === 0) {
		} else {
		}

		return Response.json({
			success: true,
			message: 'Account and all associated data deleted successfully',
			deletedUser: userResult.length > 0 ? userResult[0].id : null,
		});
	} catch (error) {
		console.error('Error deleting account:', error);
		return Response.json(
			{
				error: 'Failed to delete account',
				details: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 }
		);
	}
}
