import React from 'react';
import { View, Text, Animated, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

const AwarenessSurrender = () => {
	const insets = useSafeAreaInsets();
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(50)).current;
	const checkmarkAnim = useRef(new Animated.Value(0)).current;
	const scaleAnim = useRef(new Animated.Value(0)).current;
	const [isPlaying, setIsPlaying] = useState(false);
	const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes in seconds
	const [isComplete, setIsComplete] = useState(false);
	const intervalRef = useRef<number | null>(null);
	const soundRef = useRef<Audio.Sound | null>(null);

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

	// Load sound on component mount
	useEffect(() => {
		const loadSound = async () => {
			try {
				const { sound } = await Audio.Sound.createAsync(
					require('@/assets/sounds/gong-hit-small-gfx-sounds-4-4-00-06.mp3')
				);
				soundRef.current = sound;
			} catch (error) {
				console.error('Error loading sound:', error);
			}
		};
		loadSound();

		return () => {
			if (soundRef.current) {
				soundRef.current.unloadAsync();
			}
		};
	}, []);

	// Timer functionality
	useEffect(() => {
		if (isPlaying && timeRemaining > 0) {
			intervalRef.current = setInterval(async () => {
				setTimeRemaining(prevTime => {
					const newTime = prevTime - 1;
					if (newTime <= 0) {
						setIsPlaying(false);
						setIsComplete(true);

						// Play gong sound
						if (soundRef.current) {
							soundRef.current.replayAsync().catch(error => {
								console.error('Error playing sound:', error);
							});
						}

						// Animate checkmark
						Animated.parallel([
							Animated.timing(checkmarkAnim, {
								toValue: 1,
								duration: 500,
								useNativeDriver: true,
							}),
							Animated.spring(scaleAnim, {
								toValue: 1,
								tension: 100,
								friction: 8,
								useNativeDriver: true,
							}),
						]).start();
					}
					return newTime;
				});
			}, 1000);
		}

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, [isPlaying, timeRemaining, checkmarkAnim, scaleAnim]);

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	};

	const togglePlayPause = () => {
		if (!isComplete) {
			setIsPlaying(!isPlaying);
		}
	};

	const resetTimer = () => {
		setTimeRemaining(300);
		setIsPlaying(false);
		setIsComplete(false);
		checkmarkAnim.setValue(0);
		scaleAnim.setValue(0);
	};

	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<ScrollView
				className="flex-1 bg-[#db8cce]"
				style={{ paddingTop: insets.top }}
				showsVerticalScrollIndicator={false}
			>
				{/* Header */}
				<View className="flex flex-row items-center justify-between px-6 py-4 border-b border-gray-200">
					<TouchableOpacity onPress={() => router.back()}>
						<Ionicons name="arrow-back" size={24} color="#374151" />
					</TouchableOpacity>
					<Text className="text-gray-800 text-lg font-JakartaSemiBold">Awareness & Surrender</Text>
					<View style={{ width: 24 }} />
				</View>

				<Animated.View
					style={{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
					}}
					className="p-6"
				>
					{/* Title Section */}
					<View className="items-center mb-8">
						<View className="w-20 h-20 bg-blue-100 rounded-full items-center justify-center mb-4">
							<Ionicons name="leaf-outline" size={32} color="#3B82F6" />
						</View>
						<Text className="text-3xl font-bold text-gray-800 text-center mb-2">
							Awareness & Surrender
						</Text>
						<Text className="text-black text-center font-JakartaMedium">
							Be present and surrender fully to the present moment
						</Text>
					</View>

					{/* Timer Card */}
					<View className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-6">
						<View className="items-center">
							<Text className="text-6xl font-bold text-blue-600 mb-4">
								{formatTime(timeRemaining)}
							</Text>

							{/* Checkmark Animation */}
							{isComplete && (
								<Animated.View
									className="mb-4"
									style={{
										opacity: checkmarkAnim,
										transform: [{ scale: scaleAnim }],
									}}
								>
									<View className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
										<Ionicons name="checkmark" size={32} color="white" />
									</View>
								</Animated.View>
							)}

							{/* Play/Pause/Reset Button */}
							<TouchableOpacity
								onPress={isComplete ? resetTimer : togglePlayPause}
								className={`w-16 h-16 rounded-full items-center justify-center ${
									isComplete ? 'bg-green-500' : isPlaying ? 'bg-red-500' : 'bg-blue-500'
								}`}
							>
								<Ionicons
									name={isComplete ? 'refresh' : isPlaying ? 'pause' : 'play'}
									size={24}
									color="white"
								/>
							</TouchableOpacity>

							{/* Status Text */}
							<Text className="text-sm text-gray-600 mt-3 font-JakartaMedium">
								{isComplete
									? 'Practice completed! 🎉'
									: isPlaying
										? 'Stay present...'
										: timeRemaining < 300
											? 'Tap to continue'
											: 'Ready to begin?'}
							</Text>
						</View>
					</View>

					{/* Instructions */}
					<View className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-6">
						<Text className="text-xl font-bold text-gray-800 mb-4">Practice Instructions</Text>
						<View className="space-y-3">
							<View className="flex-row items-start">
								<View className="w-6 h-6 bg-blue-100 rounded-full items-center justify-center mr-3 mt-1">
									<Text className="text-blue-600 text-xs font-bold">1</Text>
								</View>
								<Text className="text-gray-700 flex-1 font-JakartaMedium">
									Find a comfortable position and close your eyes
								</Text>
							</View>
							<View className="flex-row items-start">
								<View className="w-6 h-6 bg-blue-100 rounded-full items-center justify-center mr-3 mt-1">
									<Text className="text-blue-600 text-xs font-bold">2</Text>
								</View>
								<Text className="text-gray-700 flex-1 font-JakartaMedium">
									Focus on your natural breathing - don't force it
								</Text>
							</View>
							<View className="flex-row items-start">
								<View className="w-6 h-6 bg-blue-100 rounded-full items-center justify-center mr-3 mt-1">
									<Text className="text-blue-600 text-xs font-bold">3</Text>
								</View>
								<Text className="text-gray-700 flex-1 font-JakartaMedium">
									Observe your thoughts like clouds passing in the sky
								</Text>
							</View>
							<View className="flex-row items-start">
								<View className="w-6 h-6 bg-blue-100 rounded-full items-center justify-center mr-3 mt-1">
									<Text className="text-blue-600 text-xs font-bold">4</Text>
								</View>
								<Text className="text-gray-700 flex-1 font-JakartaMedium">
									Don't attach to thoughts - just let them come and go
								</Text>
							</View>
						</View>
					</View>

					{/* Benefits */}
					<View className="bg-indigo-50 rounded-2xl p-6 border border-blue-100">
						<Text className="text-lg font-bold text-blue-800 mb-3">Benefits of This Practice</Text>
						<View className="space-y-2">
							<View className="flex-row items-center">
								<Ionicons name="checkmark-circle" size={16} color="#3B82F6" />
								<Text className="text-blue-700 ml-2 font-JakartaMedium">
									Reduces stress and anxiety
								</Text>
							</View>
							<View className="flex-row items-center">
								<Ionicons name="checkmark-circle" size={16} color="#3B82F6" />
								<Text className="text-blue-700 ml-2 font-JakartaMedium">
									Improves focus and clarity
								</Text>
							</View>
							<View className="flex-row items-center">
								<Ionicons name="checkmark-circle" size={16} color="#3B82F6" />
								<Text className="text-blue-700 ml-2 font-JakartaMedium">
									Enhances self-awareness
								</Text>
							</View>
							<View className="flex-row items-center">
								<Ionicons name="checkmark-circle" size={16} color="#3B82F6" />
								<Text className="text-blue-700 ml-2 font-JakartaMedium">Promotes inner peace</Text>
							</View>
						</View>
					</View>
				</Animated.View>
			</ScrollView>
		</>
	);
};

export default AwarenessSurrender;
