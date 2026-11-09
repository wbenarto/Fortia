import { useEffect, useRef, useState } from 'react';
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	ScrollView,
	Animated,
	ActivityIndicator,
	Linking,
	StyleSheet,
} from 'react-native';
import ReactNativeModal from 'react-native-modal';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { fetchAPI } from '@/lib/fetch';
import { useCyclingPlaceholder } from '@/lib/useCyclingPlaceholder';
import { getLocalDate, getTodayDate } from '@/lib/dateUtils';
import { MACRO_COLORS } from '@/lib/theme';
import MealImpact, { type Macros } from '@/components/MealImpact';
import { addDays, diffDays } from '@/lib/progress';
import CameraSheet, { type CameraMode } from '@/components/camera/CameraSheet';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
type MacroField = 'calories' | 'protein' | 'carbs' | 'fats';
type ModalView = 'list' | 'new' | 'barcode' | 'result';

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

// Same identity the API uses for favorites and the Recent list's dedupe
const favoriteKey = (meal: Pick<RecentMeal, 'food_name' | 'portion_size' | 'ingredients'>) =>
	`${meal.food_name.trim().toLowerCase()}|${(meal.portion_size || '').trim().toLowerCase()}|${JSON.stringify(
		Array.isArray(meal.ingredients) ? meal.ingredients : []
	)}`;

type ListTab = 'recent' | 'favorites';

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

// GET /api/food-barcode (fortia-api src/lib/foodBarcode.ts): values per 100 g
interface BarcodeProduct {
	code: string;
	source: 'openfoodfacts' | 'usda';
	name: string;
	brand: string | null;
	servingLabel: string | null;
	servingG: number | null;
	per100g: {
		calories: number;
		protein: number;
		carbs: number;
		fats: number;
		fiber: number;
		sugar: number;
		sodiumMg: number;
	};
}

// POST /api/meal-photo-analysis: one AI call returns foods, portions and macros
interface PhotoEstimate {
	mealName: string;
	items: Ingredient[]; // as returned, to tell whether the user edited the rows
	totals: {
		calories: number;
		protein: number;
		carbs: number;
		fats: number;
		fiber: number;
		sugar: number;
		sodium: number;
	};
	confidence: number;
	mode: 'photo' | 'label';
}

const SOURCE_CREDIT: Record<BarcodeProduct['source'], string> = {
	openfoodfacts: 'Data from Open Food Facts (ODbL)',
	usda: 'Data from USDA FoodData Central',
};

const sameIngredients = (a: Ingredient[], b: Ingredient[]) =>
	a.length === b.length &&
	a.every(
		(item, i) =>
			item.ingredient.trim() === b[i].ingredient.trim() && item.amount.trim() === b[i].amount.trim()
	);

const formatServings = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export const defaultMealType = (): MealType => {
	const hour = new Date().getHours();
	if (hour < 11) return 'breakfast';
	if (hour < 16) return 'lunch';
	if (hour < 21) return 'dinner';
	return 'snack';
};

// Noon so the picker never shifts the day across time zones
const toPickerDate = (iso: string) => new Date(`${iso}T12:00:00`);

const formatLogDate = (iso: string) => {
	const ago = diffDays(iso, getTodayDate());
	if (ago === 0) return 'Today';
	if (ago === 1) return 'Yesterday';
	return toPickerDate(iso).toLocaleDateString('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
	});
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
	// Day the meal is logged to — starts at the screen's date, can be moved back for a missed day
	const [logDate, setLogDate] = useState(date);
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [search, setSearch] = useState('');
	const [recents, setRecents] = useState<RecentMeal[]>([]);
	const [listTab, setListTab] = useState<ListTab>('recent');
	const [favorites, setFavorites] = useState<RecentMeal[]>([]);
	const [searchResults, setSearchResults] = useState<RecentMeal[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const searchRequestRef = useRef(0);
	const [ingredients, setIngredients] = useState<Ingredient[]>([{ ingredient: '', amount: '' }]);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState('');
	const [savedMeal, setSavedMeal] = useState<SavedMeal | null>(null);
	// Day totals without this meal + targets, for the "how it moves your day" bars
	const [impact, setImpact] = useState<{ before: Macros; targets: Macros } | null>(null);
	const [editing, setEditing] = useState<{ field: MacroField; value: string } | null>(null);
	// Camera: which mode is open (null = closed)
	const [camera, setCamera] = useState<CameraMode | null>(null);
	// Barcode: the scanned code, what it found, how many servings
	const [scannedCode, setScannedCode] = useState<string | null>(null);
	const [product, setProduct] = useState<BarcodeProduct | null>(null);
	const [isLookingUp, setIsLookingUp] = useState(false);
	const [servings, setServings] = useState(1);
	// Photo: the AI estimate the ingredient rows were filled from
	const [photoEstimate, setPhotoEstimate] = useState<PhotoEstimate | null>(null);
	const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
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

	const fetchFavorites = async () => {
		if (!user?.id) return;
		try {
			const response = await fetchAPI(`/api/favorite-meals?clerkId=${user.id}`, { method: 'GET' });
			setFavorites(response.success ? response.data : []);
		} catch (err) {
			console.error('Failed to load favorite meals:', err);
		}
	};

	const favoriteKeys = new Set(favorites.map(favoriteKey));

	// Heart: save to / remove from favorites (optimistic; reverts if the request fails)
	const toggleFavorite = async (meal: RecentMeal) => {
		if (!user?.id) return;
		const key = favoriteKey(meal);
		const wasFavorite = favoriteKeys.has(key);
		const previous = favorites;
		setFavorites(
			wasFavorite ? favorites.filter(f => favoriteKey(f) !== key) : [meal, ...favorites]
		);
		try {
			const response = wasFavorite
				? await fetchAPI(`/api/favorite-meals?clerkId=${user.id}&key=${encodeURIComponent(key)}`, {
						method: 'DELETE',
					})
				: await fetchAPI('/api/favorite-meals', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ clerkId: user.id, ...meal }),
					});
			if (!response.success) setFavorites(previous);
		} catch {
			setFavorites(previous);
		}
	};

	useEffect(() => {
		if (!visible) return;
		setView('list');
		setListTab('recent');
		setMealType(defaultMealType());
		setLogDate(date > getTodayDate() ? getTodayDate() : date);
		setShowDatePicker(false);
		setSearch('');
		setIngredients([{ ingredient: '', amount: '' }]);
		setError('');
		setSavedMeal(null);
		setImpact(null);
		setEditing(null);
		setCamera(null);
		setScannedCode(null);
		setProduct(null);
		setIsLookingUp(false);
		setServings(1);
		setPhotoEstimate(null);
		setIsAnalyzingPhoto(false);
		fetchRecents();
		fetchFavorites();
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

	const visibleMeals = trimmedSearch
		? searchResults
		: listTab === 'favorites'
			? favorites
			: recents;

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
				date: logDate,
				ingredients: meal.ingredients || [],
			});
			if (!response.success) {
				setError(response.error || 'Failed to log meal');
				return;
			}
			// Same saved step as a new meal: macros (editable) + how it moves the day
			setSavedMeal(response.data);
			setView('result');
			onMealLogged?.();
			loadImpact(response.data);
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

	const loadImpact = async (meal: SavedMeal) => {
		if (!user?.id) return;
		try {
			const [summary, goals] = await Promise.all([
				fetchAPI(`/api/meals?clerkId=${user.id}&date=${logDate}&summary=true`, { method: 'GET' }),
				fetchAPI(`/api/user?clerkId=${user.id}`, { method: 'GET' }),
			]);
			const day = summary.success ? summary.data : null;
			// The summary already includes this meal — take it out to get "before"
			const before = (total: unknown, own: unknown) =>
				Math.max(0, (Number(total) || 0) - (Number(own) || 0));
			const g = goals.success ? goals.data : null;
			setImpact({
				before: {
					calories: before(day?.total_calories, meal.calories),
					protein: before(day?.total_protein, meal.protein),
					carbs: before(day?.total_carbs, meal.carbs),
					fats: before(day?.total_fats, meal.fats),
				},
				// Same fallback as the Home nutrition card when no goals are set
				targets: {
					calories: Math.round(Number(g?.daily_calories) || 2000),
					protein: Math.round(Number(g?.daily_protein) || 125),
					carbs: Math.round(Number(g?.daily_carbs) || 225),
					fats: Math.round(Number(g?.daily_fats) || 67),
				},
			});
		} catch (err) {
			console.error('Load meal impact error:', err);
		}
	};

	// ── Barcode ──────────────────────────────────────────────────────────

	const handleBarcode = async (code: string) => {
		if (!user?.id) return;
		setCamera(null);
		setError('');
		setScannedCode(code);
		setProduct(null);
		setServings(1);
		setView('barcode');
		setIsLookingUp(true);
		try {
			const response = await fetchAPI(
				`/api/food-barcode?clerkId=${user.id}&code=${encodeURIComponent(code)}`,
				{ method: 'GET' }
			);
			setProduct(response.success ? response.data : null);
			if (!response.success) setError(response.error || 'Lookup failed');
		} catch (err) {
			console.error('Barcode lookup error:', err);
			setError("Couldn't look that up. Check your connection and try again.");
		} finally {
			setIsLookingUp(false);
		}
	};

	// One "unit" is the label's serving, or 100 g when the label has none
	const productUnitG = (p: BarcodeProduct) => p.servingG ?? 100;
	const productMacros = (p: BarcodeProduct, count: number) => {
		const factor = (productUnitG(p) / 100) * count;
		const v = (n: number) => Math.round(n * factor * 10) / 10;
		return {
			calories: Math.round(p.per100g.calories * factor),
			protein: v(p.per100g.protein),
			carbs: v(p.per100g.carbs),
			fats: v(p.per100g.fats),
			fiber: v(p.per100g.fiber),
			sugar: v(p.per100g.sugar),
			sodium: Math.round(p.per100g.sodiumMg * factor),
		};
	};
	const productPortion = (p: BarcodeProduct, count: number) =>
		p.servingG
			? `${formatServings(count)} serving${count === 1 ? '' : 's'} (${Math.round(p.servingG * count)} g)`
			: `${Math.round(100 * count)} g`;

	const logProduct = async () => {
		if (!user?.id || !product) return;
		setIsSaving(true);
		setError('');
		try {
			const macros = productMacros(product, servings);
			const portion = productPortion(product, servings);
			const name =
				product.brand && !product.name.toLowerCase().includes(product.brand.toLowerCase())
					? `${product.brand} ${product.name}`
					: product.name;
			const response = await postMeal({
				clerkId: user.id,
				foodName: name,
				portionSize: portion,
				...macros,
				confidenceScore: 0.95,
				mealType,
				date: logDate,
				ingredients: [[name, portion]],
			});
			if (!response.success) {
				setError(response.error || 'Failed to log');
				return;
			}
			setSavedMeal(response.data);
			setView('result');
			onMealLogged?.();
			loadImpact(response.data);
		} catch (err) {
			console.error('Log scanned product error:', err);
			setError('Failed to log. Please try again.');
		} finally {
			setIsSaving(false);
		}
	};

	// ── Photo / label ────────────────────────────────────────────────────

	const handlePhoto = async (base64: string, mode: 'photo' | 'label') => {
		if (!user?.id || !base64) return;
		setCamera(null);
		setError('');
		setPhotoEstimate(null);
		setView('new');
		setIsAnalyzingPhoto(true);
		try {
			const response = await fetchAPI('/api/meal-photo-analysis', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					clerkId: user.id,
					image: base64,
					mimeType: 'image/jpeg',
					mode: mode === 'label' ? 'label' : 'meal',
				}),
			});
			if (!response.success) {
				setError(response.error || "Couldn't read that photo.");
				return;
			}
			const data = response.data;
			if (data.notFood) {
				setError(
					mode === 'label'
						? "Couldn't read a nutrition label. Try again closer, or type it in."
						: "Couldn't spot any food in that photo. Retake it, or type the meal in."
				);
				return;
			}
			const items: Ingredient[] = (data.items || []).map(
				(it: { ingredient: string; amount: string }) => ({
					ingredient: it.ingredient,
					amount: it.amount,
				})
			);
			setIngredients(items.length ? items : [{ ingredient: '', amount: '' }]);
			setPhotoEstimate({
				mealName: data.mealName,
				items,
				totals: data.totals,
				confidence: Number(data.confidence) || 0,
				mode,
			});
		} catch (err) {
			console.error('Meal photo analysis error:', err);
			setError("Couldn't read that photo. Try again, or type the meal in.");
		} finally {
			setIsAnalyzingPhoto(false);
		}
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

			// Photo rows left as they came back: use the photo's numbers (no second AI call).
			// Edited rows: recalculate from the ingredients.
			const fromPhoto =
				photoEstimate && sameIngredients(validIngredients, photoEstimate.items)
					? photoEstimate
					: null;
			const nutrition: NutritionResult = fromPhoto
				? { ...fromPhoto.totals, confidence: fromPhoto.confidence }
				: await runAnalysis(validIngredients);
			const derivedName =
				fromPhoto?.mealName || validIngredients.map(item => item.ingredient.trim()).join(', ');
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
				date: logDate,
				ingredients: validIngredients.map(item => [item.ingredient.trim(), item.amount.trim()]),
			});

			if (!response.success) {
				setError(response.error || response.details || 'Failed to save meal');
				return;
			}

			setSavedMeal(response.data);
			setView('result');
			onMealLogged?.();
			loadImpact(response.data);
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

	const renderFieldLabel = (label: string) => (
		<Text className="mb-2 text-[11px] font-JakartaSemiBold text-[#574F47]" style={eyebrowStyle}>
			{label}
		</Text>
	);

	// Day stepper: full-width pill, arrows at the ends, tap the date for a calendar
	const renderDatePicker = () => {
		const today = getTodayDate();
		const atToday = logDate >= today;
		return (
			<>
				{renderFieldLabel('Day')}
				<View className="flex-row items-center bg-[#F1F1F1] rounded-full p-1">
					<TouchableOpacity
						onPress={() => setLogDate(addDays(logDate, -1))}
						className="w-9 h-9 rounded-full items-center justify-center"
						accessibilityLabel="Previous day"
					>
						<Ionicons name="chevron-back" size={18} color="#262135" />
					</TouchableOpacity>
					<TouchableOpacity
						onPress={() => setShowDatePicker(open => !open)}
						className="flex-1 flex-row items-center justify-center h-9"
						accessibilityLabel="Change the day this meal is logged to"
					>
						<Ionicons name="calendar-outline" size={15} color="#262135" />
						<Text className="ml-1.5 text-[13px] font-JakartaSemiBold text-[#262135]">
							{formatLogDate(logDate)}
						</Text>
					</TouchableOpacity>
					<TouchableOpacity
						onPress={() => setLogDate(addDays(logDate, 1))}
						disabled={atToday}
						className="w-9 h-9 rounded-full items-center justify-center"
						style={{ opacity: atToday ? 0.3 : 1 }}
						accessibilityLabel="Next day"
					>
						<Ionicons name="chevron-forward" size={18} color="#262135" />
					</TouchableOpacity>
				</View>
				{showDatePicker && (
					<DateTimePicker
						value={toPickerDate(logDate)}
						mode="date"
						display="inline"
						maximumDate={toPickerDate(today)}
						accentColor="#D4A07E"
						onChange={(_, picked) => {
							if (picked) setLogDate(getLocalDate(picked));
							setShowDatePicker(false);
						}}
					/>
				)}
			</>
		);
	};

	// Day + meal type, as two labelled full-width pills with even spacing
	const renderMealTypeChips = () => (
		<View className="mb-8">
			{renderDatePicker()}
			<View className="h-5" />
			{renderFieldLabel('Meal')}
			<View className="flex-row bg-[#F1F1F1] rounded-full p-1">
				{MEAL_TYPES.map(type => {
					const selected = mealType === type;
					return (
						<TouchableOpacity
							key={type}
							onPress={() => setMealType(type)}
							className={`flex-1 h-9 rounded-full items-center justify-center ${selected ? 'bg-[#D4A07E]' : ''}`}
							accessibilityState={{ selected }}
						>
							<Text
								className={`text-[13px] ${selected ? 'text-white font-JakartaBold' : 'text-[#475569] font-JakartaSemiBold'}`}
								style={selected ? BUTTON_TEXT_SHADOW : undefined}
								numberOfLines={1}
							>
								{MEAL_LABELS[type]}
							</Text>
						</TouchableOpacity>
					);
				})}
			</View>
		</View>
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
			<View className="flex-row justify-between items-center mb-6">
				<Text className="text-xl font-JakartaExtraBold text-[#262135]">Log a meal</Text>
				<TouchableOpacity onPress={onClose}>
					<Ionicons name="close" size={24} color="#334155" />
				</TouchableOpacity>
			</View>

			{renderMealTypeChips()}

			{/* Camera shortcuts: barcode (free database) and meal photo (AI) */}
			<View className="flex-row mb-6" style={{ columnGap: 10 }}>
				{(
					[
						['barcode', 'barcode-outline', 'Scan barcode', 'Packaged food'],
						['photo', 'camera-outline', 'Snap a photo', 'We list what we see'],
					] as const
				).map(([mode, icon, title, subtitle]) => (
					<TouchableOpacity
						key={mode}
						onPress={() => {
							setError('');
							setCamera(mode);
						}}
						activeOpacity={0.75}
						className="flex-1 flex-row items-center bg-[#F9F9F8] rounded-2xl border-[1px] border-[#F0EBE6] px-3 py-3"
						accessibilityRole="button"
					>
						<View className="w-9 h-9 rounded-full bg-white border-[1px] border-[#F0EBE6] items-center justify-center">
							<Ionicons name={icon} size={18} color="#262135" />
						</View>
						<View className="flex-1 ml-2.5">
							<Text className="font-JakartaBold text-[13px] text-[#262135]" numberOfLines={1}>
								{title}
							</Text>
							<Text className="font-JakartaMedium text-[11px] text-[#574F47]" numberOfLines={1}>
								{subtitle}
							</Text>
						</View>
					</TouchableOpacity>
				))}
			</View>

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

			{trimmedSearch ? (
				<Text className="text-[10px] font-JakartaSemiBold text-[#574F47] mb-1" style={eyebrowStyle}>
					Results
				</Text>
			) : (
				<View className="flex-row self-start bg-[#F1F1F1] rounded-full p-1 mb-2">
					{(
						[
							['recent', 'Recent'],
							['favorites', 'Favorites'],
						] as const
					).map(([key, label]) => {
						const active = listTab === key;
						return (
							<TouchableOpacity
								key={key}
								onPress={() => setListTab(key)}
								className="flex-row items-center px-3.5 py-1.5 rounded-full"
								style={{ backgroundColor: active ? '#D4A07E' : 'transparent' }}
								accessibilityState={{ selected: active }}
							>
								{key === 'favorites' && (
									<Ionicons
										name="heart"
										size={12}
										color={active ? '#FFFFFF' : '#E5484D'}
										style={{ marginRight: 4 }}
									/>
								)}
								<Text
									className={`text-[12px] ${active ? 'font-JakartaBold text-white' : 'font-JakartaSemiBold text-[#334155]'}`}
									style={active ? BUTTON_TEXT_SHADOW : undefined}
								>
									{label}
									{key === 'favorites' && favorites.length ? ` ${favorites.length}` : ''}
								</Text>
							</TouchableOpacity>
						);
					})}
				</View>
			)}

			{visibleMeals.length === 0 ? (
				<Text className="text-sm text-[#574F47] py-3">
					{trimmedSearch
						? isSearching
							? 'Searching…'
							: 'No matches. Try a new meal below.'
						: listTab === 'favorites'
							? 'No favorites yet. Tap the heart on a meal to save it here.'
							: 'No meals yet. Log your first one below.'}
				</Text>
			) : (
				visibleMeals.map((meal, index) => (
					<TouchableOpacity
						key={trimmedSearch ? `s-${meal.id}` : `${listTab}-${favoriteKey(meal)}`}
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
						{(() => {
							const isFavorite = favoriteKeys.has(favoriteKey(meal));
							return (
								<TouchableOpacity
									onPress={() => toggleFavorite(meal)}
									hitSlop={10}
									className="mr-3"
									accessibilityRole="button"
									accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
								>
									<Ionicons
										name={isFavorite ? 'heart' : 'heart-outline'}
										size={22}
										color={isFavorite ? '#E5484D' : '#857869'}
									/>
								</TouchableOpacity>
							);
						})()}
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
			<View className="flex-row justify-between items-center mb-6">
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

			{isAnalyzingPhoto && (
				<View className="flex-row items-center bg-[#F9F9F8] rounded-2xl border-[1px] border-[#F0EBE6] px-4 py-4 mb-5">
					<ActivityIndicator color="#D4A07E" />
					<Text className="ml-3 font-JakartaSemiBold text-[14px] text-[#262135]">
						Looking at your meal…
					</Text>
				</View>
			)}

			{photoEstimate && !isAnalyzingPhoto && (
				<View className="bg-[#F9F9F8] rounded-2xl border-[1px] border-[#F0EBE6] px-4 py-3.5 mb-5">
					<View className="flex-row items-center">
						<Ionicons
							name={photoEstimate.mode === 'label' ? 'reader-outline' : 'camera-outline'}
							size={15}
							color="#574F47"
						/>
						<Text
							className="ml-1.5 text-[11px] font-JakartaSemiBold text-[#574F47]"
							style={eyebrowStyle}
						>
							{photoEstimate.mode === 'label' ? 'From the label' : 'Photo estimate'}
						</Text>
					</View>
					<Text className="font-JakartaBold text-[15px] text-[#262135] mt-1" numberOfLines={1}>
						{photoEstimate.mealName}
					</Text>
					<Text className="text-[12px] font-JakartaSemiBold text-[#574F47] mt-0.5">
						{`${roundValue(photoEstimate.totals.calories)} cal · P ${roundValue(photoEstimate.totals.protein)} · C ${roundValue(photoEstimate.totals.carbs)} · F ${roundValue(photoEstimate.totals.fats)}`}
					</Text>
					<Text className="text-[12px] font-JakartaMedium text-[#574F47] mt-2 leading-[17px]">
						{photoEstimate.confidence < 0.5
							? 'The photo was hard to read, so check the portions below. '
							: 'Check the portions below. '}
						Edit any row and we'll recalculate when you save.
					</Text>
				</View>
			)}

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

	const renderBarcode = () => {
		const macros = product ? productMacros(product, servings) : null;
		return (
			<View>
				<View className="flex-row justify-between items-center mb-6">
					<TouchableOpacity
						onPress={() => {
							setError('');
							setView('list');
						}}
						accessibilityLabel="Back"
					>
						<Ionicons name="chevron-back" size={24} color="#262135" />
					</TouchableOpacity>
					<Text className="text-xl font-JakartaExtraBold text-[#262135]">Scanned food</Text>
					<TouchableOpacity onPress={onClose} accessibilityLabel="Close">
						<Ionicons name="close" size={24} color="#334155" />
					</TouchableOpacity>
				</View>

				{isLookingUp ? (
					<View className="items-center py-16">
						<ActivityIndicator color="#D4A07E" />
						<Text className="mt-3 font-JakartaMedium text-[13px] text-[#574F47]">
							Looking up {scannedCode}…
						</Text>
					</View>
				) : product && macros ? (
					<>
						{renderMealTypeChips()}

						<View className="bg-white rounded-3xl border-[1px] border-[#F0EBE6] p-4">
							{product.brand ? (
								<Text
									className="text-[11px] font-JakartaSemiBold text-[#574F47]"
									style={eyebrowStyle}
									numberOfLines={1}
								>
									{product.brand}
								</Text>
							) : null}
							<Text
								className="font-JakartaExtraBold text-[18px] text-[#262135] mt-0.5"
								numberOfLines={2}
							>
								{product.name}
							</Text>
							<Text className="font-JakartaMedium text-[12px] text-[#574F47] mt-1">
								{product.servingG
									? `1 serving = ${product.servingLabel || `${product.servingG} g`}`
									: 'No serving size on file, so amounts are per 100 g'}
							</Text>

							{/* Servings stepper */}
							<View className="flex-row items-center justify-between mt-4 bg-[#F1F1F1] rounded-full p-1">
								<TouchableOpacity
									onPress={() => setServings(n => Math.max(0.5, n - 0.5))}
									disabled={servings <= 0.5}
									className="w-10 h-10 rounded-full bg-white items-center justify-center"
									style={{ opacity: servings <= 0.5 ? 0.4 : 1 }}
									accessibilityLabel="Less"
								>
									<Ionicons name="remove" size={20} color="#262135" />
								</TouchableOpacity>
								<Text className="font-JakartaBold text-[15px] text-[#262135]">
									{productPortion(product, servings)}
								</Text>
								<TouchableOpacity
									onPress={() => setServings(n => Math.min(20, n + 0.5))}
									className="w-10 h-10 rounded-full bg-white items-center justify-center"
									accessibilityLabel="More"
								>
									<Ionicons name="add" size={20} color="#262135" />
								</TouchableOpacity>
							</View>

							<View className="flex-row items-baseline mt-5">
								<Text className="font-JakartaExtraBold text-[36px] text-[#262135]">
									{macros.calories}
								</Text>
								<Text className="font-JakartaMedium text-xs text-[#574F47] ml-1">cal</Text>
							</View>
							<View className="flex-row mt-3" style={{ columnGap: 8 }}>
								{(
									[
										['protein', 'Protein', MACRO_COLORS.protein],
										['carbs', 'Carbs', MACRO_COLORS.carbs],
										['fats', 'Fat', MACRO_COLORS.fats],
									] as const
								).map(([key, label, color]) => (
									<View
										key={key}
										className="flex-1 rounded-2xl px-3 py-3"
										style={{ backgroundColor: `${color}1A` }}
									>
										<View className="flex-row items-center mb-1">
											<View className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
											<Text
												className="ml-1.5 text-[11px] font-JakartaSemiBold text-[#574F47]"
												style={eyebrowStyle}
											>
												{label}
											</Text>
										</View>
										<Text className="font-JakartaExtraBold text-[20px] text-[#262135]">
											{roundValue(macros[key])}
											<Text className="font-JakartaMedium text-xs text-[#574F47]"> g</Text>
										</Text>
									</View>
								))}
							</View>
						</View>

						{/* Attribution (Open Food Facts is ODbL: credit it wherever its data shows) */}
						<TouchableOpacity
							onPress={() =>
								Linking.openURL(
									product.source === 'openfoodfacts'
										? `https://world.openfoodfacts.org/product/${product.code}`
										: 'https://fdc.nal.usda.gov/'
								).catch(() => {})
							}
							className="mt-3 self-center"
						>
							<Text className="text-[11px] font-JakartaMedium text-[#857869] underline">
								{SOURCE_CREDIT[product.source]}
							</Text>
						</TouchableOpacity>
					</>
				) : (
					// Not in either database
					<View className="items-center pt-6">
						<View className="w-14 h-14 rounded-full bg-[#F9F9F8] border-[1px] border-[#F0EBE6] items-center justify-center">
							<Ionicons name="barcode-outline" size={26} color="#574F47" />
						</View>
						<Text className="font-JakartaExtraBold text-[18px] text-[#262135] mt-4">
							Not in the database yet
						</Text>
						<Text className="font-JakartaMedium text-[13px] text-[#574F47] mt-1 text-center px-4">
							We couldn't find {scannedCode}. Snap the Nutrition Facts label instead, or type it in.
						</Text>
						<TouchableOpacity
							onPress={() => setCamera('label')}
							className="w-full bg-[#262135] rounded-xl py-3 mt-6 flex-row items-center justify-center"
						>
							<Ionicons name="reader-outline" size={18} color="#FFFFFF" />
							<Text className="ml-2 text-white font-JakartaBold text-[15px]">Snap the label</Text>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={() => setCamera('barcode')}
							className="w-full bg-[#F1F1F1] rounded-xl py-3 mt-3"
						>
							<Text className="text-center font-JakartaSemiBold text-[15px] text-[#262135]">
								Scan again
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={() => {
								setError('');
								setView('new');
							}}
							className="mt-4 py-2"
						>
							<Text className="font-JakartaSemiBold text-[14px] text-[#334155]">
								Enter it manually
							</Text>
						</TouchableOpacity>
					</View>
				)}

				<View className="mt-3">{renderErrorText()}</View>
			</View>
		);
	};

	const renderMacroTile = (meal: SavedMeal, field: MacroField, label: string, color: string) => (
		<View className="flex-1 rounded-2xl px-3 py-3" style={{ backgroundColor: `${color}1A` }}>
			<View className="flex-row items-center mb-1">
				<View className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
				<Text
					className="ml-1.5 text-[11px] font-JakartaSemiBold text-[#574F47]"
					style={eyebrowStyle}
				>
					{label}
				</Text>
			</View>
			{renderEditableValue(meal, field, 'font-JakartaExtraBold text-[20px]', 'g')}
		</View>
	);

	const renderResult = (meal: SavedMeal) => {
		const ingredients = (meal.ingredients ?? []).filter(item => Array.isArray(item) && item[0]);
		return (
			<View>
				{/* Success header: what was saved and where it went */}
				<View className="flex-row items-center mb-6">
					<View
						className="w-11 h-11 rounded-full items-center justify-center"
						style={{ backgroundColor: '#7DB88A33' }}
					>
						<Ionicons name="checkmark" size={24} color="#4F8A5E" />
					</View>
					<View className="flex-1 ml-3">
						<Text className="text-xl font-JakartaExtraBold text-[#262135]">Meal saved</Text>
						<Text className="text-[13px] font-JakartaMedium text-[#574F47] mt-0.5">
							{MEAL_LABELS[meal.meal_type] ?? 'Snack'} · {formatLogDate(logDate)}
						</Text>
					</View>
					<TouchableOpacity onPress={onClose} accessibilityLabel="Close">
						<Ionicons name="close" size={24} color="#334155" />
					</TouchableOpacity>
				</View>

				{ingredients.length > 0 && (
					<View className="bg-[#F9F9F8] rounded-2xl border-[1px] border-[#F0EBE6] px-4 mb-5">
						{ingredients.map((item, index) => (
							<View
								key={index}
								className={`flex-row items-center justify-between py-3 ${index < ingredients.length - 1 ? 'border-b-[1px] border-[#F0EBE6]' : ''}`}
							>
								<Text
									className="flex-1 mr-3 font-JakartaSemiBold text-[14px] text-[#262135]"
									numberOfLines={2}
								>
									{item[0]}
								</Text>
								<Text className="text-[13px] font-JakartaMedium text-[#574F47]">{item[1]}</Text>
							</View>
						))}
					</View>
				)}

				<View className="bg-white rounded-3xl border-[1px] border-[#F0EBE6] p-4">
					<Text className="text-[11px] font-JakartaSemiBold text-[#574F47]" style={eyebrowStyle}>
						Calories
					</Text>
					{renderEditableValue(meal, 'calories', 'font-JakartaExtraBold text-[36px]', 'cal')}

					<View className="flex-row mt-4" style={{ columnGap: 8 }}>
						{renderMacroTile(meal, 'protein', 'Protein', MACRO_COLORS.protein)}
						{renderMacroTile(meal, 'carbs', 'Carbs', MACRO_COLORS.carbs)}
						{renderMacroTile(meal, 'fats', 'Fat', MACRO_COLORS.fats)}
					</View>
				</View>

				<View className="flex-row items-center justify-center mt-4">
					<Ionicons name="pencil" size={12} color="#574F47" />
					<Text className="ml-1.5 text-[12px] font-JakartaMedium text-[#574F47]">
						Tap any number to adjust it
					</Text>
				</View>

				{impact && (
					<MealImpact
						before={impact.before}
						meal={{
							calories: Number(meal.calories) || 0,
							protein: Number(meal.protein) || 0,
							carbs: Number(meal.carbs) || 0,
							fats: Number(meal.fats) || 0,
						}}
						targets={impact.targets}
						dayLabel={formatLogDate(logDate)}
					/>
				)}

				<View className="mt-3">{renderErrorText()}</View>
			</View>
		);
	};

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
					{view === 'barcode' && renderBarcode()}
					{view === 'result' && savedMeal && renderResult(savedMeal)}
				</ScrollView>

				{/* Sticky footer: the main action stays on screen above the keyboard */}
				{(view === 'list' ||
					view === 'new' ||
					(view === 'barcode' && !!product && !isLookingUp) ||
					(view === 'result' && savedMeal)) && (
					<View
						className="px-6 pt-3 border-t-[1px] border-[#F0EBE6]"
						style={{ paddingBottom: 24 + insets.bottom }}
					>
						{view === 'barcode' ? (
							<TouchableOpacity
								onPress={logProduct}
								disabled={isSaving}
								className={`rounded-xl py-3 ${isSaving ? 'bg-[#F1F1F1]' : 'bg-[#262135]'}`}
							>
								<Text
									className={`text-center font-JakartaBold text-[17px] ${isSaving ? 'text-[#334155]' : 'text-white'}`}
								>
									{isSaving ? 'Saving…' : 'Log it'}
								</Text>
							</TouchableOpacity>
						) : view === 'new' ? (
							<TouchableOpacity
								onPress={saveNewMeal}
								disabled={isSaving || isAnalyzingPhoto}
								className={`rounded-xl py-3 ${isSaving ? 'bg-[#F1F1F1]' : 'bg-[#262135]'}`}
							>
								<Text
									className={`text-center font-JakartaBold text-[17px] ${isSaving ? 'text-[#334155]' : 'text-white'}`}
									style={isSaving ? undefined : BUTTON_TEXT_SHADOW}
								>
									{isSaving
										? photoEstimate && sameIngredients(ingredients, photoEstimate.items)
											? 'Saving…'
											: 'Analyzing and saving…'
										: 'Save meal'}
								</Text>
							</TouchableOpacity>
						) : view === 'list' ? (
							<TouchableOpacity
								onPress={() => {
									setError('');
									setView('new');
								}}
								className="bg-[#262135] rounded-xl py-3"
							>
								<Text
									className="text-white text-center font-JakartaBold text-[17px]"
									style={BUTTON_TEXT_SHADOW}
								>
									New meal
								</Text>
							</TouchableOpacity>
						) : (
							<TouchableOpacity onPress={onClose} className="bg-[#262135] rounded-xl py-3">
								<Text
									className="text-white text-center font-JakartaBold text-[17px]"
									style={BUTTON_TEXT_SHADOW}
								>
									Done
								</Text>
							</TouchableOpacity>
						)}
					</View>
				)}

				{/* Camera on top of the sheet (same modal, so no nested-modal issues) */}
				{camera && (
					<View style={StyleSheet.absoluteFillObject}>
						<CameraSheet
							mode={camera}
							onClose={() => setCamera(null)}
							onBarcode={handleBarcode}
							onPhoto={base64 => handlePhoto(base64, camera === 'label' ? 'label' : 'photo')}
						/>
					</View>
				)}
			</View>
		</ReactNativeModal>
	);
};

export default LogMealModal;
