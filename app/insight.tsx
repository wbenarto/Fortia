import React from 'react';
import { View, Text, Animated, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';

const Insight = () => {
	const insets = useSafeAreaInsets();
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(50)).current;
	const affirmationAnim = useRef(new Animated.Value(1)).current;
	const checkmarkAnim = useRef(new Animated.Value(0)).current;
	const scaleAnim = useRef(new Animated.Value(0)).current;
	const [isPlaying, setIsPlaying] = useState(false);
	const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes in seconds
	const [currentAffirmation, setCurrentAffirmation] = useState(0);
	const [isComplete, setIsComplete] = useState(false);
	const intervalRef = useRef<number | null>(null);
	const soundRef = useRef<Audio.Sound | null>(null);

	const affirmations = [
		'You always find a way to win',
		'You are capable of achieving anything you set your mind to',
		'Every challenge makes you stronger',
		'You have the power to create the life you want',
		'Your potential is limitless',
		'I am worthy of love, respect, and happiness',
		'I trust in my ability to make wise decisions',
		'My thoughts create my reality',
		'I am becoming better and stronger every day',
		'I attract positive energy and opportunities',
		'My confidence grows with each experience',
		'I am resilient and can overcome any obstacle',
		'I choose to focus on solutions, not problems',
		'My inner strength is greater than any challenge',
		'I am surrounded by abundance and prosperity',
		'I radiate positive energy that attracts success',
		'Every setback is a setup for a comeback',
		'I am the architect of my own destiny',
		'My dreams are valid and achievable',
		'I have everything I need to succeed',
		'I am worthy of all the good things life has to offer',
		'My past experiences have prepared me for greatness',
		'I am constantly evolving and improving',
		'My potential is greater than my current circumstances',
		'I choose to be happy and grateful every day',
		'I am a magnet for success and positive outcomes',
		'My determination is stronger than any doubt',
		'I am creating the life of my dreams',
		'Every day I grow stronger and more confident',
	];

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

	// Auto-rotate affirmations every 5 seconds with animation
	useEffect(() => {
		const interval = setInterval(() => {
			// Fade out current affirmation
			Animated.timing(affirmationAnim, {
				toValue: 0,
				duration: 300,
				useNativeDriver: true,
			}).start(() => {
				// Change affirmation and fade in
				setCurrentAffirmation(prev => (prev + 1) % affirmations.length);
				Animated.timing(affirmationAnim, {
					toValue: 1,
					duration: 300,
					useNativeDriver: true,
				}).start();
			});
		}, 5000);

		return () => clearInterval(interval);
	}, [affirmations.length, affirmationAnim]);

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
				className="flex-1 bg-[#d1e897]"
				style={{ paddingTop: insets.top }}
				showsVerticalScrollIndicator={false}
			>
				{/* Header */}
				<View className="flex flex-row items-center justify-between px-6 py-4 border-b border-gray-800">
					<TouchableOpacity onPress={() => router.back()}>
						<Ionicons name="arrow-back" size={24} color="#374151" />
					</TouchableOpacity>
					<Text className="text-gray-800 text-lg font-JakartaSemiBold">Insight</Text>
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
						<View className="w-20 h-20 bg-purple-100 rounded-full items-center justify-center mb-4">
							<Ionicons name="bulb-outline" size={32} color="#8B5CF6" />
						</View>
						<Text className="text-3xl font-bold text-gray-800 text-center mb-2">Insight</Text>
						<Text className="text-gray-600 text-center font-JakartaMedium">
							Master your energy and gain clarity through contemplation
						</Text>
					</View>

					{/* Timer Card */}
					<View className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-6">
						<View className="items-center">
							<Text className="text-6xl font-bold text-purple-600 mb-4">
								{formatTime(timeRemaining)}
							</Text>

							{/* Play/Pause/Reset Button */}
							<TouchableOpacity
								onPress={isComplete ? resetTimer : togglePlayPause}
								className={`w-16 h-16 rounded-full items-center justify-center ${
									isComplete ? 'bg-green-500' : isPlaying ? 'bg-red-500' : 'bg-purple-500'
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
										? 'Stay focused...'
										: timeRemaining < 300
											? 'Tap to continue'
											: 'Ready to begin?'}
							</Text>
						</View>
					</View>

					{/* Affirmation Card */}
					<View className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-6">
						<Text className="text-xl font-bold text-gray-800 mb-4 text-center">
							Daily Affirmation
						</Text>
						<View className="items-center">
							<Animated.Text
								className="text-lg text-purple-700 font-JakartaSemiBold text-center leading-6"
								style={{
									opacity: affirmationAnim,
								}}
							>
								"{affirmations[currentAffirmation]}"
							</Animated.Text>
						</View>
					</View>

					{/* Contemplation Questions */}
					<View className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-6">
						<Text className="text-xl font-bold text-gray-800 mb-4">Contemplation Questions</Text>
						<View className="space-y-4">
							<View className="bg-purple-50 rounded-xl p-4">
								<Text className="text-purple-800 font-JakartaSemiBold mb-2">
									What do I truly want?
								</Text>
								<Text className="text-purple-700 text-sm font-JakartaMedium">
									Reflect on your deepest desires and aspirations. What would bring you genuine
									fulfillment?
								</Text>
							</View>
							<View className="bg-purple-50 rounded-xl p-4">
								<Text className="text-purple-800 font-JakartaSemiBold mb-2">
									What am I grateful for?
								</Text>
								<Text className="text-purple-700 text-sm font-JakartaMedium">
									Consider the blessings in your life and the people who support you.
								</Text>
							</View>
							<View className="bg-purple-50 rounded-xl p-4">
								<Text className="text-purple-800 font-JakartaSemiBold mb-2">
									What am I learning?
								</Text>
								<Text className="text-purple-700 text-sm font-JakartaMedium">
									What insights have you gained recently? What patterns are you noticing?
								</Text>
							</View>
							<View className="bg-purple-50 rounded-xl p-4">
								<Text className="text-purple-800 font-JakartaSemiBold mb-2">
									What am I ready to release?
								</Text>
								<Text className="text-purple-700 text-sm font-JakartaMedium">
									What beliefs, habits, or situations are no longer serving your highest good?
								</Text>
							</View>
						</View>
					</View>

					{/* Benefits */}
					<View className="bg-purple-50 rounded-2xl p-6 border border-purple-100">
						<Text className="text-lg font-bold text-purple-800 mb-3">
							Benefits of Insight Practice
						</Text>
						<View className="space-y-2">
							<View className="flex-row items-center">
								<Ionicons name="checkmark-circle" size={16} color="#8B5CF6" />
								<Text className="text-purple-700 ml-2 font-JakartaMedium">
									Gain clarity about your goals
								</Text>
							</View>
							<View className="flex-row items-center">
								<Ionicons name="checkmark-circle" size={16} color="#8B5CF6" />
								<Text className="text-purple-700 ml-2 font-JakartaMedium">
									Strengthen self-confidence
								</Text>
							</View>
							<View className="flex-row items-center">
								<Ionicons name="checkmark-circle" size={16} color="#8B5CF6" />
								<Text className="text-purple-700 ml-2 font-JakartaMedium">
									Develop deeper self-awareness
								</Text>
							</View>
							<View className="flex-row items-center">
								<Ionicons name="checkmark-circle" size={16} color="#8B5CF6" />
								<Text className="text-purple-700 ml-2 font-JakartaMedium">
									Enhance decision-making skills
								</Text>
							</View>
						</View>
					</View>
				</Animated.View>
			</ScrollView>
		</>
	);
};

export default Insight;
