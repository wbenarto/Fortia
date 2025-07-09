const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

const schema = `
-- Users table for storing user information
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  clerk_id TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  dob DATE,
  age INTEGER,
  weight DECIMAL(5,2),
  starting_weight DECIMAL(5,2),
  target_weight DECIMAL(5,2),
  height DECIMAL(5,2),
  gender TEXT,
  activity_level TEXT,
  fitness_goal TEXT,
  daily_calories INTEGER DEFAULT 2000,
  daily_protein DECIMAL(5,2) DEFAULT 150.0,
  daily_carbs DECIMAL(5,2) DEFAULT 250.0,
  daily_fats DECIMAL(5,2) DEFAULT 65.0,
  bmr DECIMAL(8,2),
  tdee DECIMAL(8,2),
  custom_calories INTEGER,
  custom_protein DECIMAL(5,2),
  custom_carbs DECIMAL(5,2),
  custom_fats DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Meals table for storing user meal logs
CREATE TABLE IF NOT EXISTS meals (
  id SERIAL PRIMARY KEY,
  clerk_id TEXT NOT NULL,
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

-- Weights table for tracking user weight over time
CREATE TABLE IF NOT EXISTS weights (
  id SERIAL PRIMARY KEY,
  clerk_id TEXT NOT NULL,
  weight DECIMAL(5,2) NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Steps table for tracking user step data
CREATE TABLE IF NOT EXISTS steps (
  id SERIAL PRIMARY KEY,
  clerk_id TEXT NOT NULL,
  steps INTEGER NOT NULL,
  goal INTEGER DEFAULT 10000,
  calories_burned INTEGER,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(clerk_id, date)
);

-- Activities table for tracking user workout activities
CREATE TABLE IF NOT EXISTS activities (
  id SERIAL PRIMARY KEY,
  clerk_id TEXT NOT NULL,
  activity_description TEXT NOT NULL,
  estimated_calories INTEGER,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- API logs table for monitoring
CREATE TABLE IF NOT EXISTS api_logs (
  id SERIAL PRIMARY KEY,
  clerk_id TEXT,
  request_text TEXT,
  response_data JSONB,
  tokens_used INTEGER,
  cost DECIMAL(10,4),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Privacy consent table for storing user consent records
CREATE TABLE IF NOT EXISTS privacy_consent (
  id SERIAL PRIMARY KEY,
  clerk_id TEXT NOT NULL UNIQUE,
  consent_given BOOLEAN NOT NULL DEFAULT false,
  consent_version TEXT NOT NULL,
  consent_method TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Data consent table for granular data collection preferences
CREATE TABLE IF NOT EXISTS data_consent (
  id SERIAL PRIMARY KEY,
  clerk_id TEXT NOT NULL UNIQUE,
  basic_profile BOOLEAN NOT NULL DEFAULT true,
  health_metrics BOOLEAN NOT NULL DEFAULT false,
  nutrition_data BOOLEAN NOT NULL DEFAULT false,
  weight_tracking BOOLEAN NOT NULL DEFAULT false,
  step_tracking BOOLEAN NOT NULL DEFAULT false,
  workout_activities BOOLEAN NOT NULL DEFAULT false,
  consent_version TEXT NOT NULL DEFAULT '1.0',
  consent_method TEXT NOT NULL DEFAULT 'onboarding',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_meals_clerk_id ON meals(clerk_id);
CREATE INDEX IF NOT EXISTS idx_meals_created_at ON meals(created_at);
CREATE INDEX IF NOT EXISTS idx_weights_clerk_id ON weights(clerk_id);
CREATE INDEX IF NOT EXISTS idx_weights_date ON weights(date);
CREATE INDEX IF NOT EXISTS idx_steps_clerk_id ON steps(clerk_id);
CREATE INDEX IF NOT EXISTS idx_steps_date ON steps(date);
CREATE INDEX IF NOT EXISTS idx_activities_clerk_id ON activities(clerk_id);
CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date);
CREATE INDEX IF NOT EXISTS idx_api_logs_clerk_id ON api_logs(clerk_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_privacy_consent_clerk_id ON privacy_consent(clerk_id);
CREATE INDEX IF NOT EXISTS idx_privacy_consent_created_at ON privacy_consent(created_at);
CREATE INDEX IF NOT EXISTS idx_data_consent_clerk_id ON data_consent(clerk_id);
CREATE INDEX IF NOT EXISTS idx_data_consent_created_at ON data_consent(created_at);
`;

async function setupDatabase() {
	try {
		console.log('Setting up database tables...');

		// Drop existing tables to recreate with new schema
		console.log('Dropping existing tables...');
		await sql`DROP TABLE IF EXISTS user_nutrition_goals CASCADE`;
		await sql`DROP TABLE IF EXISTS users CASCADE`;
		await sql`DROP TABLE IF EXISTS meals CASCADE`;
		await sql`DROP TABLE IF EXISTS weights CASCADE`;
		await sql`DROP TABLE IF EXISTS steps CASCADE`;
		await sql`DROP TABLE IF EXISTS activities CASCADE`;
		await sql`DROP TABLE IF EXISTS api_logs CASCADE`;
		await sql`DROP TABLE IF EXISTS privacy_consent CASCADE`;
		await sql`DROP TABLE IF EXISTS data_consent CASCADE`;

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
