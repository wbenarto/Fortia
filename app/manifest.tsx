import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

const { width } = Dimensions.get('window');

export default function ManifestPage() {
	const [isTimerRunning, setIsTimerRunning] = useState(false);
	const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
	const [currentTechnique, setCurrentTechnique] = useState(0);
	const soundRef = useRef<Audio.Sound | null>(null);

	const techniques = [
		{
			title: 'Visualization',
			description:
				"Close your eyes and vividly imagine your desired outcome as if it's already happening. Feel the emotions, see the details, and experience the reality of your manifestation.",
			steps: [
				'Find a comfortable position',
				'Take 3 deep breaths',
				'Visualize your goal in detail',
				'Feel the emotions of success',
				'Hold this vision for 2-3 minutes',
			],
		},
		{
			title: 'Affirmation Power',
			description:
				'Use powerful, present-tense affirmations to reprogram your subconscious mind and align your energy with your desires.',
			steps: [
				'Choose 3 powerful affirmations',
				'Speak them with conviction',
				'Feel the truth in each word',
				'Repeat for 2-3 minutes',
				'Believe in your words',
			],
		},
		{
			title: 'Gratitude Manifestation',
			description:
				"Express deep gratitude for what you already have while feeling the energy of what you're manifesting coming into your life.",
			steps: [
				"List 5 things you're grateful for",
				'Feel the gratitude deeply',
				'Express thanks for future blessings',
				'Feel the abundance flowing',
				'Trust in divine timing',
			],
		},
	];

	// Load sound on component mount
	useEffect(() => {
		const loadSound = async () => {
			try {
				const { sound } = await Audio.Sound.createAsync(
					require('@/assets/sounds/gong-hit-small-gfx-sounds-4-4-00-06.mp3')
				);
				soundRef.current = sound;
			} catch (error) {
				console.log('Error loading sound:', error);
			}
		};
		loadSound();

		return () => {
			if (soundRef.current) {
				soundRef.current.unloadAsync();
			}
		};
	}, []);

	useEffect(() => {
		let interval: NodeJS.Timeout;
		if (isTimerRunning && timeLeft > 0) {
			interval = setInterval(async () => {
				setTimeLeft(prev => {
					const newTime = prev - 1;
					if (newTime <= 0) {
						setIsTimerRunning(false);

						// Play gong sound
						if (soundRef.current) {
							soundRef.current.replayAsync().catch(error => {
								console.log('Error playing sound:', error);
							});
						}
					}
					return newTime;
				});
			}, 1000);
		}
		return () => clearInterval(interval);
	}, [isTimerRunning, timeLeft]);

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	};

	const startTimer = () => {
		setIsTimerRunning(true);
	};

	const pauseTimer = () => {
		setIsTimerRunning(false);
	};

	const resetTimer = () => {
		setIsTimerRunning(false);
		setTimeLeft(300);
	};

	const nextTechnique = () => {
		setCurrentTechnique(prev => (prev + 1) % techniques.length);
	};

	const prevTechnique = () => {
		setCurrentTechnique(prev => (prev - 1 + techniques.length) % techniques.length);
	};

	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<ScrollView className="flex-1 bg-[#e4e6a3]" showsVerticalScrollIndicator={false}>
				{/* Header */}
				<View className="flex flex-row items-center justify-between px-5 pt-16 pb-5  border-b border-gray-700">
					<TouchableOpacity onPress={() => router.back()} className="p-2">
						<Ionicons name="arrow-back" size={24} color="#1F2937" />
					</TouchableOpacity>
					<Text className="text-xl font-semibold text-gray-800">Manifest Your Dreams</Text>
					<View className="w-10" />
				</View>

				{/* Timer Section */}
				<View className="mx-5 mt-5 p-6 bg-white rounded-2xl shadow-sm border border-gray-200">
					<Text className="text-base font-medium text-gray-600 text-center mb-3">
						Manifestation Timer
					</Text>
					<Text className="text-5xl font-bold text-gray-800 text-center mb-5">
						{formatTime(timeLeft)}
					</Text>
					<View className="flex flex-row justify-center items-center space-x-4">
						{!isTimerRunning ? (
							<TouchableOpacity
								onPress={startTimer}
								className="flex flex-row items-center bg-green-500 px-6 py-3 rounded-xl space-x-2"
							>
								<Ionicons name="play" size={20} color="white" />
								<Text className="text-white font-semibold text-base">Start</Text>
							</TouchableOpacity>
						) : (
							<TouchableOpacity
								onPress={pauseTimer}
								className="flex flex-row items-center bg-yellow-500 px-6 py-3 rounded-xl space-x-2"
							>
								<Ionicons name="pause" size={20} color="white" />
								<Text className="text-white font-semibold text-base">Pause</Text>
							</TouchableOpacity>
						)}
					</View>
				</View>

				{/* Technique Section */}
				<View className="mx-5 mt-5 p-6 bg-white rounded-2xl shadow-sm border border-gray-200">
					<View className="flex flex-row justify-between items-center mb-4">
						<Text className="text-xl font-semibold text-gray-800 flex-1">
							{techniques[currentTechnique].title}
						</Text>
						<View className="flex flex-row items-center space-x-3">
							<TouchableOpacity onPress={prevTechnique} className="p-2 bg-gray-100 rounded-lg">
								<Ionicons name="chevron-back" size={20} color="#6B7280" />
							</TouchableOpacity>
							<Text className="text-sm text-gray-600 font-medium">
								{currentTechnique + 1}/{techniques.length}
							</Text>
							<TouchableOpacity onPress={nextTechnique} className="p-2 bg-gray-100 rounded-lg">
								<Ionicons name="chevron-forward" size={20} color="#6B7280" />
							</TouchableOpacity>
						</View>
					</View>

					<Text className="text-base text-gray-600 leading-6 mb-5">
						{techniques[currentTechnique].description}
					</Text>

					<View className="mt-4">
						<Text className="text-lg font-semibold text-gray-800 mb-4">Practice Steps:</Text>
						{techniques[currentTechnique].steps.map((step, index) => (
							<View key={index} className="flex flex-row items-start mb-3 space-x-3">
								<View className="w-6 h-6 rounded-full bg-green-500 items-center justify-center mt-0.5">
									<Text className="text-white text-xs font-semibold">{index + 1}</Text>
								</View>
								<Text className="flex-1 text-sm text-gray-600 leading-5">{step}</Text>
							</View>
						))}
					</View>
				</View>

				{/* Manifestation Tips */}
				<View className="mx-5 mt-5 p-6 bg-white rounded-2xl shadow-sm border border-gray-200">
					<Text className="text-lg font-semibold text-gray-800 mb-4">✨ Manifestation Tips</Text>
					<View className="flex flex-row items-center mb-3 space-x-3">
						<Ionicons name="heart" size={16} color="#10B981" />
						<Text className="flex-1 text-sm text-gray-600 leading-5">
							Feel the emotions of your desired outcome
						</Text>
					</View>
					<View className="flex flex-row items-center mb-3 space-x-3">
						<Ionicons name="eye" size={16} color="#10B981" />
						<Text className="flex-1 text-sm text-gray-600 leading-5">
							Visualize with vivid detail and clarity
						</Text>
					</View>
					<View className="flex flex-row items-center mb-3 space-x-3">
						<Ionicons name="checkmark-circle" size={16} color="#10B981" />
						<Text className="flex-1 text-sm text-gray-600 leading-5">
							Believe it's already yours
						</Text>
					</View>
					<View className="flex flex-row items-center space-x-3">
						<Ionicons name="leaf" size={16} color="#10B981" />
						<Text className="flex-1 text-sm text-gray-600 leading-5">
							Let go and trust the universe
						</Text>
					</View>
				</View>

				{/* Daily Practice Reminder */}
				<View className="mx-5 mt-5 mb-10 p-5 bg-yellow-50 rounded-2xl border border-yellow-200 flex flex-row items-start space-x-3">
					<Ionicons name="star" size={24} color="#F59E0B" />
					<Text className="flex-1 text-sm text-yellow-800 leading-5 font-medium">
						Practice manifestation daily for 5-10 minutes to strengthen your manifesting abilities
						and align with your highest potential.
					</Text>
				</View>
			</ScrollView>
		</>
	);
}
