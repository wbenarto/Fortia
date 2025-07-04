require('dotenv').config({ path: '.env' });
const { neon } = require('@neondatabase/serverless');

async function updateCalorieTargets() {
	try {
		const sql = neon(process.env.DATABASE_URL);

		console.log('🔄 Updating Calorie Targets to Match New Goal-Based Logic...\n');

		// Get all users with their nutrition goals
		const users = await sql`
            SELECT 
                user_id,
                daily_calories,
                bmr,
                tdee,
                fitness_goal,
                daily_protein,
                daily_carbs,
                daily_fats
            FROM user_nutrition_goals 
            WHERE tdee IS NOT NULL AND fitness_goal IS NOT NULL
        `;

		if (users.length === 0) {
			console.log('❌ No users found with complete nutrition data');
			return;
		}

		console.log(`📊 Found ${users.length} user(s) to update:\n`);

		let updatedCount = 0;

		for (const user of users) {
			// Calculate the correct calorie target based on fitness goal
			let newCalorieTarget;
			let deficit;
			let deficitPercentage;

			switch (user.fitness_goal) {
				case 'lose_weight':
					newCalorieTarget = Math.round(user.tdee * 0.8);
					deficit = user.tdee - newCalorieTarget;
					deficitPercentage = 20;
					break;
				case 'gain_muscle':
				case 'improve_fitness':
					newCalorieTarget = Math.round(user.tdee * 0.9);
					deficit = user.tdee - newCalorieTarget;
					deficitPercentage = 10;
					break;
				case 'maintain':
					newCalorieTarget = Math.round(user.tdee);
					deficit = 0;
					deficitPercentage = 0;
					break;
				default:
					newCalorieTarget = Math.round(user.tdee);
					deficit = 0;
					deficitPercentage = 0;
			}

			// Only update if the target is different
			if (user.daily_calories !== newCalorieTarget) {
				console.log(`👤 Updating User: ${user.user_id}`);
				console.log(`   Fitness Goal: ${user.fitness_goal}`);
				console.log(`   TDEE: ${user.tdee} kcal/day`);
				console.log(`   Old Target: ${user.daily_calories} kcal/day`);
				console.log(`   New Target: ${newCalorieTarget} kcal/day (${deficitPercentage}% deficit)`);
				console.log(
					`   Change: ${user.daily_calories - newCalorieTarget > 0 ? '-' : '+'}${Math.abs(user.daily_calories - newCalorieTarget)} kcal/day`
				);

				// Update the user's calorie target
				await sql`
                    UPDATE user_nutrition_goals 
                    SET 
                        daily_calories = ${newCalorieTarget},
                        updated_at = NOW()
                    WHERE user_id = ${user.user_id}
                `;

				console.log(`   ✅ Updated successfully\n`);
				updatedCount++;
			} else {
				console.log(
					`👤 User ${user.user_id}: Target already correct (${newCalorieTarget} kcal/day)\n`
				);
			}
		}

		console.log('📋 Update Summary:');
		console.log(`   Total Users Checked: ${users.length}`);
		console.log(`   Users Updated: ${updatedCount}`);
		console.log(`   Users Already Correct: ${users.length - updatedCount}`);

		if (updatedCount > 0) {
			console.log('\n✅ Calorie targets have been updated to match the new goal-based logic!');
			console.log(
				'💡 Users will now see the correct calorie targets based on their fitness goals:'
			);
			console.log('   - Lose Weight: 20% deficit of TDEE');
			console.log('   - Gain Muscle/Improve Fitness: 10% deficit of TDEE');
			console.log('   - Maintain Weight: TDEE (no deficit)');
		} else {
			console.log('\n✅ All users already have the correct calorie targets!');
		}
	} catch (error) {
		console.error('❌ Error updating calorie targets:', error);
	}
}

updateCalorieTargets();
