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

-- Privacy consent table for tracking user privacy policy consent
CREATE TABLE IF NOT EXISTS privacy_consent (
  id SERIAL PRIMARY KEY,
  clerk_id TEXT NOT NULL,
  consent_given BOOLEAN NOT NULL DEFAULT true,
  consent_version TEXT NOT NULL DEFAULT '1.0',
  consent_method TEXT NOT NULL DEFAULT 'onboarding',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(clerk_id)
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

-- Deep focus sessions table for tracking user focus time
CREATE TABLE IF NOT EXISTS deep_focus_sessions (
  id SERIAL PRIMARY KEY,
  clerk_id TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  duration_minutes DECIMAL(5,2) GENERATED ALWAYS AS (duration_seconds / 60.0) STORED,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  session_start_time TIMESTAMP,
  session_end_time TIMESTAMP,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Workout sessions table for storing workout plans
CREATE TABLE IF NOT EXISTS workout_sessions (
  id SERIAL PRIMARY KEY,
  clerk_id TEXT NOT NULL,
  title TEXT NOT NULL,
  workout_type TEXT NOT NULL CHECK (workout_type IN ('exercise', 'barbell')),
  scheduled_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Workout exercises table for storing exercises within workout sessions
CREATE TABLE IF NOT EXISTS workout_exercises (
  id SERIAL PRIMARY KEY,
  workout_session_id INTEGER NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  sets INTEGER,
  reps INTEGER,
  weight DECIMAL(6,2), -- in lbs/kg
  duration TEXT, -- for cardio exercises (e.g., "30 minutes", "2 miles")
  order_index INTEGER NOT NULL DEFAULT 1, -- for exercise order in workout
  notes TEXT,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  calories_burned INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
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
CREATE INDEX IF NOT EXISTS idx_deep_focus_sessions_clerk_id ON deep_focus_sessions(clerk_id);
CREATE INDEX IF NOT EXISTS idx_deep_focus_sessions_date ON deep_focus_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_deep_focus_sessions_created_at ON deep_focus_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_clerk_id ON workout_sessions(clerk_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_date ON workout_sessions(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_created_at ON workout_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_session_id ON workout_exercises(workout_session_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_order ON workout_exercises(order_index); 