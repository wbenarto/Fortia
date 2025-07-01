const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

const schema = `
-- Meals table for storing user meal logs
CREATE TABLE IF NOT EXISTS meals (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  food_name TEXT NOT NULL,
  portion_size TEXT NOT NULL,
  calories INTEGER,
  protein DECIMAL(5,2),
  carbs DECIMAL(5,2),
  fats DECIMAL(5,2),
  fiber DECIMAL(5,2),
  sugar DECIMAL(5,2),
  sodium INTEGER,
  confidence_score DECIMAL(3,2),
  meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User nutrition goals table
CREATE TABLE IF NOT EXISTS user_nutrition_goals (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  daily_calories INTEGER DEFAULT 2000,
  daily_protein DECIMAL(5,2) DEFAULT 150.0,
  daily_carbs DECIMAL(5,2) DEFAULT 250.0,
  daily_fats DECIMAL(5,2) DEFAULT 65.0,
  dob DATE,
  age INTEGER,
  weight DECIMAL(5,2),
  target_weight DECIMAL(5,2),
  height DECIMAL(5,2),
  gender TEXT,
  activity_level TEXT,
  fitness_goal TEXT,
  bmr DECIMAL(8,2),
  tdee DECIMAL(8,2),
  custom_calories INTEGER,
  custom_protein DECIMAL(5,2),
  custom_carbs DECIMAL(5,2),
  custom_fats DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- API logs table for monitoring
CREATE TABLE IF NOT EXISTS api_logs (
  id SERIAL PRIMARY KEY,
  user_id TEXT,
  request_text TEXT,
  response_data JSONB,
  tokens_used INTEGER,
  cost DECIMAL(10,4),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_meals_user_date ON meals(user_id, DATE(created_at));
CREATE INDEX IF NOT EXISTS idx_meals_created_at ON meals(created_at);
CREATE INDEX IF NOT EXISTS idx_nutrition_goals_user_id ON user_nutrition_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON api_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at);
`;

async function setupDatabase() {
	try {
		console.log('Setting up database tables...');

		// Split the schema into individual statements
		const statements = schema
			.split(';')
			.map(stmt => stmt.trim())
			.filter(stmt => stmt.length > 0);

		for (const statement of statements) {
			if (statement.trim()) {
				console.log('Executing:', statement.substring(0, 50) + '...');
				await sql(statement);
			}
		}

		console.log('✅ Database setup completed successfully!');
	} catch (error) {
		console.error('❌ Database setup failed:', error);
		process.exit(1);
	}
}

setupDatabase();
