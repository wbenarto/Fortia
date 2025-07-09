import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// GET - Retrieve user's data consent status
export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const clerkId = searchParams.get('clerkId');

		if (!clerkId) {
			return Response.json({ error: 'Clerk ID is required' }, { status: 400 });
		}

		const consentData = await sql`
      SELECT 
        data_collection_consent,
        consent_version,
        updated_at
      FROM data_consent 
      WHERE clerk_id = ${clerkId}
    `;

		if (consentData.length === 0) {
			return Response.json({
				success: true,
				data: null,
				message: 'No consent data found',
			});
		}

		return Response.json({
			success: true,
			data: consentData[0],
		});
	} catch (error) {
		console.error('Get data consent error:', error);
		return Response.json({ error: 'Failed to fetch consent data' }, { status: 500 });
	}
}

// POST - Store user's data consent
export async function POST(request: Request) {
	try {
		const {
			clerkId,
			dataCollectionConsent = false,
			consentVersion = '1.0',
			consentMethod = 'onboarding',
		} = await request.json();

		if (!clerkId) {
			return Response.json({ error: 'Clerk ID is required' }, { status: 400 });
		}

		// Upsert consent data
		const result = await sql`
      INSERT INTO data_consent (
        clerk_id,
        data_collection_consent,
        consent_version,
        consent_method,
        created_at,
        updated_at
      ) VALUES (
        ${clerkId},
        ${dataCollectionConsent},
        ${consentVersion},
        ${consentMethod},
        NOW(),
        NOW()
      )
      ON CONFLICT (clerk_id) 
      DO UPDATE SET
        data_collection_consent = EXCLUDED.data_collection_consent,
        consent_version = EXCLUDED.consent_version,
        consent_method = EXCLUDED.consent_method,
        updated_at = NOW()
      RETURNING *
    `;

		return Response.json({
			success: true,
			data: result[0],
		});
	} catch (error) {
		console.error('Store data consent error:', error);
		return Response.json({ error: 'Failed to store consent data' }, { status: 500 });
	}
}

// PUT - Update data consent
export async function PUT(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const clerkId = searchParams.get('clerkId');

		if (!clerkId) {
			return Response.json({ error: 'Clerk ID is required' }, { status: 400 });
		}

		const { dataCollectionConsent, consentVersion } = await request.json();

		const updateFields = [];
		const updateValues = [];

		if (dataCollectionConsent !== undefined) {
			updateFields.push('data_collection_consent = $' + (updateValues.length + 1));
			updateValues.push(dataCollectionConsent);
		}
		if (consentVersion) {
			updateFields.push('consent_version = $' + (updateValues.length + 1));
			updateValues.push(consentVersion);
		}

		if (updateFields.length === 0) {
			return Response.json({ error: 'No fields to update' }, { status: 400 });
		}

		updateFields.push('updated_at = NOW()');

		const query = `
      UPDATE data_consent 
      SET ${updateFields.join(', ')}
      WHERE clerk_id = $${updateValues.length + 1}
      RETURNING *
    `;

		const result = await sql(query, [...updateValues, clerkId]);

		if (result.length === 0) {
			return Response.json({ error: 'Consent record not found' }, { status: 404 });
		}

		return Response.json({
			success: true,
			data: result[0],
		});
	} catch (error) {
		console.error('Update data consent error:', error);
		return Response.json({ error: 'Failed to update consent data' }, { status: 500 });
	}
}
