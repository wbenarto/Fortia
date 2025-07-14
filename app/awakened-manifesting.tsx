import { View, Text, Animated, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';

const AwakenedManifesting = () => {
	const insets = useSafeAreaInsets();
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(50)).current;

	useEffect(() => {
		// Start the animation when component mounts
		Animated.parallel([
			Animated.timing(fadeAnim, {
				toValue: 1,
				duration: 800,
				useNativeDriver: true,
			}),
			Animated.timing(slideAnim, {
				toValue: 0,
				duration: 800,
				useNativeDriver: true,
			}),
		]).start();
	}, [fadeAnim, slideAnim]);

	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<ScrollView
				className="flex-1 bg-yellow-200"
				style={{ paddingTop: insets.top }}
				showsVerticalScrollIndicator={false}
			>
				<View className="flex flex-row items-center justify-between px-6 py-4 border-b border-gray-700">
					<TouchableOpacity onPress={() => router.back()}>
						<Ionicons name="arrow-back" size={24} color="#black" />
					</TouchableOpacity>
					<Text className="text-black text-lg font-JakartaSemiBold">Awakened Manifesting</Text>
					<View style={{ width: 24 }} />
				</View>
				<View className="p-4 ">
					{/* Daily Practice Encouragement */}
					<View className=" p-4  rounded-2xl shadow-sm border border-yellow-300 bg-yellow-50">
						<View className="flex flex-row items-center mb-3 justify-center">
							<Ionicons name="sparkles-outline" size={20} color="#F59E0B" />
							<Text className="ml-2 font-JakartaSemiBold text-yellow-800 text-sm">
								Daily Practice
							</Text>
						</View>
						<Text className="text-yellow-700 text-xs leading-5 font-JakartaMedium text-center mb-4">
							Transform your reality through daily awakened manifesting practice. Every moment of
							focused intention brings you closer to becoming the best version of yourself. Your
							thoughts shape your world—choose them wisely and watch your dreams materialize. Follow
							the three steps in this feature to get started.
						</Text>

						{/* Practice Icons */}
						<View className="flex flex-row justify-center items-center space-x-8">
							<View className="items-center">
								<View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center mb-2">
									<Ionicons name="leaf-outline" size={24} color="#3B82F6" />
								</View>
								<Text className="text-blue-700 text-xs font-JakartaMedium text-center">
									Awareness
								</Text>
							</View>
							<View className="items-center">
								<View className="w-12 h-12 bg-purple-100 rounded-full items-center justify-center mb-2">
									<Ionicons name="bulb-outline" size={24} color="#8B5CF6" />
								</View>
								<Text className="text-purple-700 text-xs font-JakartaMedium text-center">
									Insight
								</Text>
							</View>
							<View className="items-center">
								<View className="w-12 h-12 bg-green-100 rounded-full items-center justify-center mb-2">
									<Ionicons name="star" size={24} color="#10B981" />
								</View>
								<Text className="text-green-700 text-xs font-JakartaMedium text-center">
									Manifest
								</Text>
							</View>
						</View>
					</View>
				</View>
				<Animated.View
					style={{
						alignItems: 'center',
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
					}}
				>
					<TouchableOpacity
						className="mx-4   mb-4 p-6 bg-white rounded-2xl shadow-lg border border-gray-200 active:bg-gray-50"
						onPress={() => router.push('/awareness-surrender')}
					>
						<View className="flex flex-row items-center justify-between mb-3">
							<Text className="text-2xl font-bold text-gray-800">1. Awareness & Surrender</Text>
							<Ionicons name="chevron-forward" size={24} color="#6B7280" />
						</View>
						<Text className="text-gray-800 text-sm font-JakartaMedium text-center mb-3">
							Be present and surrender fully to the present moment.Observe your thoughts as they
							come in and out of your mind. (5 mins).
						</Text>
						<View className="flex flex-row items-center justify-center">
							<Ionicons name="play-circle-outline" size={16} color="#F59E0B" />
							<Text className="ml-2 text-yellow-600 text-xs font-JakartaSemiBold">
								Start Practice
							</Text>
						</View>
					</TouchableOpacity>
				</Animated.View>
				<Animated.View
					style={{
						alignItems: 'center',
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
					}}
				>
					<TouchableOpacity
						className="mx-6 mb-4 p-6 bg-white rounded-2xl shadow-lg border border-gray-200 active:bg-gray-50"
						onPress={() => router.push('/insight')}
					>
						<View className="flex flex-row items-center justify-between mb-3">
							<Text className="text-2xl font-bold text-gray-800">2. Insight</Text>
							<Ionicons name="chevron-forward" size={24} color="#6B7280" />
						</View>
						<Text className="text-gray-800 text-sm font-JakartaMedium text-center mb-3">
							Start by reaffirming yourself with "You always find a way to win". Then continue with
							the contemplation exercise.
							{'\n'}Practice: Contemplation (5 mins)
						</Text>
						<View className="flex flex-row items-center justify-center">
							<Ionicons name="play-circle-outline" size={16} color="#F59E0B" />
							<Text className="ml-2 text-yellow-600 text-xs font-JakartaSemiBold">
								Start Practice
							</Text>
						</View>
					</TouchableOpacity>
				</Animated.View>
				<Animated.View
					style={{
						alignItems: 'center',
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
					}}
				>
					<TouchableOpacity
						className="mx-6 mb-4 p-6 bg-white rounded-2xl shadow-lg border border-gray-200 active:bg-gray-50"
						onPress={() => router.push('/manifest')}
					>
						<View className="flex flex-row items-center justify-between mb-3">
							<Text className="text-2xl font-bold text-gray-800">3. Manifest</Text>
							<Ionicons name="chevron-forward" size={24} color="#6B7280" />
						</View>
						<Text className="text-gray-800 text-sm font-JakartaMedium text-center mb-3">
							You have aligned with the present moment and become more aware. You have received some
							brilliant answers as to what exactly you want and what goals to set. Now, you're ready
							to manifest a new reality for yourself.
							{'\n'}
							Practice: Affirmations (5 mins) or Visualization (5 mins)
						</Text>
						<View className="flex flex-row items-center justify-center">
							<Ionicons name="play-circle-outline" size={16} color="#F59E0B" />
							<Text className="ml-2 text-yellow-600 text-xs font-JakartaSemiBold">
								Start Practice
							</Text>
						</View>
					</TouchableOpacity>
				</Animated.View>
			</ScrollView>
		</>
	);
};

export default AwakenedManifesting;
