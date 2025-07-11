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
			console.error('Invalid content type:', contentType);
			return Response.json({ error: 'Content-Type must be application/json' }, { status: 400 });
		}

		let body;
		try {
			body = await request.json();
		} catch (parseError) {
			console.error('JSON parse error:', parseError);
			return Response.json({ error: 'Invalid JSON in request body' }, { status: 400 });
		}

		console.log('Meal POST request body:', body);

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

		// Enhanced validation with detailed logging
		if (!clerkId) {
			console.error('Missing clerkId in request');
			return Response.json({ error: 'Clerk ID is required' }, { status: 400 });
		}

		if (!foodName) {
			console.error('Missing foodName in request');
			return Response.json({ error: 'Food name is required' }, { status: 400 });
		}

		if (!portionSize) {
			console.error('Missing portionSize in request');
			return Response.json({ error: 'Portion size is required' }, { status: 400 });
		}

		// Validate and convert data types
		const validatedData = {
			clerkId: String(clerkId),
			foodName: String(foodName).trim(),
			portionSize: String(portionSize).trim(),
			calories: Number(calories) || 0,
			protein: Number(protein) || 0,
			carbs: Number(carbs) || 0,
			fats: Number(fats) || 0,
			fiber: Number(fiber) || 0,
			sugar: Number(sugar) || 0,
			sodium: Number(sodium) || 0,
			confidenceScore: Number(confidenceScore) || 0.5,
			mealType: String(mealType || 'snack'),
		};

		// Validate meal type
		const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
		if (!validMealTypes.includes(validatedData.mealType)) {
			console.error('Invalid meal type:', validatedData.mealType);
			return Response.json(
				{
					error: 'Invalid meal type',
					details: `Must be one of: ${validMealTypes.join(', ')}`,
					received: validatedData.mealType,
				},
				{ status: 400 }
			);
		}

		console.log('Validated data:', validatedData);

		console.log('Validating user exists in database for clerkId:', clerkId);

		// Check if user exists in database before creating meal
		const userCheck = await sql`
			SELECT id, first_name, last_name FROM users WHERE clerk_id = ${validatedData.clerkId}
		`;

		if (userCheck.length === 0) {
			console.error('User not found in database for clerkId:', validatedData.clerkId);
			return Response.json(
				{
					error: 'User not found in database. Please complete onboarding first.',
					clerkId: validatedData.clerkId,
					debug: 'User does not exist in users table',
				},
				{ status: 400 }
			);
		}

		console.log('User found in database:', userCheck[0]);

		// Log the exact data being inserted
		const insertData = {
			clerk_id: validatedData.clerkId,
			food_name: validatedData.foodName,
			portion_size: validatedData.portionSize,
			calories: validatedData.calories,
			protein: validatedData.protein,
			carbs: validatedData.carbs,
			fats: validatedData.fats,
			fiber: validatedData.fiber,
			sugar: validatedData.sugar,
			sodium: validatedData.sodium,
			confidence_score: validatedData.confidenceScore,
			meal_type: validatedData.mealType,
		};

		console.log('Inserting meal data:', insertData);
		console.log('Data types:', {
			clerk_id: typeof validatedData.clerkId,
			food_name: typeof validatedData.foodName,
			portion_size: typeof validatedData.portionSize,
			calories: typeof validatedData.calories,
			protein: typeof validatedData.protein,
			carbs: typeof validatedData.carbs,
			fats: typeof validatedData.fats,
			fiber: typeof validatedData.fiber,
			sugar: typeof validatedData.sugar,
			sodium: typeof validatedData.sodium,
			confidence_score: typeof validatedData.confidenceScore,
			meal_type: typeof validatedData.mealType,
		});

		const newMeal = await sql`
      INSERT INTO meals (
        clerk_id, food_name, portion_size, calories, protein, carbs, fats, 
        fiber, sugar, sodium, confidence_score, meal_type
      ) VALUES (
        ${validatedData.clerkId}, ${validatedData.foodName}, ${validatedData.portionSize}, ${validatedData.calories}, ${validatedData.protein}, ${validatedData.carbs}, ${validatedData.fats},
        ${validatedData.fiber}, ${validatedData.sugar}, ${validatedData.sodium}, ${validatedData.confidenceScore}, ${validatedData.mealType}
      ) RETURNING *
    `;

		console.log('Meal created successfully:', newMeal[0]);

		return Response.json({ success: true, data: newMeal[0] });
	} catch (error) {
		console.error('Create meal error:', error);

		// Handle specific database errors
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';

		if (errorMessage.includes('check constraint')) {
			return Response.json(
				{
					error: 'Invalid meal data',
					details: 'One or more fields contain invalid values. Please check your input.',
					debug: errorMessage,
				},
				{ status: 400 }
			);
		} else if (errorMessage.includes('foreign key')) {
			return Response.json(
				{
					error: 'User not found',
					details: 'The user does not exist in the database.',
					debug: errorMessage,
				},
				{ status: 400 }
			);
		} else if (errorMessage.includes('not null')) {
			return Response.json(
				{
					error: 'Missing required data',
					details: 'One or more required fields are missing.',
					debug: errorMessage,
				},
				{ status: 400 }
			);
		} else {
			return Response.json(
				{
					error: 'Failed to create meal',
					details: errorMessage,
				},
				{ status: 500 }
			);
		}
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

		// Get user info
		const userInfo = await sql`
			SELECT id, first_name, last_name, email, clerk_id, created_at
			FROM users 
			WHERE clerk_id = ${clerkId}
		`;

		// Get all meals for debugging
		const allMeals = await sql`
      SELECT id, food_name, created_at, DATE(created_at) as date_only
      FROM meals 
      WHERE clerk_id = ${clerkId}
      ORDER BY created_at DESC
      LIMIT 10
    `;

		return Response.json({
			success: true,
			user: userInfo.length > 0 ? userInfo[0] : null,
			meals: allMeals,
			debug: {
				today: new Date().toISOString().split('T')[0],
				now: new Date().toISOString(),
				clerkId: clerkId,
				userExists: userInfo.length > 0,
				mealCount: allMeals.length,
			},
		});
	} catch (error) {
		console.error('Debug meals error:', error);
		return Response.json({ error: 'Debug failed' }, { status: 500 });
	}
}
