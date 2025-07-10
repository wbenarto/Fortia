import React, { useState } from 'react';
import {
	Modal,
	View,
	Text,
	TouchableOpacity,
	TextInput,
	ActivityIndicator,
	ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PRIMARY } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchAPI } from '@/lib/fetch';

interface RecipeBreakdownModalProps {
	visible: boolean;
	onClose: () => void;
}

interface RecipeIngredient {
	name: string;
	quantity?: string;
	macronutrients: {
		calories: number;
		protein_g: number;
		carbs_g: number;
		fat_g: number;
	};
}

interface RecipeBreakdown {
	video_title: string;
	video_url: string;
	ingredients: RecipeIngredient[];
	instructions: string[];
	total_macronutrients: {
		calories: number;
		protein_g: number;
		carbs_g: number;
		fat_g: number;
	};
}

const RecipeBreakdownModal: React.FC<RecipeBreakdownModalProps> = ({ visible, onClose }) => {
	const insets = useSafeAreaInsets();
	const [search, setSearch] = useState('');
	const [loading, setLoading] = useState(false);
	const [recipeData, setRecipeData] = useState<RecipeBreakdown | null>(null);
	const [error, setError] = useState<string | null>(null);

	const handleSearch = async () => {
		if (!search.trim()) return;
		setLoading(true);
		setError(null);
		setRecipeData(null);

		try {
			const response = await fetchAPI('/(api)/recipe-breakdown', {
				method: 'POST',
				body: JSON.stringify({ videoUrl: search.trim() }),
				headers: { 'Content-Type': 'application/json' },
			});
			console.log('Recipe Breakdown API result:', response);

			if (response.success && response.data) {
				setRecipeData(response.data);
			} else {
				setError('Failed to analyze recipe. Please try again.');
			}
		} catch (e: any) {
			console.error('Recipe Breakdown API error:', e);

			// Handle specific error types
			if (e.message?.includes('503') || e.message?.includes('overloaded')) {
				setError('Gemini API is temporarily overloaded. Please try again in 2-3 minutes.');
			} else if (e.message?.includes('429') || e.message?.includes('rate limit')) {
				setError('API rate limit exceeded. Please wait a few minutes before trying again.');
			} else if (e.message?.includes('500')) {
				setError('Server error occurred. Please try again later.');
			} else {
				setError('Failed to analyze recipe. Please check your URL and try again.');
			}
		} finally {
			setLoading(false);
		}
	};

	const resetSearch = () => {
		setSearch('');
		setRecipeData(null);
		setError(null);
	};

	const RecipeResult = ({ data }: { data: RecipeBreakdown }) => (
		<ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
			{/* Recipe Title */}
			<View className="mb-6">
				<Text className="text-gray-900 text-xl font-JakartaSemiBold mb-2">{data.video_title}</Text>
				<Text className="text-gray-500 text-sm font-JakartaMedium">Recipe Analysis</Text>
			</View>

			{/* Total Macros Card */}
			<View className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
				<Text className="text-gray-900 text-lg font-JakartaSemiBold mb-3">Total Nutrition</Text>
				<View className="flex-row justify-between">
					<View className="items-center">
						<Text className="text-2xl font-JakartaBold text-[#E3BBA1]">
							{data.total_macronutrients.calories}
						</Text>
						<Text className="text-gray-600 text-sm font-JakartaMedium">Calories</Text>
					</View>
					<View className="items-center">
						<Text className="text-2xl font-JakartaBold ">
							{data.total_macronutrients.protein_g}g
						</Text>
						<Text className="text-gray-600 text-sm font-JakartaMedium">Protein</Text>
					</View>
					<View className="items-center">
						<Text className="text-2xl font-JakartaBold">{data.total_macronutrients.carbs_g}g</Text>
						<Text className="text-gray-600 text-sm font-JakartaMedium">Carbs</Text>
					</View>
					<View className="items-center">
						<Text className="text-2xl font-JakartaBold ">{data.total_macronutrients.fat_g}g</Text>
						<Text className="text-gray-600 text-sm font-JakartaMedium">Fat</Text>
					</View>
				</View>
			</View>

			{/* Ingredients */}
			<View className="mb-6">
				<Text className="text-gray-900 text-lg font-JakartaSemiBold mb-3">Ingredients</Text>
				{data.ingredients.map((ingredient, index) => (
					<View key={index} className="bg-white rounded-lg p-3 mb-2 border border-gray-200">
						<View className="flex-row justify-between items-start mb-2">
							<Text className="text-gray-900 font-JakartaMedium flex-1">{ingredient.name}</Text>
							{ingredient.quantity && (
								<Text className="text-gray-500 font-JakartaMedium ml-2">{ingredient.quantity}</Text>
							)}
						</View>
						<View className="flex-row justify-between">
							<Text className="text-gray-600 text-sm">
								{ingredient.macronutrients.calories} cal
							</Text>
							<Text className="text-gray-600 text-sm">
								P: {ingredient.macronutrients.protein_g}g
							</Text>
							<Text className="text-gray-600 text-sm">C: {ingredient.macronutrients.carbs_g}g</Text>
							<Text className="text-gray-600 text-sm">F: {ingredient.macronutrients.fat_g}g</Text>
						</View>
					</View>
				))}
			</View>

			{/* Instructions */}
			<View className="mb-6">
				<Text className="text-gray-900 text-lg font-JakartaSemiBold mb-3">Instructions</Text>
				{data.instructions.map((instruction, index) => (
					<View key={index} className="flex-row mb-3">
						<View className="w-6 h-6 rounded-full bg-[#E3BBA1] items-center justify-center mr-3 mt-0.5">
							<Text className="text-white text-sm font-JakartaBold">{index + 1}</Text>
						</View>
						<Text className="text-gray-700 font-JakartaMedium flex-1 leading-6">{instruction}</Text>
					</View>
				))}
			</View>

			{/* New Search Button */}
			<TouchableOpacity
				className="bg-[#E3BBA1] rounded-xl py-3 px-6 mb-6"
				onPress={resetSearch}
				activeOpacity={0.8}
			>
				<Text className="text-white text-center font-JakartaSemiBold">Analyze Another Recipe</Text>
			</TouchableOpacity>
		</ScrollView>
	);

	const ErrorMessage = ({ message }: { message: string }) => (
		<View className="flex-1 items-center justify-center px-8">
			<Ionicons
				name="alert-circle-outline"
				size={64}
				color="#EF4444"
				style={{ marginBottom: 24 }}
			/>
			<Text className="text-gray-900 text-xl font-JakartaSemiBold mb-2 text-center">
				Analysis Failed
			</Text>
			<Text className="text-gray-500 text-center mb-6">{message}</Text>
			<TouchableOpacity
				className="bg-[#E3BBA1] rounded-xl py-3 px-6"
				onPress={resetSearch}
				activeOpacity={0.8}
			>
				<Text className="text-white font-JakartaSemiBold">Try Again</Text>
			</TouchableOpacity>
		</View>
	);

	const PlaceholderContent = () => (
		<View className="flex-1 items-center justify-center px-8">
			<Ionicons name="restaurant-outline" size={64} color={PRIMARY} style={{ marginBottom: 24 }} />
			<Text className="text-gray-900 text-2xl font-JakartaSemiBold mb-2 text-center">
				Recipe Breakdown
			</Text>
			<Text className="text-gray-500 text-center mb-6">
				Here you'll see a detailed nutritional breakdown of your recipe, including calories, macros,
				and more.
			</Text>
		</View>
	);

	return (
		<Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
			<View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
				{/* Custom Header */}
				<View className="flex flex-row items-center justify-center px-6 py-4 border-b border-gray-200 relative">
					<Text className="text-gray-900 text-lg font-JakartaSemiBold text-center flex-1">
						Recipe Breakdown
					</Text>
					<TouchableOpacity onPress={onClose} style={{ position: 'absolute', right: 24, top: 16 }}>
						<Ionicons name="close" size={28} color={PRIMARY} />
					</TouchableOpacity>
				</View>

				{/* Search Box - Only show if no results or error */}
				{!recipeData && !error && (
					<>
						<View className="px-6 pt-6">
							<View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3 mb-6 border border-gray-200">
								<Ionicons
									name="search-outline"
									size={20}
									color="#A0AEC0"
									style={{ marginRight: 8 }}
								/>
								<TextInput
									className="flex-1 text-gray-900 font-JakartaMedium text-base"
									placeholder="Paste recipe URL"
									placeholderTextColor="#A0AEC0"
									value={search}
									onChangeText={setSearch}
									autoCapitalize="none"
									autoCorrect={false}
									keyboardType="url"
									returnKeyType="done"
									editable={!loading}
									onSubmitEditing={handleSearch}
								/>
							</View>
						</View>
						<TouchableOpacity
							className="mx-auto w-16 h-16 rounded-full bg-[#E3BBA1] flex items-center justify-center"
							onPress={handleSearch}
							disabled={loading}
							activeOpacity={0.8}
						>
							{loading ? (
								<ActivityIndicator color="#fff" size={28} />
							) : (
								<Ionicons name="search" size={28} color="#fff" />
							)}
						</TouchableOpacity>
					</>
				)}

				{/* Content Area */}
				{loading ? (
					<View className="flex-1 items-center justify-center">
						<ActivityIndicator size="large" color={PRIMARY} />
						<Text className="text-gray-600 font-JakartaMedium mt-4">Analyzing recipe...</Text>
					</View>
				) : error ? (
					<ErrorMessage message={error} />
				) : recipeData ? (
					<RecipeResult data={recipeData} />
				) : (
					<PlaceholderContent />
				)}
			</View>
		</Modal>
	);
};

export default RecipeBreakdownModal;
