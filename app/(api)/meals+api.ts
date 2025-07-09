import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import { getTodayDate, getDayBounds } from '@/lib/dateUtils';

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

// GET - Get user's meals for a specific date
export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const clerkId = searchParams.get('clerkId');
		const date = searchParams.get('date') || getTodayDate();
		const summary = searchParams.get('summary');

		if (!clerkId) {
			return Response.json({ error: 'Clerk ID is required' }, { status: 400 });
		}

		// Get day bounds for proper timezone handling
		const { start, end } = getDayBounds(date);

		if (summary === 'true') {
			// Get daily nutrition summary using timezone-aware date range
			const summaryData = await sql`
        SELECT 
          COALESCE(SUM(calories), 0) as total_calories,
          COALESCE(SUM(protein), 0) as total_protein,
          COALESCE(SUM(carbs), 0) as total_carbs,
          COALESCE(SUM(fats), 0) as total_fats,
          COALESCE(SUM(fiber), 0) as total_fiber,
          COALESCE(SUM(sugar), 0) as total_sugar,
          COALESCE(SUM(sodium), 0) as total_sodium,
          COUNT(*) as meal_count
        FROM meals 
        WHERE clerk_id = ${clerkId} 
        AND created_at >= ${start.toISOString()}
        AND created_at < ${end.toISOString()}
      `;

			return Response.json({
				success: true,
				data: summaryData[0] || {
					total_calories: 0,
					total_protein: 0,
					total_carbs: 0,
					total_fats: 0,
					total_fiber: 0,
					total_sugar: 0,
					total_sodium: 0,
					meal_count: 0,
				},
			});
		}

		// Get individual meals for the date using timezone-aware date range
		const meals = await sql`
      SELECT * FROM meals 
      WHERE clerk_id = ${clerkId} 
      AND created_at >= ${start.toISOString()}
      AND created_at < ${end.toISOString()}
      ORDER BY created_at DESC
    `;

		return Response.json({ success: true, data: meals });
	} catch (error) {
		console.error('Get meals error:', error);
		return Response.json(
			{
				error: 'Failed to fetch meals',
				details: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 }
		);
	}
}

// POST - Log a new meal
export async function POST(request: Request) {
	try {
		// Check if request has a body
		const contentType = request.headers.get('content-type');
		if (!contentType || !contentType.includes('application/json')) {
			return Response.json({ error: 'Content-Type must be application/json' }, { status: 400 });
		}

		let body;
		try {
			body = await request.json();
		} catch (parseError) {
			console.error('JSON parse error:', parseError);
			return Response.json({ error: 'Invalid JSON in request body' }, { status: 400 });
		}

		const {
			clerkId,
			foodName,
			portionSize,
			calories,
			protein,
			carbs,
			fats,
			fiber,
			sugar,
			sodium,
			confidenceScore,
			mealType = 'snack',
		} = body;

		if (!clerkId || !foodName || !portionSize) {
			return Response.json(
				{ error: 'Clerk ID, food name, and portion size are required' },
				{ status: 400 }
			);
		}

		const newMeal = await sql`
      INSERT INTO meals (
        clerk_id, food_name, portion_size, calories, protein, carbs, fats, 
        fiber, sugar, sodium, confidence_score, meal_type
      ) VALUES (
        ${clerkId}, ${foodName}, ${portionSize}, ${calories}, ${protein}, ${carbs}, ${fats},
        ${fiber}, ${sugar}, ${sodium}, ${confidenceScore}, ${mealType}
      ) RETURNING *
    `;

		return Response.json({ success: true, data: newMeal[0] });
	} catch (error) {
		console.error('Create meal error:', error);
		return Response.json(
			{
				error: 'Failed to create meal',
				details: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 }
		);
	}
}

// PUT - Update an existing meal
export async function PUT(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const mealId = searchParams.get('id');

		if (!mealId) {
			return Response.json({ error: 'Meal ID is required' }, { status: 400 });
		}

		// Check if request has a body
		const contentType = request.headers.get('content-type');
		if (!contentType || !contentType.includes('application/json')) {
			return Response.json({ error: 'Content-Type must be application/json' }, { status: 400 });
		}

		let body;
		try {
			body = await request.json();
		} catch (parseError) {
			console.error('JSON parse error:', parseError);
			return Response.json({ error: 'Invalid JSON in request body' }, { status: 400 });
		}

		const {
			foodName,
			portionSize,
			calories,
			protein,
			carbs,
			fats,
			fiber,
			sugar,
			sodium,
			confidenceScore,
			mealType,
		} = body;

		const updatedMeal = await sql`
      UPDATE meals SET
        food_name = COALESCE(${foodName}, food_name),
        portion_size = COALESCE(${portionSize}, portion_size),
        calories = COALESCE(${calories}, calories),
        protein = COALESCE(${protein}, protein),
        carbs = COALESCE(${carbs}, carbs),
        fats = COALESCE(${fats}, fats),
        fiber = COALESCE(${fiber}, fiber),
        sugar = COALESCE(${sugar}, sugar),
        sodium = COALESCE(${sodium}, sodium),
        confidence_score = COALESCE(${confidenceScore}, confidence_score),
        meal_type = COALESCE(${mealType}, meal_type),
        updated_at = NOW()
      WHERE id = ${mealId}
      RETURNING *
    `;

		if (updatedMeal.length === 0) {
			return Response.json({ error: 'Meal not found' }, { status: 404 });
		}

		return Response.json({ success: true, data: updatedMeal[0] });
	} catch (error) {
		console.error('Update meal error:', error);
		return Response.json(
			{
				error: 'Failed to update meal',
				details: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 }
		);
	}
}

// DELETE - Delete a meal
export async function DELETE(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const mealId = searchParams.get('id');

		if (!mealId) {
			return Response.json({ error: 'Meal ID is required' }, { status: 400 });
		}

		const deletedMeal = await sql`
      DELETE FROM meals WHERE id = ${mealId} RETURNING *
    `;

		if (deletedMeal.length === 0) {
			return Response.json({ error: 'Meal not found' }, { status: 404 });
		}

		return Response.json({ success: true, data: deletedMeal[0] });
	} catch (error) {
		console.error('Delete meal error:', error);
		return Response.json(
			{
				error: 'Failed to delete meal',
				details: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 }
		);
	}
}

// Debug endpoint to see all meals for a user
export async function PATCH(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const clerkId = searchParams.get('clerkId');

		if (!clerkId) {
			return Response.json({ error: 'Clerk ID is required' }, { status: 400 });
		}

		// Get all meals for debugging
		const allMeals = await sql`
      SELECT id, food_name, created_at, DATE(created_at) as date_only
      FROM meals 
      WHERE clerk_id = ${clerkId}
      ORDER BY created_at DESC
      LIMIT 10
    `;

		// Debug data removed for security

		return Response.json({
			success: true,
			data: allMeals,
			debug: {
				today: new Date().toISOString().split('T')[0],
				now: new Date().toISOString(),
			},
		});
	} catch (error) {
		console.error('Debug meals error:', error);
		return Response.json({ error: 'Debug failed' }, { status: 500 });
	}
}
