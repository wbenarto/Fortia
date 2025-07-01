import { neon } from '@neondatabase/serverless';

export async function POST(request: Request) {
	try {
		const sql = neon(`${process.env.DATABASE_URL}`);

		const { clerkId, weight, date } = await request.json();
		if (!weight || !date || !clerkId) {
			return Response.json({ error: 'Missing required fields' }, { status: 400 });
		}

		const response = await sql`
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
		return new Response(JSON.stringify({ data: response }), { status: 201 });
	} catch (err) {
		console.error('Weight POST error:', err);
		return Response.json({ error: 'Failed to save weight' }, { status: 400 });
	}
}

export async function GET(request: Request) {
	const sql = neon(`${process.env.DATABASE_URL}`);

	try {
		const weights = [];

		const response = await sql`
        SELECT * FROM weights 
        `;
		return Response.json({ data: response });
	} catch (err) {
		console.error('Weight GET error:', err);
		return Response.json({ error: 'Failed to fetch weights' }, { status: 400 });
	}
}

// See https://neon.tech/docs/serverless/serverless-driver
// for more information
