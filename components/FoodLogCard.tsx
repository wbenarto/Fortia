import { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import ReanimatedSwipeable, {
	type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Ionicons } from '@expo/vector-icons';
import { useQuickLogStore } from '@/store';
import { SCREEN_BG } from '@/lib/theme';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface LoggedMeal {
	id: string;
	food_name: string;
	portion_size: string;
	calories: number;
	protein: number;
	carbs: number;
	fats: number;
	meal_type: string;
	ingredients: string[][] | null;
	created_at: string;
}

const MEAL_SECTIONS: { type: MealType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
	{ type: 'breakfast', label: 'Breakfast', icon: 'sunny-outline' },
	{ type: 'lunch', label: 'Lunch', icon: 'partly-sunny-outline' },
	{ type: 'dinner', label: 'Dinner', icon: 'moon-outline' },
	{ type: 'snack', label: 'Snacks', icon: 'cafe-outline' },
];

const eyebrowStyle = { textTransform: 'uppercase', letterSpacing: 0.6 } as const;

const formatTime = (iso: string) => {
	const d = new Date(iso);
	if (isNaN(d.getTime())) return '';
	return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

// Same thresholds as CalorieHero's tick bar
const statusColor = (pctOfGoal: number) =>
	pctOfGoal > 100 ? '#E08585' : pctOfGoal >= 90 ? '#F2D58E' : '#7DB88A';

const sumCalories = (meals: LoggedMeal[]) =>
	Math.round(meals.reduce((total, m) => total + (Number(m.calories) || 0), 0));

export interface MacroGoals {
	protein: number;
	carbs: number;
	fats: number;
}

const sumMacro = (meals: LoggedMeal[], key: keyof MacroGoals) =>
	Math.round(meals.reduce((total, m) => total + (Number(m[key]) || 0), 0));

const MacroStat = ({ label, eaten, goal }: { label: string; eaten: number; goal?: number }) => (
	<View className="flex-1 justify-between">
		<Text className="text-[10px] font-JakartaSemiBold text-[#94897E]" style={eyebrowStyle} numberOfLines={1}>
			{label}
		</Text>
		<Text
			className="font-JakartaBold text-[15px] text-[#262135] mt-1"
			numberOfLines={1}
			adjustsFontSizeToFit
			minimumFontScale={0.8}
		>
			{eaten}
			<Text className="font-JakartaMedium text-[11px] text-[#94897E]">
				{goal ? ` / ${goal}g` : 'g'}
			</Text>
		</Text>
		{/* Track always renders so all three columns share the same height */}
		<View className="w-full h-[3px] bg-[#EEEEEE] rounded-full overflow-hidden mt-1.5">
			{!!goal && (
				<View
					className="h-full rounded-full"
					style={{
						width: `${Math.min(100, (eaten / goal) * 100)}%`,
						backgroundColor: eaten > goal ? '#cd9c99' : '#E3BBA1',
					}}
				/>
			)}
		</View>
	</View>
);

const MealRow = ({
	meal,
	isLast,
	onDelete,
}: {
	meal: LoggedMeal;
	isLast: boolean;
	onDelete: (id: string) => void;
}) => {
	const swipeRef = useRef<SwipeableMethods>(null);
	const [expanded, setExpanded] = useState(false);
	const ingredients = meal.ingredients ?? [];
	const time = formatTime(meal.created_at);

	const confirmDelete = () => {
		Alert.alert('Delete meal', `Remove "${meal.food_name}" from your log?`, [
			{ text: 'Cancel', style: 'cancel', onPress: () => swipeRef.current?.close() },
			{ text: 'Delete', style: 'destructive', onPress: () => onDelete(meal.id) },
		]);
	};

	return (
		<ReanimatedSwipeable
			ref={swipeRef}
			friction={2}
			rightThreshold={40}
			overshootRight={false}
			renderRightActions={() => (
				<TouchableOpacity
					onPress={confirmDelete}
					className="w-16 ml-2 rounded-2xl items-center justify-center"
					style={{ backgroundColor: '#E08585' }}
				>
					<Ionicons name="trash-outline" size={20} color="white" />
				</TouchableOpacity>
			)}
		>
			<TouchableOpacity
				activeOpacity={0.7}
				disabled={ingredients.length === 0}
				onPress={() => setExpanded(e => !e)}
				className={`py-3 ${isLast ? '' : 'border-b-[1px] border-[#F0EBE6]'}`}
				style={{ backgroundColor: SCREEN_BG }}
			>
				<View className="flex-row items-start">
					<View className="flex-1 pr-3">
						<Text className="font-JakartaSemiBold text-[13px] text-[#262135]" numberOfLines={1}>
							{meal.food_name}
						</Text>
						{/* Ingredient toggle sits where the portion used to be ("1 serving" said nothing) */}
						<View className="flex-row items-center mt-0.5">
							{ingredients.length > 0 && (
								<>
									<Text className="font-JakartaMedium text-[11px] text-[#cd9c99]">
										{ingredients.length} ingredient{ingredients.length === 1 ? '' : 's'}
									</Text>
									<Ionicons
										name={expanded ? 'chevron-up' : 'chevron-down'}
										size={12}
										color="#cd9c99"
										style={{ marginLeft: 2 }}
									/>
								</>
							)}
							{time ? (
								<Text className="font-JakartaMedium text-[11px] text-[#94897E]" numberOfLines={1}>
									{ingredients.length > 0 ? '  ·  ' : ''}
									{time}
								</Text>
							) : null}
						</View>
					</View>
					<View className="items-end">
						<Text className="font-JakartaBold text-[13px] text-[#262135]">
							{Math.round(meal.calories).toLocaleString()}
							<Text className="font-JakartaMedium text-[11px] text-[#94897E]"> cal</Text>
						</Text>
						<Text className="font-JakartaMedium text-[11px] text-[#94897E] mt-0.5">
							P {Math.round(meal.protein)} · C {Math.round(meal.carbs)} · F {Math.round(meal.fats)}
						</Text>
					</View>
				</View>

				{expanded && (
					<View className="mt-2 rounded-xl bg-[#F9F9F8] px-3 py-2">
						{ingredients.map(([name, amount], i) => (
							<View key={i} className="flex-row justify-between py-0.5">
								<Text className="font-JakartaMedium text-[11px] text-[#64748B] flex-1 pr-2">
									{name}
								</Text>
								<Text className="font-JakartaMedium text-[11px] text-[#94897E]">{amount}</Text>
							</View>
						))}
					</View>
				)}
			</TouchableOpacity>
		</ReanimatedSwipeable>
	);
};

const FoodLogCard = ({
	meals,
	calorieGoal,
	macroGoals,
	isToday,
	isLoading,
	error,
	onRetry,
	onDelete,
}: {
	meals: LoggedMeal[];
	calorieGoal?: number;
	macroGoals?: MacroGoals;
	isToday: boolean;
	isLoading: boolean;
	error?: string;
	onRetry: () => void;
	onDelete: (id: string) => void;
}) => {
	// The host screen owns the meal modal and opens it on a quick-log request.
	const requestLog = useQuickLogStore(s => s.requestLog);

	const byType = (type: MealType) =>
		meals
			.filter(m => (MEAL_SECTIONS.some(s => s.type === m.meal_type) ? m.meal_type : 'snack') === type)
			.sort((a, b) => a.created_at.localeCompare(b.created_at));

	const totalCalories = sumCalories(meals);
	const goal = calorieGoal ?? 0;
	const hasGoal = goal > 0;
	const remaining = Math.round(goal - totalCalories);
	const barColor = statusColor(hasGoal ? (totalCalories / goal) * 100 : 0);
	const barScale = Math.max(goal, totalCalories) || 1;
	const mealTotals = MEAL_SECTIONS.map(({ type }) => sumCalories(byType(type)));

	return (
		<View className="px-6 pt-2">
			<Text className="text-[11px] font-JakartaSemiBold text-[#94897E]" style={eyebrowStyle}>
				{isToday
					? `Today · ${new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}`
					: 'Food log'}
			</Text>
			<Text className="font-JakartaBold text-[28px] text-[#262135] mt-1">Food log</Text>

			<View className="flex-row items-end justify-between mt-6">
				<View>
					<Text className="text-[10px] font-JakartaSemiBold text-[#94897E]" style={eyebrowStyle}>
						Eaten{!isLoading && meals.length > 0 ? `  ·  ${meals.length} item${meals.length === 1 ? '' : 's'}` : ''}
					</Text>
					<View className="flex-row items-baseline mt-1">
						<Text className="font-JakartaExtraBold text-[36px] text-[#262135]">
							{isLoading ? '...' : totalCalories.toLocaleString()}
						</Text>
						<Text className="font-JakartaMedium text-xs text-[#94897E] ml-1">
							{hasGoal ? `/ ${goal.toLocaleString()} cal` : 'cal'}
						</Text>
					</View>
				</View>
				{hasGoal && !isLoading && (
					<View
						className="flex-row items-center rounded-full px-2.5 py-1"
						style={{ backgroundColor: `${barColor}26` }}
					>
						<View className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: barColor }} />
						<Text className="text-[10px] font-JakartaBold text-[#262135]">
							{remaining >= 0
								? `${remaining.toLocaleString()} left`
								: `${Math.abs(remaining).toLocaleString()} over`}
						</Text>
					</View>
				)}
			</View>

			{hasGoal && !isLoading && (
				// Progress toward the daily target, split into one segment per meal.
				// Scales to whichever is larger so an overage stays visible, with a
				// tick marking where the goal sits.
				<View className="mt-4">
					<View className="h-1.5 rounded-full bg-[#EEEEEE] overflow-hidden flex-row">
						{mealTotals
							.filter(c => c > 0)
							.map((cal, i, arr) => (
								<View
									key={i}
									style={{
										width: `${(cal / barScale) * 100}%`,
										backgroundColor: barColor,
										borderRightWidth: i < arr.length - 1 ? 2 : 0,
										borderColor: SCREEN_BG,
									}}
								/>
							))}
					</View>
					{totalCalories > goal && (
						<View
							className="absolute w-[2px] h-3 rounded-full bg-[#262135]"
							style={{ left: `${(goal / barScale) * 100}%`, top: -3, marginLeft: -1 }}
						/>
					)}
				</View>
			)}

			{/* columnGap, not NativeWind's gap-*: v2 fakes gap with a negative margin that shifts the box */}
			{!isLoading && !error && (
				<View className="flex-row items-stretch mt-6" style={{ columnGap: 20 }}>
					<MacroStat label="Protein" eaten={sumMacro(meals, 'protein')} goal={macroGoals?.protein} />
					<MacroStat label="Carbs" eaten={sumMacro(meals, 'carbs')} goal={macroGoals?.carbs} />
					<MacroStat label="Fat" eaten={sumMacro(meals, 'fats')} goal={macroGoals?.fats} />
				</View>
			)}

			{!isLoading && !error && (
				<Text className="text-[10px] font-JakartaSemiBold text-[#94897E] mt-10" style={eyebrowStyle}>
					Meals
				</Text>
			)}

			{isLoading ? (
				<View className="py-10 items-center">
					<ActivityIndicator color="#E3BBA1" />
				</View>
			) : error ? (
				<View className="py-8 items-center">
					<Text className="font-JakartaMedium text-[13px] text-[#64748B]">{error}</Text>
					<TouchableOpacity onPress={onRetry} className="mt-3 bg-[#E3BBA1] rounded-xl px-5 py-2">
						<Text className="font-JakartaSemiBold text-white text-[13px]">Retry</Text>
					</TouchableOpacity>
				</View>
			) : (
				MEAL_SECTIONS.map(({ type, label, icon }, sectionIndex) => {
					const items = byType(type);
					const isLastSection = sectionIndex === MEAL_SECTIONS.length - 1;
					return (
						<View
							key={type}
							className={`py-4 ${isLastSection ? '' : 'border-b-[1px] border-[#F0EBE6]'}`}
						>
							<View className="flex-row items-center">
								<View
									className="w-9 h-9 rounded-full items-center justify-center"
									style={{ backgroundColor: items.length ? '#E3BBA126' : '#F1F1F1' }}
								>
									<Ionicons name={icon} size={18} color={items.length ? '#cd9c99' : '#94897E'} />
								</View>
								<Text className="ml-3 flex-1 font-JakartaSemiBold text-[15px] text-[#262135]">
									{label}
								</Text>
								{items.length > 0 ? (
									<Text className="font-JakartaSemiBold text-[12px] text-[#94897E]">
										{mealTotals[sectionIndex].toLocaleString()} cal
										{hasGoal && (
											<Text className="font-JakartaMedium text-[11px] text-[#94897E]">
												{`  ${Math.round((mealTotals[sectionIndex] / goal) * 100)}%`}
											</Text>
										)}
									</Text>
								) : (
									<TouchableOpacity
										onPress={() => requestLog('meal')}
										hitSlop={8}
										className="flex-row items-center rounded-full border-[1px] border-[#E3BBA1] px-2.5 py-1"
									>
										<Ionicons name="add" size={12} color="#cd9c99" />
										<Text className="ml-0.5 font-JakartaSemiBold text-[11px] text-[#cd9c99]">Add</Text>
									</TouchableOpacity>
								)}
							</View>

							{items.length > 0 && (
								<View className="ml-12 mt-1">
									{items.map((meal, i) => (
										<MealRow
											key={meal.id}
											meal={meal}
											isLast={i === items.length - 1}
											onDelete={onDelete}
										/>
									))}
								</View>
							)}
						</View>
					);
				})
			)}
		</View>
	);
};

export default FoodLogCard;
