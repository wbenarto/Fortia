import { useEffect, useRef, useState } from 'react';
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	ActivityIndicator,
	Animated,
	Keyboard,
} from 'react-native';
import ReactNativeModal from 'react-native-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { fetchAPI } from '@/lib/fetch';
import { getTodayDate } from '@/lib/dateUtils';
import { useCyclingPlaceholder } from '@/lib/useCyclingPlaceholder';
import { INGREDIENT_PLACEHOLDERS, defaultMealType } from '@/components/LogMealModal';

const ACCENT = '#E3BBA1';
const EYEBROW_STYLE = { textTransform: 'uppercase', letterSpacing: 0.6 } as const;
const DEFAULT_AMOUNT = '1 serving';

interface Nutrition {
	calories: number;
	protein: number;
	carbs: number;
	fats: number;
	fiber: number;
	sugar: number;
	sodium: number;
	confidence: number;
}

interface LookupResult {
	food: string;
	amount: string;
	nutrition: Nutrition;
}

const roundValue = (value: unknown) => Math.round(Math.max(0, Number(value) || 0));

// Nutrition lookup for any food or chain meal (via Gemini, through /api/recipe-analysis).
// Looking something up never writes to the log; "Log this meal" is an explicit extra step.
const FoodLookupModal = ({ isVisible, onClose }: { isVisible: boolean; onClose: () => void }) => {
	const { user } = useUser();
	const insets = useSafeAreaInsets();
	const [food, setFood] = useState('');
	const [amount, setAmount] = useState('');
	const [result, setResult] = useState<LookupResult | null>(null);
	const [isLooking, setIsLooking] = useState(false);
	const [isLogging, setIsLogging] = useState(false);
	const [logged, setLogged] = useState(false);
	const [error, setError] = useState('');
	const requestRef = useRef(0);
	const foodInputRef = useRef<TextInput>(null);
	const { index: placeholderIndex, opacity: placeholderOpacity } = useCyclingPlaceholder(
		INGREDIENT_PLACEHOLDERS.length
	);

	// Start fresh each time the sheet opens
	useEffect(() => {
		if (!isVisible) return;
		requestRef.current += 1;
		setFood('');
		setAmount('');
		setResult(null);
		setIsLooking(false);
		setIsLogging(false);
		setLogged(false);
		setError('');
	}, [isVisible]);

	const lookUp = async () => {
		const trimmedFood = food.trim();
		if (!trimmedFood || !user?.id) return;
		const trimmedAmount = amount.trim() || DEFAULT_AMOUNT;

		Keyboard.dismiss();
		const requestId = ++requestRef.current;
		setIsLooking(true);
		setError('');
		setResult(null);
		setLogged(false);
		try {
			const response = await fetchAPI('/api/recipe-analysis', {
				method: 'POST',
				body: JSON.stringify({
					ingredients: [{ ingredient: trimmedFood, amount: trimmedAmount }],
					userId: user.id,
				}),
			});
			if (requestId !== requestRef.current) return;
			if (response.success && response.data) {
				setResult({ food: trimmedFood, amount: trimmedAmount, nutrition: response.data });
			} else {
				setError(response.error || 'Could not look up that food. Please try again.');
			}
		} catch (err) {
			if (requestId !== requestRef.current) return;
			console.error('Food lookup error:', err);
			setError(err instanceof Error ? err.message : 'Could not look up that food.');
		} finally {
			if (requestId === requestRef.current) setIsLooking(false);
		}
	};

	const logResult = async () => {
		if (!result || !user?.id) return;
		const { nutrition } = result;
		setIsLogging(true);
		setError('');
		try {
			const response = await fetchAPI('/api/meals', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					clerkId: user.id,
					foodName: result.food,
					portionSize: result.amount,
					calories: Math.max(0, Number(nutrition.calories) || 0),
					protein: Math.max(0, Number(nutrition.protein) || 0),
					carbs: Math.max(0, Number(nutrition.carbs) || 0),
					fats: Math.max(0, Number(nutrition.fats) || 0),
					fiber: Math.max(0, Number(nutrition.fiber) || 0),
					sugar: Math.max(0, Number(nutrition.sugar) || 0),
					sodium: Math.max(0, Number(nutrition.sodium) || 0),
					confidenceScore: Math.min(1, Math.max(0, Number(nutrition.confidence) || 0.5)),
					mealType: defaultMealType(),
					date: getTodayDate(),
					ingredients: [[result.food, result.amount]],
				}),
			});
			if (!response.success) {
				setError(response.error || 'Failed to log meal');
				return;
			}
			setLogged(true);
			setTimeout(onClose, 700);
		} catch (err) {
			console.error('Log looked-up meal error:', err);
			setError('Failed to log meal. Please try again.');
		} finally {
			setIsLogging(false);
		}
	};

	const newSearch = () => {
		requestRef.current += 1;
		setFood('');
		setAmount('');
		setResult(null);
		setLogged(false);
		setError('');
		foodInputRef.current?.focus();
	};

	const nutrition = result?.nutrition;
	const lowConfidence = nutrition ? (Number(nutrition.confidence) || 0) < 0.5 : false;

	return (
		<ReactNativeModal
			isVisible={isVisible}
			onBackdropPress={onClose}
			onBackButtonPress={onClose}
			onModalShow={() => foodInputRef.current?.focus()}
			animationIn="slideInUp"
			animationOut="slideOutDown"
			avoidKeyboard
			className="m-0 justify-end"
		>
			<View className="bg-white rounded-t-3xl p-6" style={{ paddingBottom: 24 + insets.bottom }}>
				<View className="flex-row justify-between items-center mb-5">
					<Text className="text-xl font-JakartaExtraBold text-[#262135]">Look up food</Text>
					<TouchableOpacity onPress={onClose} hitSlop={10}>
						<Ionicons name="close" size={24} color="#334155" />
					</TouchableOpacity>
				</View>

				{/* Inputs */}
				<View className="flex-row items-end mb-5" style={{ columnGap: 12 }}>
					<View className="flex-1">
						<Text
							className="text-[11px] font-JakartaSemiBold text-[#574F47] mb-1"
							style={EYEBROW_STYLE}
						>
							Food
						</Text>
						<View className="justify-center">
							<TextInput
								ref={foodInputRef}
								value={food}
								onChangeText={setFood}
								returnKeyType="search"
								onSubmitEditing={lookUp}
								className="text-sm text-[#262135] border-b-[1px] border-[#E3BBA1] pb-2"
							/>
							{!food && (
								<Animated.Text
									pointerEvents="none"
									style={{ opacity: placeholderOpacity }}
									className="absolute left-0 pb-2 text-sm text-[#574F47]"
									numberOfLines={1}
								>
									{INGREDIENT_PLACEHOLDERS[placeholderIndex].ingredient}
								</Animated.Text>
							)}
						</View>
					</View>
					<View className="w-24">
						<Text
							className="text-[11px] font-JakartaSemiBold text-[#574F47] mb-1"
							style={EYEBROW_STYLE}
						>
							Amount
						</Text>
						<View className="justify-center">
							<TextInput
								value={amount}
								onChangeText={setAmount}
								returnKeyType="search"
								onSubmitEditing={lookUp}
								className="text-sm text-[#262135] border-b-[1px] border-[#E3BBA1] pb-2"
							/>
							{!amount && (
								<Animated.Text
									pointerEvents="none"
									style={{ opacity: placeholderOpacity }}
									className="absolute left-0 pb-2 text-sm text-[#574F47]"
									numberOfLines={1}
								>
									{INGREDIENT_PLACEHOLDERS[placeholderIndex].amount}
								</Animated.Text>
							)}
						</View>
					</View>
				</View>

				{/* Result */}
				{nutrition && result && (
					<View className="bg-white rounded-3xl border-[1px] border-[#F0EBE6] p-4 mb-4">
						<Text className="text-base font-JakartaBold text-[#262135]" numberOfLines={2}>
							{result.food}
						</Text>
						<Text className="text-xs font-JakartaMedium text-[#574F47] mt-0.5">
							{result.amount}
						</Text>

						<View className="flex-row items-baseline mt-3">
							<Text className="font-JakartaExtraBold text-[36px] text-[#262135]">
								{roundValue(nutrition.calories)}
							</Text>
							<Text className="font-JakartaSemiBold text-sm text-[#574F47] ml-1">kcal</Text>
						</View>

						<View className="flex-row justify-between bg-[#F9F9F8] border-[1px] border-[#F0EBE6] rounded-2xl px-4 py-3 mt-3">
							<Stat label="Protein" value={nutrition.protein} unit="g" />
							<Stat label="Carbs" value={nutrition.carbs} unit="g" />
							<Stat label="Fat" value={nutrition.fats} unit="g" />
						</View>

						<Text className="text-[11px] font-JakartaMedium text-[#574F47] mt-3">
							Fiber {roundValue(nutrition.fiber)} g · Sugar {roundValue(nutrition.sugar)} g · Sodium{' '}
							{roundValue(nutrition.sodium)} mg
						</Text>
						{lowConfidence && (
							<Text className="text-[11px] font-JakartaMedium text-[#574F47] mt-1">
								Estimate — try a more specific name or amount.
							</Text>
						)}
					</View>
				)}

				{error ? <Text className="text-xs text-[#E08585] mb-3">{error}</Text> : null}

				{/* Actions */}
				{result ? (
					<View className="flex-row" style={{ columnGap: 12 }}>
						<TouchableOpacity
							onPress={newSearch}
							disabled={isLogging}
							className="flex-1 bg-[#F1F1F1] rounded-xl py-3"
						>
							<Text className="text-[#262135] text-center font-JakartaSemiBold">New search</Text>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={logResult}
							disabled={isLogging || logged}
							className="flex-1 bg-[#E3BBA1] rounded-xl py-3"
						>
							{isLogging ? (
								<ActivityIndicator size="small" color="#FFFFFF" />
							) : (
								<Text className="text-white text-center font-JakartaSemiBold">
									{logged ? 'Logged ✓' : 'Log this meal'}
								</Text>
							)}
						</TouchableOpacity>
					</View>
				) : (
					<TouchableOpacity
						onPress={lookUp}
						disabled={isLooking || !food.trim()}
						className={`rounded-xl py-3 ${
							isLooking || !food.trim() ? 'bg-[#F1F1F1]' : 'bg-[#E3BBA1]'
						}`}
					>
						{isLooking ? (
							<View className="flex-row items-center justify-center">
								<ActivityIndicator size="small" color={ACCENT} />
								<Text className="text-[#574F47] font-JakartaSemiBold ml-2">Looking up…</Text>
							</View>
						) : (
							<Text
								className={`text-center font-JakartaSemiBold ${
									food.trim() ? 'text-white' : 'text-[#574F47]'
								}`}
							>
								Look up
							</Text>
						)}
					</TouchableOpacity>
				)}
			</View>
		</ReactNativeModal>
	);
};

const Stat = ({ label, value, unit }: { label: string; value: number; unit: string }) => (
	<View>
		<Text className="text-[10px] font-JakartaSemiBold text-[#574F47]" style={EYEBROW_STYLE}>
			{label}
		</Text>
		<View className="flex-row items-baseline mt-0.5">
			<Text className="font-JakartaExtraBold text-[16px] text-[#262135]">{roundValue(value)}</Text>
			<Text className="font-JakartaMedium text-[10px] text-[#574F47] ml-0.5">{unit}</Text>
		</View>
	</View>
);

export default FoodLookupModal;
