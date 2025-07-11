import { View, Text, Animated, TouchableOpacity } from 'react-native';
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
			<View className="flex-1 bg-yellow-200" style={{ paddingTop: insets.top }}>
				<View className="flex flex-row items-center justify-between px-6 py-4 border-b border-gray-700">
					<TouchableOpacity onPress={() => router.back()}>
						<Ionicons name="arrow-back" size={24} color="#black" />
					</TouchableOpacity>
					<Text className="text-black text-lg font-JakartaSemiBold">Awakened Manifesting</Text>
					<View style={{ width: 24 }} />
				</View>
				<Animated.View
					style={{
						flex: 1,
						alignItems: 'center',
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
					}}
				>
					<Text className="text-2xl font-bold text-gray-800">Awareness</Text>
				</Animated.View>
				<Animated.View
					style={{
						flex: 1,
						alignItems: 'center',
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
					}}
				>
					<Text className="text-2xl font-bold text-gray-800">Insight</Text>
				</Animated.View>
				<Animated.View
					style={{
						flex: 1,
						alignItems: 'center',
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
					}}
				>
					<Text className="text-2xl font-bold text-gray-800">Manifest</Text>
				</Animated.View>
			</View>
		</>
	);
};

export default AwakenedManifesting;
