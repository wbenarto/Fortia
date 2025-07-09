import { neon } from '@neondatabase/serverless';

// GET - Retrieve privacy consent status
export async function GET(request: Request) {
	try {
		const sql = neon(`${process.env.DATABASE_URL}`);
		const { searchParams } = new URL(request.url);
		const clerkId = searchParams.get('clerkId');

		if (!clerkId) {
			return Response.json({ error: 'Clerk ID is required' }, { status: 400 });
		}

		const result = await sql`
			SELECT * FROM privacy_consent 
			WHERE clerk_id = ${clerkId}
		`;

		if (result.length === 0) {
			return Response.json({
				success: true,
				data: {
					consent_given: false,
					consent_version: null,
					consent_method: null,
					created_at: null,
				},
			});
		}

		return Response.json({
			success: true,
			data: result[0],
		});
	} catch (error) {
		console.error('Get privacy consent error:', error);
		return Response.json({ error: 'Failed to get privacy consent' }, { status: 500 });
	}
}

// POST - Store privacy consent
export async function POST(request: Request) {
	try {
		const sql = neon(`${process.env.DATABASE_URL}`);
		const { clerkId, consentVersion, consentMethod, ipAddress, userAgent } = await request.json();

		if (!clerkId) {
			return Response.json({ error: 'Clerk ID is required' }, { status: 400 });
		}

		// Check if consent already exists
		const existingConsent = await sql`
			SELECT id FROM privacy_consent WHERE clerk_id = ${clerkId}
		`;

		if (existingConsent.length > 0) {
			// Update existing consent
			const result = await sql`
				UPDATE privacy_consent 
				SET 
					consent_given = true,
					consent_version = ${consentVersion || '1.0'},
					consent_method = ${consentMethod || 'onboarding'},
					ip_address = ${ipAddress || null},
					user_agent = ${userAgent || null},
					updated_at = NOW()
				WHERE clerk_id = ${clerkId}
				RETURNING *
			`;

			return Response.json({
				success: true,
				data: result[0],
				message: 'Privacy consent updated successfully',
			});
		} else {
			// Create new consent record
			const result = await sql`
				INSERT INTO privacy_consent (
					clerk_id,
					consent_given,
					consent_version,
					consent_method,
					ip_address,
					user_agent
				)
				VALUES (
					${clerkId},
					true,
					${consentVersion || '1.0'},
					${consentMethod || 'onboarding'},
					${ipAddress || null},
					${userAgent || null}
				)
				RETURNING *
			`;

			return Response.json({
				success: true,
				data: result[0],
				message: 'Privacy consent stored successfully',
			});
		}
	} catch (error) {
		console.error('Store privacy consent error:', error);
		return Response.json({ error: 'Failed to store privacy consent' }, { status: 500 });
	}
}

// PUT - Update privacy consent (for withdrawing consent)
export async function PUT(request: Request) {
	try {
		const sql = neon(`${process.env.DATABASE_URL}`);
		const { clerkId, consentGiven, consentVersion, consentMethod } = await request.json();

		if (!clerkId) {
			return Response.json({ error: 'Clerk ID is required' }, { status: 400 });
		}

		const result = await sql`
			UPDATE privacy_consent 
			SET 
				consent_given = ${consentGiven},
				consent_version = ${consentVersion || '1.0'},
				consent_method = ${consentMethod || 'settings'},
				updated_at = NOW()
			WHERE clerk_id = ${clerkId}
			RETURNING *
		`;

		if (result.length === 0) {
			return Response.json({ error: 'Privacy consent not found' }, { status: 404 });
		}

		return Response.json({
			success: true,
			data: result[0],
			message: 'Privacy consent updated successfully',
		});
	} catch (error) {
		console.error('Update privacy consent error:', error);
		return Response.json({ error: 'Failed to update privacy consent' }, { status: 500 });
	}
}
