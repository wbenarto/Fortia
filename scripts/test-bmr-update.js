const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

async function testBMRUpdate() {
	try {
		console.log('🔍 Testing BMR update functionality...\n');

		const userId = 'user_2rNlZq2wtjO9CTuCtoC09xhOYRL';

		// 1. Check current nutrition goals
		console.log('1. Checking current nutrition goals...');
		const nutritionGoals = await sql`
            SELECT * FROM user_nutrition_goals 
            WHERE user_id = ${userId}
            LIMIT 1
        `;

		if (nutritionGoals.length === 0) {
			console.log('❌ No nutrition goals found for test user');
			return;
		}

		const currentGoals = nutritionGoals[0];
		console.log('Current nutrition goals:');
		console.log(`- Weight: ${currentGoals.weight} kg`);
		console.log(`- Height: ${currentGoals.height} cm`);
		console.log(`- Age: ${currentGoals.age}`);
		console.log(`- Gender: ${currentGoals.gender}`);
		console.log(`- Activity Level: ${currentGoals.activity_level}`);
		console.log(`- Current BMR: ${currentGoals.bmr} kcal/day`);
		console.log(`- Current TDEE: ${currentGoals.tdee} kcal/day\n`);

		// 2. Simulate weight logging
		console.log('2. Simulating weight logging...');
		const newWeight = 75.5; // kg
		const testDate = new Date().toISOString().split('T')[0];

		console.log(`Logging new weight: ${newWeight} kg on ${testDate}`);

		// Insert weight record
		const weightResponse = await sql`
            INSERT INTO weights (
                weight,
                date,
                clerk_id
            )
            VALUES (
                ${newWeight},
                ${testDate},
                ${userId}
            )
            RETURNING *
        `;
		console.log('✅ Weight logged successfully');

		// 3. Calculate expected BMR
		console.log('\n3. Calculating expected BMR...');
		const calculateBMR = (weight, height, age, gender) => {
			if (gender === 'male') {
				return 10 * weight + 6.25 * height - 5 * age + 5;
			} else {
				return 10 * weight + 6.25 * height - 5 * age - 161;
			}
		};

		const calculateTDEE = (bmr, activityLevel) => {
			const activityMultipliers = {
				sedentary: 1.2,
				light: 1.375,
				moderate: 1.55,
				active: 1.725,
				very_active: 1.9,
			};
			const multiplier = activityMultipliers[activityLevel] || 1.2;
			return Math.round(bmr * multiplier);
		};

		const expectedBMR = Math.round(
			calculateBMR(newWeight, currentGoals.height, currentGoals.age, currentGoals.gender)
		);
		const expectedTDEE = calculateTDEE(expectedBMR, currentGoals.activity_level);

		console.log(`Expected BMR: ${expectedBMR} kcal/day`);
		console.log(`Expected TDEE: ${expectedTDEE} kcal/day`);

		// 4. Update nutrition goals with new BMR
		console.log('\n4. Updating nutrition goals with new BMR...');
		const updateResult = await sql`
            UPDATE user_nutrition_goals 
            SET 
                weight = ${newWeight},
                bmr = ${expectedBMR},
                tdee = ${expectedTDEE},
                updated_at = NOW()
            WHERE user_id = ${userId}
            RETURNING *
        `;

		if (updateResult.length > 0) {
			console.log('✅ Nutrition goals updated successfully');
			console.log(`New BMR: ${updateResult[0].bmr} kcal/day`);
			console.log(`New TDEE: ${updateResult[0].tdee} kcal/day`);
		} else {
			console.log('❌ Failed to update nutrition goals');
		}

		// 5. Verify the update
		console.log('\n5. Verifying the update...');
		const updatedGoals = await sql`
            SELECT * FROM user_nutrition_goals 
            WHERE user_id = ${userId}
        `;

		if (updatedGoals.length > 0) {
			const updated = updatedGoals[0];
			console.log('Updated nutrition goals:');
			console.log(`- Weight: ${updated.weight} kg`);
			console.log(`- BMR: ${updated.bmr} kcal/day`);
			console.log(`- TDEE: ${updated.tdee} kcal/day`);
			console.log(`- Updated at: ${updated.updated_at}`);

			if (updated.bmr === expectedBMR) {
				console.log('✅ BMR update successful!');
			} else {
				console.log("❌ BMR update failed - values don't match");
			}
		}
	} catch (error) {
		console.error('❌ Error during BMR update test:', error);
	}
}

testBMRUpdate();
