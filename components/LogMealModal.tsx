import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Animated } from 'react-native';
import ReactNativeModal from 'react-native-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { fetchAPI } from '@/lib/fetch';
import { useCyclingPlaceholder } from '@/lib/useCyclingPlaceholder';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
type MacroField = 'calories' | 'protein' | 'carbs' | 'fats';
type ModalView = 'list' | 'new' | 'result';

export const INGREDIENT_PLACEHOLDERS = [
	{ ingredient: 'In-N-Out Double-Double', amount: '1 burger' },
	{ ingredient: 'cooked white rice', amount: '1 cup' },
	{ ingredient: 'Chipotle chicken burrito', amount: '1 burrito' },
	{ ingredient: 'grilled chicken breast', amount: '6 oz' },
	{ ingredient: 'Chick-fil-A 8ct grilled nuggets', amount: '1 order' },
	{ ingredient: 'large egg', amount: '2 eggs' },
	{ ingredient: "McDonald's Big Mac", amount: '1 burger' },
	{ ingredient: 'avocado', amount: '1/2 avocado' },
	{ ingredient: 'Panda Express orange chicken', amount: '1 entrée' },
	{ ingredient: 'plain greek yogurt', amount: '170 g' },
	{ ingredient: 'Starbucks grande caffè latte', amount: '16 oz' },
	{ ingredient: 'banana', amount: '1 medium' },
];

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS: Record<MealType, string> = {
	breakfast: 'Breakfast',
	lunch: 'Lunch',
	dinner: 'Dinner',
	snack: 'Snack',
};

interface RecentMeal {
	id: string;
	food_name: string;
	portion_size: string;
	calories: number;
	protein: number;
	carbs: number;
	fats: number;
	fiber: number;
	sugar: number;
	sodium: number;
	confidence_score: number;
	ingredients: string[][] | null;
}

interface SavedMeal {
	id: string;
	food_name: string;
	portion_size: string;
	meal_type: MealType;
	calories: number;
	protein: number;
	carbs: number;
	fats: number;
	ingredients: string[][] | null;
}

interface NutritionResult {
	calories: number;
	protein: number;
	carbs: number;
	fats: number;
	fiber: number;
	sugar: number;
	sodium: number;
	confidence: number;
}

interface Ingredient {
	ingredient: string;
	amount: string;
}

export const defaultMealType = (): MealType => {
	const hour = new Date().getHours();
	if (hour < 11) return 'breakfast';
	if (hour < 16) return 'lunch';
	if (hour < 21) return 'dinner';
	return 'snack';
};

const roundValue = (value: unknown) => Math.round(Number(value) || 0);

const eyebrowStyle = { textTransform: 'uppercase', letterSpacing: 0.6 } as const;
// Slight shadow so white button text stays crisp on the #D4A07E button color
const BUTTON_TEXT_SHADOW = {
	textShadowColor: 'rgba(110,60,30,0.35)',
	textShadowOffset: { width: 0, height: 1 },
	textShadowRadius: 2,
};

const inputClass =
	'text-sm font-JakartaMedium text-[#262135] border-b-[1px] border-[#E3BBA1] pb-2 mb-5';

const LogMealModal = ({
	visible,
	date,
	onClose,
	onMealLogged,
}: {
	visible: boolean;
	date: string;
	onClose: () => void;
	onMealLogged?: () => void;
}) => {
	const { user } = useUser();
	const insets = useSafeAreaInsets();
	const [view, setView] = useState<ModalView>('list');
	const [mealType, setMealType] = useState<MealType>(defaultMealType());
	const [search, setSearch] = useState('');
	const [recents, setRecents] = useState<RecentMeal[]>([]);
	const [searchResults, setSearchResults] = useState<RecentMeal[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const searchRequestRef = useRef(0);
	const [ingredients, setIngredients] = useState<Ingredient[]>([{ ingredient: '', amount: '' }]);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState('');
	const [savedMeal, setSavedMeal] = useState<SavedMeal | null>(null);
	const [editing, setEditing] = useState<{ field: MacroField; value: string } | null>(null);
	const { index: placeholderIndex, opacity: placeholderOpacity } = useCyclingPlaceholder(
		INGREDIENT_PLACEHOLDERS.length
	);

	const fetchRecents = async () => {
		if (!user?.id) return;
		try {
			const response = await fetchAPI(`/api/meals?clerkId=${user.id}&recent=true`, {
				method: 'GET',
			});
			setRecents(response.success ? response.data : []);
		} catch (err) {
			console.error('Failed to load recent meals:', err);
			setRecents([]);
		}
	};

	useEffect(() => {
		if (!visible) return;
		setView('list');
		setMealType(defaultMealType());
		setSearch('');
		setIngredients([{ ingredient: '', amount: '' }]);
		setError('');
		setSavedMeal(null);
		setEditing(null);
		fetchRecents();
	}, [visible]);

	const trimmedSearch = search.trim();

	useEffect(() => {
		if (!visible || !user?.id) return;
		if (!trimmedSearch) {
			searchRequestRef.current += 1;
			setSearchResults([]);
			setIsSearching(false);
			return;
		}

		const requestId = ++searchRequestRef.current;
		setIsSearching(true);
		const timer = setTimeout(async () => {
			try {
				const response = await fetchAPI(
					`/api/meals?clerkId=${user.id}&recent=true&q=${encodeURIComponent(trimmedSearch)}`,
					{ method: 'GET' }
				);
				if (requestId !== searchRequestRef.current) return;
				setSearchResults(response.success ? response.data : []);
			} catch (err) {
				if (requestId !== searchRequestRef.current) return;
				console.error('Meal search failed:', err);
				setSearchResults([]);
			} finally {
				if (requestId === searchRequestRef.current) setIsSearching(false);
			}
		}, 300);

		return () => clearTimeout(timer);
	}, [trimmedSearch, visible, user?.id]);

	const visibleMeals = trimmedSearch ? searchResults : recents;

	const postMeal = (body: Record<string, unknown>) =>
		fetchAPI('/api/meals', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		});

	const logRecent = async (meal: RecentMeal) => {
		if (!user?.id) return;
		setError('');
		try {
			const response = await postMeal({
				clerkId: user.id,
				foodName: meal.food_name,
				portionSize: meal.portion_size || '1 serving',
				calories: Number(meal.calories),
				protein: Number(meal.protein),
				carbs: Number(meal.carbs),
				fats: Number(meal.fats),
				fiber: Number(meal.fiber),
				sugar: Number(meal.sugar),
				sodium: Number(meal.sodium),
				confidenceScore: Number(meal.confidence_score) || 0.5,
				mealType,
				date,
				ingredients: meal.ingredients || [],
			});
			if (!response.success) {
				setError(response.error || 'Failed to log meal');
				return;
			}
			onMealLogged?.();
			onClose();
		} catch (err) {
			console.error('Log recent meal error:', err);
			setError('Failed to log meal. Please try again.');
		}
	};

	const runAnalysis = async (validIngredients: Ingredient[]): Promise<NutritionResult> => {
		const response = await fetchAPI('/api/recipe-analysis', {
			method: 'POST',
			body: JSON.stringify({ ingredients: validIngredients, userId: user?.id }),
		});
		if (response.success && response.data) return response.data;
		throw new Error(response.error || 'Failed to analyze ingredients');
	};

	const saveNewMeal = async () => {
		if (!user?.id) return;

		const validIngredients = ingredients.filter(
			item => item.ingredient.trim() && item.amount.trim()
		);
		if (validIngredients.length === 0) {
			setError('Add at least one ingredient');
			return;
		}

		setIsSaving(true);
		setError('');
		try {
			const userResponse = await fetchAPI(`/api/user?clerkId=${user.id}`, { method: 'GET' });
			if (!(userResponse.success && userResponse.data)) {
				setError(
					'Please complete your profile setup first. Go to Settings > Edit Profile to continue.'
				);
				return;
			}

			const nutrition = await runAnalysis(validIngredients);
			const derivedName = validIngredients.map(item => item.ingredient.trim()).join(', ');
			const response = await postMeal({
				clerkId: user.id,
				foodName: derivedName,
				portionSize: '1 serving',
				calories: Math.max(0, Number(nutrition.calories) || 0),
				protein: Math.max(0, Number(nutrition.protein) || 0),
				carbs: Math.max(0, Number(nutrition.carbs) || 0),
				fats: Math.max(0, Number(nutrition.fats) || 0),
				fiber: Math.max(0, Number(nutrition.fiber) || 0),
				sugar: Math.max(0, Number(nutrition.sugar) || 0),
				sodium: Math.max(0, Number(nutrition.sodium) || 0),
				confidenceScore: Math.min(1, Math.max(0, Number(nutrition.confidence) || 0.5)),
				mealType,
				date,
				ingredients: validIngredients.map(item => [item.ingredient.trim(), item.amount.trim()]),
			});

			if (!response.success) {
				setError(response.error || response.details || 'Failed to save meal');
				return;
			}

			setSavedMeal(response.data);
			setView('result');
			onMealLogged?.();
		} catch (err) {
			console.error('Save meal error:', err);
			setError(err instanceof Error ? err.message : 'Failed to save meal. Please try again.');
		} finally {
			setIsSaving(false);
		}
	};

	const commitEdit = async () => {
		if (!editing || !savedMeal) return;
		const { field, value } = editing;
		setEditing(null);

		const next = Math.max(0, roundValue(value));
		if (next === roundValue(savedMeal[field])) return;

		try {
			const response = await fetchAPI(`/api/meals?id=${savedMeal.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ [field]: next }),
			});
			if (response.success && response.data) {
				setSavedMeal(response.data);
				onMealLogged?.();
			} else {
				setError(response.error || 'Failed to update meal');
			}
		} catch (err) {
			console.error('Update meal error:', err);
			setError('Failed to update meal. Please try again.');
		}
	};

	const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
		setIngredients(
			ingredients.map((item, i) => (i === index ? { ...item, [field]: value } : item))
		);
	};

	const removeIngredient = (index: number) => {
		setIngredients(ingredients.filter((_, i) => i !== index));
	};

	const renderMealTypeChips = () => (
		<>
			<Text className="mt-6 mb-2.5 text-[13px] font-JakartaSemiBold text-[#574F47]">
				Please select one
			</Text>
			<View className="flex-row flex-wrap gap-2">
				{MEAL_TYPES.map(type => {
					const selected = mealType === type;
					return (
						<TouchableOpacity
							key={type}
							onPress={() => setMealType(type)}
							className={`px-3 py-2 rounded-full ${selected ? 'bg-[#D4A07E]' : 'bg-[#F1F1F1]'}`}
						>
							<Text
								className={`text-xs ${selected ? 'text-white font-JakartaBold' : 'text-[#334155] font-JakartaSemiBold'}`}
								style={selected ? BUTTON_TEXT_SHADOW : undefined}
							>
								{MEAL_LABELS[type]}
							</Text>
						</TouchableOpacity>
					);
				})}
			</View>
			<View className="mb-12" />
		</>
	);

	const renderEditableValue = (
		meal: SavedMeal,
		field: MacroField,
		valueClass: string,
		unit: string
	) => {
		if (editing?.field === field) {
			return (
				<View className="flex-row items-baseline">
					<TextInput
						value={editing.value}
						onChangeText={value => setEditing({ field, value })}
						onBlur={commitEdit}
						onSubmitEditing={commitEdit}
						keyboardType="number-pad"
						returnKeyType="done"
						autoFocus
						className={`${valueClass} text-[#262135] border-b-[1px] border-[#E3BBA1] p-0 min-w-[60px]`}
					/>
					<Text className="font-JakartaMedium text-xs text-[#574F47] ml-1">{unit}</Text>
				</View>
			);
		}
		return (
			<TouchableOpacity
				activeOpacity={0.6}
				onPress={() => setEditing({ field, value: String(roundValue(meal[field])) })}
				className="flex-row items-baseline"
			>
				<Text className={`${valueClass} text-[#262135]`}>{roundValue(meal[field])}</Text>
				<Text className="font-JakartaMedium text-xs text-[#574F47] ml-1">{unit}</Text>
			</TouchableOpacity>
		);
	};

	const renderErrorText = () =>
		error ? <Text className="text-xs text-[#E08585] mb-3">{error}</Text> : null;

	// Meal name with each ingredient's amount in muted text, so the same meal logged
	// at different portions can be told apart: "Rice 120g, Chicken breast 250g"
	const renderMealWithAmounts = (meal: RecentMeal) => {
		const items = Array.isArray(meal.ingredients)
			? meal.ingredients.filter(item => Array.isArray(item) && item[0])
			: [];
		if (items.length === 0) {
			const portion =
				meal.portion_size && meal.portion_size !== '1 serving' ? meal.portion_size : '';
			return (
				<Text className="text-sm font-JakartaBold text-[#262135]" numberOfLines={2}>
					{meal.food_name}
					{portion ? <Text className="font-JakartaMedium text-[#574F47]"> {portion}</Text> : null}
				</Text>
			);
		}
		return (
			<Text className="text-sm font-JakartaBold text-[#262135]" numberOfLines={2}>
				{items.map(([name, amount], index) => (
					<Text key={index}>
						{index > 0 ? ', ' : ''}
						{name}
						{amount ? <Text className="font-JakartaMedium text-[#574F47]"> {amount}</Text> : null}
					</Text>
				))}
			</Text>
		);
	};

	const renderList = () => (
		<View>
			<View className="flex-row justify-between items-center mb-5">
				<Text className="text-xl font-JakartaExtraBold text-[#262135]">Log a meal</Text>
				<TouchableOpacity onPress={onClose}>
					<Ionicons name="close" size={24} color="#334155" />
				</TouchableOpacity>
			</View>

			{renderMealTypeChips()}

			{/* Same underline style as the other inputs, with a magnifier in front */}
			<View className="flex-row items-center border-b-[1px] border-[#E3BBA1] pb-2 mb-5">
				<Ionicons name="search" size={16} color="#574F47" />
				<TextInput
					value={search}
					onChangeText={setSearch}
					placeholder="Search your past meals"
					placeholderTextColor="#574F47"
					className="flex-1 ml-2 text-sm font-JakartaMedium text-[#262135]"
					returnKeyType="search"
				/>
			</View>

			<Text className="text-[10px] font-JakartaSemiBold text-[#574F47] mb-1" style={eyebrowStyle}>
				{trimmedSearch ? 'Results' : 'Recent'}
			</Text>

			{visibleMeals.length === 0 ? (
				<Text className="text-sm text-[#574F47] py-3">
					{trimmedSearch
						? isSearching
							? 'Searching…'
							: 'No matches. Try a new meal below.'
						: 'No meals yet. Log your first one below.'}
				</Text>
			) : (
				visibleMeals.map((meal, index) => (
					<TouchableOpacity
						key={meal.id}
						onPress={() => logRecent(meal)}
						activeOpacity={0.7}
						className={`flex-row items-center justify-between py-3 ${
							index < visibleMeals.length - 1 ? 'border-b-[1px] border-[#F0EBE6]' : ''
						}`}
					>
						<View className="flex-1 pr-3">
							{renderMealWithAmounts(meal)}
							<Text className="text-[11px] font-JakartaSemiBold text-[#574F47] mt-0.5">
								{`${roundValue(meal.calories)} cal · P ${roundValue(meal.protein)} · C ${roundValue(meal.carbs)} · F ${roundValue(meal.fats)}`}
							</Text>
						</View>
						<View className="w-7 h-7 rounded-full bg-[#F9F9F8] border-[1px] border-[#F0EBE6] items-center justify-center">
							<Ionicons name="add" size={16} color="#262135" />
						</View>
					</TouchableOpacity>
				))
			)}

			<View className="mt-3">{renderErrorText()}</View>
		</View>
	);

	const renderNew = () => (
		<View>
			<View className="flex-row justify-between items-center mb-5">
				<TouchableOpacity
					onPress={() => {
						setError('');
						setView('list');
					}}
				>
					<Ionicons name="chevron-back" size={24} color="#262135" />
				</TouchableOpacity>
				<Text className="text-xl font-JakartaExtraBold text-[#262135]">New meal</Text>
				<TouchableOpacity onPress={onClose}>
					<Ionicons name="close" size={24} color="#334155" />
				</TouchableOpacity>
			</View>

			{renderMealTypeChips()}

			<Text className="text-xs font-JakartaSemiBold text-black mb-1">Ingredients</Text>
			<View className="mb-4">
				{ingredients.map((item, index) => (
					<View key={index} className="flex-row items-center gap-2 mb-3">
						<View className="flex-1 justify-center">
							<TextInput
								value={item.ingredient}
								onChangeText={value => updateIngredient(index, 'ingredient', value)}
								placeholderTextColor="#574F47"
								className="text-sm text-[#262135] border-b-[1px] border-[#F0EBE6] pb-1"
							/>
							{!item.ingredient && (
								<Animated.Text
									pointerEvents="none"
									style={{ opacity: placeholderOpacity }}
									className="absolute left-0 pb-1 text-sm text-[#574F47]"
									numberOfLines={1}
								>
									{INGREDIENT_PLACEHOLDERS[placeholderIndex].ingredient}
								</Animated.Text>
							)}
						</View>
						<View className="w-24 justify-center">
							<TextInput
								value={item.amount}
								onChangeText={value => updateIngredient(index, 'amount', value)}
								placeholderTextColor="#574F47"
								className="text-sm text-[#262135] border-b-[1px] border-[#F0EBE6] pb-1"
							/>
							{!item.amount && (
								<Animated.Text
									pointerEvents="none"
									style={{ opacity: placeholderOpacity }}
									className="absolute left-0 pb-1 text-sm text-[#574F47]"
									numberOfLines={1}
								>
									{INGREDIENT_PLACEHOLDERS[placeholderIndex].amount}
								</Animated.Text>
							)}
						</View>
						{ingredients.length > 1 && (
							<TouchableOpacity onPress={() => removeIngredient(index)}>
								<Ionicons name="close-circle-outline" size={18} color="#94A3B8" />
							</TouchableOpacity>
						)}
					</View>
				))}
				<TouchableOpacity
					onPress={() => setIngredients([...ingredients, { ingredient: '', amount: '' }])}
				>
					<Text className="text-xs font-JakartaSemiBold text-[#334155]">+ Add another</Text>
				</TouchableOpacity>
			</View>

			{renderErrorText()}
		</View>
	);

	const renderResult = (meal: SavedMeal) => (
		<View>
			<View className="flex-row justify-between items-center mb-5">
				<Text className="text-xl font-JakartaExtraBold text-[#262135]">Saved</Text>
				<TouchableOpacity onPress={onClose}>
					<Ionicons name="close" size={24} color="#334155" />
				</TouchableOpacity>
			</View>

			<Text className="text-[10px] font-JakartaSemiBold text-[#574F47]" style={eyebrowStyle}>
				{MEAL_LABELS[meal.meal_type] ?? 'Snack'}
			</Text>

			{meal.ingredients && meal.ingredients.length > 0 && (
				<View className="mt-2">
					{meal.ingredients.map((item, index) => (
						<View key={index} className="flex-row items-center justify-between mt-2">
							<Text className="font-JakartaMedium text-xs text-[#334155]">{item[0]}</Text>
							<Text className="text-[11px] font-JakartaSemiBold text-[#574F47]">
								{'•'} {item[1]}
							</Text>
						</View>
					))}
				</View>
			)}

			<View className="mt-6">
				<Text className="text-[10px] font-JakartaSemiBold text-[#574F47]" style={eyebrowStyle}>
					Calories
				</Text>
				{renderEditableValue(meal, 'calories', 'font-JakartaExtraBold text-[30px]', 'cal')}
			</View>

			<View className="flex-row justify-between mt-6">
				<View>
					<Text className="text-[10px] font-JakartaSemiBold text-[#574F47]" style={eyebrowStyle}>
						Protein
					</Text>
					{renderEditableValue(meal, 'protein', 'font-JakartaExtraBold text-[18px]', 'g')}
				</View>
				<View>
					<Text className="text-[10px] font-JakartaSemiBold text-[#574F47]" style={eyebrowStyle}>
						Carbs
					</Text>
					{renderEditableValue(meal, 'carbs', 'font-JakartaExtraBold text-[18px]', 'g')}
				</View>
				<View>
					<Text className="text-[10px] font-JakartaSemiBold text-[#574F47]" style={eyebrowStyle}>
						Fat
					</Text>
					{renderEditableValue(meal, 'fats', 'font-JakartaExtraBold text-[18px]', 'g')}
				</View>
			</View>

			<Text className="text-[11px] font-JakartaMedium text-[#574F47] mt-6">
				Tap a number to edit it.
			</Text>

			<View className="mt-3">{renderErrorText()}</View>
		</View>
	);

	return (
		<ReactNativeModal
			isVisible={visible}
			onBackdropPress={onClose}
			onBackButtonPress={onClose}
			avoidKeyboard
			className="m-0 w-full h-full"
		>
			<View className="bg-white w-full" style={{ flex: 1, paddingTop: insets.top }}>
				<ScrollView
					className="px-6 pt-6"
					contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
					style={{ flex: 1 }}
				>
					{view === 'list' && renderList()}
					{view === 'new' && renderNew()}
					{view === 'result' && savedMeal && renderResult(savedMeal)}
				</ScrollView>

				{/* Sticky footer: the main action stays on screen above the keyboard */}
				{(view === 'list' || view === 'new' || (view === 'result' && savedMeal)) && (
					<View
						className="px-6 pt-3 border-t-[1px] border-[#F0EBE6]"
						style={{ paddingBottom: 24 + insets.bottom }}
					>
						{view === 'new' ? (
							<TouchableOpacity
								onPress={saveNewMeal}
								disabled={isSaving}
								className={`rounded-xl py-3 ${isSaving ? 'bg-[#F1F1F1]' : 'bg-[#D4A07E]'}`}
							>
								<Text
									className={`text-center font-JakartaBold text-[17px] ${isSaving ? 'text-[#334155]' : 'text-white'}`}
									style={isSaving ? undefined : BUTTON_TEXT_SHADOW}
								>
									{isSaving ? 'Analyzing and saving…' : 'Save meal'}
								</Text>
							</TouchableOpacity>
						) : view === 'list' ? (
							<TouchableOpacity
								onPress={() => {
									setError('');
									setView('new');
								}}
								className="bg-[#D4A07E] rounded-xl py-3"
							>
								<Text
									className="text-white text-center font-JakartaBold text-[17px]"
									style={BUTTON_TEXT_SHADOW}
								>
									New meal
								</Text>
							</TouchableOpacity>
						) : (
							<TouchableOpacity onPress={onClose} className="bg-[#E3BBA1] rounded-xl py-3">
								<Text className="text-white text-center font-JakartaSemiBold">Done</Text>
							</TouchableOpacity>
						)}
					</View>
				)}
			</View>
		</ReactNativeModal>
	);
};

export default LogMealModal;
