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

-- Weights table for tracking user weight over time
CREATE TABLE IF NOT EXISTS weights (
  id SERIAL PRIMARY KEY,
  clerk_id TEXT NOT NULL,
  weight DECIMAL(5,2) NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
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

-- Steps table for tracking user step data
CREATE TABLE IF NOT EXISTS steps (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  steps INTEGER NOT NULL,
  goal INTEGER DEFAULT 10000,
  calories_burned INTEGER,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Activities table for tracking user workout activities
CREATE TABLE IF NOT EXISTS activities (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  activity_description TEXT NOT NULL,
  estimated_calories INTEGER,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_meals_user_date ON meals(user_id, DATE(created_at));
CREATE INDEX IF NOT EXISTS idx_meals_created_at ON meals(created_at);
CREATE INDEX IF NOT EXISTS idx_weights_clerk_id ON weights(clerk_id);
CREATE INDEX IF NOT EXISTS idx_weights_date ON weights(date);
CREATE INDEX IF NOT EXISTS idx_steps_user_id ON steps(user_id);
CREATE INDEX IF NOT EXISTS idx_steps_date ON steps(date);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date);
CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON api_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at); 