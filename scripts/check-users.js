const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

async function checkUsers() {
	try {
		console.log('🔍 Checking database users and nutrition goals...\n');

		// Check all nutrition goals
		console.log('1. All nutrition goals:');
		const nutritionGoals = await sql`
            SELECT user_id, weight, height, age, gender, activity_level, bmr, tdee, updated_at
            FROM user_nutrition_goals 
            ORDER BY updated_at DESC
        `;

		if (nutritionGoals.length === 0) {
			console.log('❌ No nutrition goals found in database');
		} else {
			nutritionGoals.forEach((goal, index) => {
				console.log(`${index + 1}. User: ${goal.user_id}`);
				console.log(`   Weight: ${goal.weight} kg`);
				console.log(`   Height: ${goal.height} cm`);
				console.log(`   Age: ${goal.age}`);
				console.log(`   Gender: ${goal.gender}`);
				console.log(`   Activity: ${goal.activity_level}`);
				console.log(`   BMR: ${goal.bmr} kcal/day`);
				console.log(`   TDEE: ${goal.tdee} kcal/day`);
				console.log(`   Updated: ${goal.updated_at}`);
				console.log('');
			});
		}

		// Check all weights
		console.log('2. All weight records:');
		const weights = await sql`
            SELECT clerk_id, weight, date, created_at
            FROM weights 
            ORDER BY created_at DESC
            LIMIT 10
        `;

		if (weights.length === 0) {
			console.log('❌ No weight records found in database');
		} else {
			weights.forEach((weight, index) => {
				console.log(`${index + 1}. User: ${weight.clerk_id}`);
				console.log(`   Weight: ${weight.weight} kg`);
				console.log(`   Date: ${weight.date}`);
				console.log(`   Created: ${weight.created_at}`);
				console.log('');
			});
		}
	} catch (error) {
		console.error('❌ Error checking users:', error);
	}
}

checkUsers();
