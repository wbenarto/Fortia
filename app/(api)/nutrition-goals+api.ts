import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Activity level multipliers for TDEE calculation
const activityMultipliers = {
	sedentary: 1.2, // Little/no exercise
	light: 1.375, // Light exercise 1-3 days/week
	moderate: 1.55, // Moderate exercise 3-5 days/week
	active: 1.725, // Hard exercise 6-7 days/week
	very_active: 1.9, // Very hard exercise, physical job
};

// Macro distributions by fitness goal
const macroDistributions = {
	lose_weight: { protein: 0.35, carbs: 0.35, fats: 0.3 },
	gain_muscle: { protein: 0.3, carbs: 0.45, fats: 0.25 },
	maintain: { protein: 0.25, carbs: 0.45, fats: 0.3 },
	improve_fitness: { protein: 0.3, carbs: 0.4, fats: 0.3 },
};

// Calculate BMR using Mifflin-St Jeor equation
const calculateBMR = (weight: number, height: number, age: number, gender: string) => {
	if (gender === 'male') {
		return 10 * weight + 6.25 * height - 5 * age + 5;
	} else {
		return 10 * weight + 6.25 * height - 5 * age - 161;
	}
};

// Calculate TDEE (Total Daily Energy Expenditure)
const calculateTDEE = (bmr: number, activityLevel: string) => {
	const multiplier = activityMultipliers[activityLevel as keyof typeof activityMultipliers] || 1.2;
	return bmr * multiplier;
};

// Calculate daily calories based on fitness goal and target weight
function calculateDailyCaloriesWithTarget(
	tdee: number,
	fitnessGoal: string,
	currentWeight: number,
	targetWeight: number
): number {
	const weightDifference = targetWeight - currentWeight; // kg
	const weeklyWeightChange = weightDifference / 12; // Assume 12 weeks for goal

	switch (fitnessGoal) {
		case 'lose_weight':
			// Create a deficit of 500-750 calories per day for 0.5-1 kg/week loss
			const deficit =
				weightDifference > 0
					? Math.min(750, Math.max(500, (Math.abs(weeklyWeightChange) * 7700) / 7))
					: 500;
			return Math.round(tdee - deficit);

		case 'gain_muscle':
			// Create a surplus of 300-500 calories per day for muscle gain
			const surplus =
				weightDifference < 0
					? Math.min(500, Math.max(300, (Math.abs(weeklyWeightChange) * 7700) / 7))
					: 300;
			return Math.round(tdee + surplus);

		case 'maintain':
			// Stay close to TDEE for maintenance
			return Math.round(tdee);

		case 'improve_fitness':
			// Slight deficit for body recomposition
			return Math.round(tdee - 200);

		default:
			return Math.round(tdee);
	}
}

// Calculate daily calories based on fitness goal
function calculateDailyCalories(tdee: number, fitnessGoal: string): number {
	switch (fitnessGoal) {
		case 'lose_weight':
			return Math.round(tdee - 500); // 500 calorie deficit
		case 'gain_muscle':
			return Math.round(tdee + 300); // 300 calorie surplus
		case 'maintain':
			return Math.round(tdee);
		case 'improve_fitness':
			return Math.round(tdee - 200); // Slight deficit for recomposition
		default:
			return Math.round(tdee);
	}
}

// Calculate macros based on calories and goal
const calculateMacros = (dailyCalories: number, fitnessGoal: string) => {
	const distribution =
		macroDistributions[fitnessGoal as keyof typeof macroDistributions] ||
		macroDistributions.maintain;

	return {
		protein: Math.round((dailyCalories * distribution.protein) / 4), // 4 calories per gram
		carbs: Math.round((dailyCalories * distribution.carbs) / 4), // 4 calories per gram
		fats: Math.round((dailyCalories * distribution.fats) / 9), // 9 calories per gram
	};
};

// Database connection (you'll need to implement this based on your setup)
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const userId = searchParams.get('userId');

		if (!userId) {
			return Response.json({ error: 'User ID is required' }, { status: 400 });
		}

		const result = await sql`
      SELECT * FROM user_nutrition_goals 
      WHERE user_id = ${userId}
    `;

		if (result.length === 0) {
			return Response.json(
				{
					error: 'No nutrition goals found for user',
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
		console.error('Get nutrition goals error:', error);
		return Response.json({ error: 'Failed to get nutrition goals' }, { status: 500 });
	}
}

export async function POST(request: Request) {
	try {
		const {
			userId,
			dob,
			age,
			weight,
			targetWeight,
			height,
			gender,
			activityLevel,
			fitnessGoal,
			customGoals,
		} = await request.json();

		if (
			!userId ||
			!dob ||
			!weight ||
			!targetWeight ||
			!height ||
			!gender ||
			!activityLevel ||
			!fitnessGoal
		) {
			return Response.json(
				{
					error:
						'Missing required fields: userId, dob, weight, targetWeight, height, gender, activityLevel, fitnessGoal',
				},
				{ status: 400 }
			);
		}

		// Calculate age from DOB
		const calculateAge = (dob: string): number => {
			const birthDate = new Date(dob);
			const today = new Date();
			let calculatedAge = today.getFullYear() - birthDate.getFullYear();
			const monthDiff = today.getMonth() - birthDate.getMonth();

			if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
				calculatedAge--;
			}

			return calculatedAge;
		};

		const calculatedAge = calculateAge(dob);

		// Validate age
		if (calculatedAge < 13 || calculatedAge > 120) {
			return Response.json(
				{
					error: 'Invalid date of birth. Age must be between 13 and 120 years.',
				},
				{ status: 400 }
			);
		}

		// Calculate goals automatically with target weight consideration
		const bmr = calculateBMR(weight, height, calculatedAge, gender);
		const tdee = calculateTDEE(bmr, activityLevel);
		const dailyCalories =
			customGoals?.calories ||
			calculateDailyCaloriesWithTarget(tdee, fitnessGoal, weight, targetWeight);
		const macros = calculateMacros(dailyCalories, fitnessGoal);

		const finalGoals = {
			daily_calories: customGoals?.calories || dailyCalories,
			daily_protein: customGoals?.protein || macros.protein,
			daily_carbs: customGoals?.carbs || macros.carbs,
			daily_fats: customGoals?.fats || macros.fats,
			dob: dob,
			age: calculatedAge,
			weight,
			target_weight: targetWeight,
			height,
			gender,
			activity_level: activityLevel,
			fitness_goal: fitnessGoal,
			custom_calories: customGoals?.calories || null,
			custom_protein: customGoals?.protein || null,
			custom_carbs: customGoals?.carbs || null,
			custom_fats: customGoals?.fats || null,
		};

		// Upsert goals (insert or update)
		const result = await sql`
      INSERT INTO user_nutrition_goals (
        user_id, daily_calories, daily_protein, daily_carbs, daily_fats,
        dob, age, weight, target_weight, height, gender, activity_level, fitness_goal,
        custom_calories, custom_protein, custom_carbs, custom_fats
      ) VALUES (
        ${userId}, ${finalGoals.daily_calories}, ${finalGoals.daily_protein}, 
        ${finalGoals.daily_carbs}, ${finalGoals.daily_fats}, ${finalGoals.dob}, 
        ${finalGoals.age}, ${finalGoals.weight}, ${finalGoals.target_weight}, 
        ${finalGoals.height}, ${finalGoals.gender}, ${finalGoals.activity_level}, 
        ${finalGoals.fitness_goal}, ${finalGoals.custom_calories}, ${finalGoals.custom_protein}, 
        ${finalGoals.custom_carbs}, ${finalGoals.custom_fats}
      )
      ON CONFLICT (user_id) 
      DO UPDATE SET
        daily_calories = EXCLUDED.daily_calories,
        daily_protein = EXCLUDED.daily_protein,
        daily_carbs = EXCLUDED.daily_carbs,
        daily_fats = EXCLUDED.daily_fats,
        dob = EXCLUDED.dob,
        age = EXCLUDED.age,
        weight = EXCLUDED.weight,
        target_weight = EXCLUDED.target_weight,
        height = EXCLUDED.height,
        gender = EXCLUDED.gender,
        activity_level = EXCLUDED.activity_level,
        fitness_goal = EXCLUDED.fitness_goal,
        custom_calories = EXCLUDED.custom_calories,
        custom_protein = EXCLUDED.custom_protein,
        custom_carbs = EXCLUDED.custom_carbs,
        custom_fats = EXCLUDED.custom_fats,
        updated_at = NOW()
      RETURNING *
    		`;

		return Response.json({
			success: true,
			data: result[0],
			calculations: {
				bmr: Math.round(bmr),
				tdee: Math.round(tdee),
				calculatedCalories: dailyCalories,
				calculatedMacros: macros,
				age: calculatedAge,
				weightDifference: Math.round((targetWeight - weight) * 2.20462), // Convert to lbs for display
			},
		});
	} catch (error) {
		console.error('Create/update nutrition goals error:', error);
		return Response.json(
			{
				error: 'Failed to create/update nutrition goals',
				details: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 }
		);
	}
}

export async function PUT(request: Request) {
	try {
		const { userId, customCalories, customProtein, customCarbs, customFats } = await request.json();

		if (!userId) {
			return Response.json({ error: 'User ID is required' }, { status: 400 });
		}

		const result = await sql`
      UPDATE user_nutrition_goals 
      SET 
        custom_calories = COALESCE(${customCalories}, custom_calories),
        custom_protein = COALESCE(${customProtein}, custom_protein),
        custom_carbs = COALESCE(${customCarbs}, custom_carbs),
        custom_fats = COALESCE(${customFats}, custom_fats),
        updated_at = NOW()
      WHERE user_id = ${userId}
      RETURNING *
    `;

		if (result.length === 0) {
			return Response.json({ error: 'User nutrition goals not found' }, { status: 404 });
		}

		return Response.json({
			success: true,
			data: result[0],
		});
	} catch (error) {
		console.error('Update nutrition goals error:', error);
		return Response.json({ error: 'Failed to update nutrition goals' }, { status: 500 });
	}
}

export async function DELETE(request: Request) {
	try {
		const { userId, goalId } = await request.json();

		if (!userId) {
			return Response.json({ error: 'User ID is required' }, { status: 400 });
		}

		// Delete the nutrition goals for the user
		const result = await sql`
      DELETE FROM user_nutrition_goals 
      WHERE user_id = ${userId}
      RETURNING *
    `;

		if (result.length === 0) {
			return Response.json({ error: 'User nutrition goals not found' }, { status: 404 });
		}

		return Response.json({
			success: true,
			message: 'Nutrition goals deleted successfully',
			data: result[0],
		});
	} catch (error) {
		console.error('Delete nutrition goals error:', error);
		return Response.json({ error: 'Failed to delete nutrition goals' }, { status: 500 });
	}
}
