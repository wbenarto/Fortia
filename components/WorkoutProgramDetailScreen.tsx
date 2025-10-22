import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	Alert,
	RefreshControl,
	Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { fetchAPI } from '@/lib/fetch';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DeleteProgramModal from './DeleteProgramModal';

interface WorkoutProgram {
	id: number;
	program_name: string;
	program_goal: string;
	total_weeks: number;
	sessions_per_week: number;
	session_duration: number;
	workout_days: string[];
	available_equipment: string[];
	status: string;
	start_date: string;
	created_at: string;
	muscle_balance_target: any;
	currentWeek: number;
	sessions: WorkoutSession[];
}

interface WorkoutSession {
	id: number;
	title: string;
	week_number: number;
	session_number: number;
	session_duration: number;
	phase_name: string;
	completion_status: string;
	scheduled_date: string;
	warm_up_video_url: string;
}

export default function WorkoutProgramDetailScreen({ programId }: { programId?: string }) {
	console.log('programId:', programId);

	// Early return if programId is not provided
	if (!programId) {
		return (
			<View className="flex-1 bg-white items-center justify-center">
				<Text className="text-gray-500">Program ID not provided</Text>
			</View>
		);
	}

	const [program, setProgram] = useState<WorkoutProgram | null>(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [weeklyProgram, setWeeklyProgram] = useState<
		{ week: number; sessions: WorkoutSession[] }[] | null
	>(null);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const router = useRouter();
	const { user } = useUser();

	const insets = useSafeAreaInsets();

	const fetchProgram = async () => {
		if (!user) return;
		try {
			const result = await fetchAPI(
				`/api/workout-programs?clerkId=${user.id}&programId=${programId}`
			);

			if (result.success && result.data && result.data.length > 0) {
				setProgram(result.data[0]);
			} else {
				console.log('No program data found or empty array');
				Alert.alert('Error', 'Failed to fetch program');
			}
		} catch (error) {
			console.error(`Failed to fetch program of id ${programId}`);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	useEffect(() => {
		fetchProgram();
	}, [user, programId]);

	// Add this useEffect to group sessions when program changes
	useEffect(() => {
		console.log('Processing sessions for program:', program);
		console.log('Program sessions type:', typeof program?.sessions);
		console.log('Program sessions is array:', Array.isArray(program?.sessions));

		if (program?.sessions && Array.isArray(program.sessions) && program.sessions.length > 0) {
			console.log('Sessions to process:', program.sessions);
			console.log('First session structure:', program.sessions[0]);

			const groupSessionsByWeek = (sessions: WorkoutSession[]) => {
				console.log('Grouping sessions by week...');
				const grouped = sessions.reduce(
					(acc, session) => {
						console.log('Processing session:', session.title, 'Week:', session.week_number);
						const week = session.week_number;
						if (!acc[week]) {
							acc[week] = [];
						}
						acc[week].push(session);
						return acc;
					},
					{} as Record<number, WorkoutSession[]>
				);
				console.log('Grouped result:', grouped);

				const result = Object.entries(grouped)
					.map(([week, sessions]) => ({
						week: parseInt(week),
						sessions: sessions,
					}))
					.sort((a, b) => a.week - b.week);
				console.log('Final weekly sessions:', result);
				return result;
			};

			const weeklySessions = groupSessionsByWeek(program.sessions);
			console.log('Setting weekly program to:', weeklySessions);
			setWeeklyProgram(weeklySessions);
		} else {
			console.log('No sessions found or sessions is not an array or empty');
			console.log('Sessions value:', program?.sessions);
			setWeeklyProgram(null);
		}
	}, [program]);

	const startWorkout = (session: WorkoutSession) => {
		router.push(`/workout-session/${session.id}`);
	};

	const deleteProgram = async () => {
		if (!user || !program) return;

		setIsDeleting(true);
		try {
			const result = await fetchAPI(
				`/api/workout-programs?clerkId=${user.id}&programId=${program.id}`,
				{
					method: 'DELETE',
				}
			);

			if (result.success) {
				Alert.alert('Success', 'Program deleted successfully', [
					{
						text: 'OK',
						onPress: () => {
							router.back();
						},
					},
				]);
			} else {
				Alert.alert('Error', result.error || 'Failed to delete program');
			}
		} catch (error) {
			console.error('Failed to delete program:', error);
			Alert.alert('Error', 'Failed to delete program');
		} finally {
			setIsDeleting(false);
			setShowDeleteModal(false);
		}
	};

	if (loading) {
		return (
			<View className="flex-1 bg-white items-center justify-center">
				<Text className="text-gray-500">Loading programs...</Text>
			</View>
		);
	}

	if (!program) {
		return (
			<View className="flex-1 bg-white items-center justify-center">
				<Text className="text-gray-500">Program not found</Text>
			</View>
		);
	}

	// Debug: Log program sessions safely
	console.log('Program data:', program);
	if (program.sessions && program.sessions.length > 0) {
		console.log('Program sessions:', program.sessions);
		console.log('Sessions count:', program.sessions.length);
		console.log('First session:', program.sessions[0]);
		console.log(weeklyProgram);
	} else {
		console.log('No sessions found for program');
	}
	console.log('Weekly program state:', weeklyProgram);

	return (
		<ScrollView style={{ paddingTop: insets.top }} className="mb-10">
			<View className="flex-row relative items-center justify-between p-4 ">
				<TouchableOpacity className="" onPress={() => router.back()}>
					<Ionicons name="arrow-back" size={24} color="#black" />
				</TouchableOpacity>
				<Text className="text-xl text-center font-JakartaBold">{program.program_name}</Text>
				<TouchableOpacity onPress={() => setShowDeleteModal(!showDeleteModal)}>
					<Ionicons name="ellipsis-horizontal" size={24} />
				</TouchableOpacity>
			</View>
			<View className="px-4">
				<View className="flex-row justify-between mb-4 px-20">
					<View className="items-center">
						<Text className="text-xl text-black font-JakartaBold">{program.total_weeks}</Text>
						<Text className="text-xs text-black">Weeks</Text>
					</View>
					<View className="items-center">
						<Text className="text-xl text-black font-JakartaBold">{program.sessions_per_week}</Text>
						<Text className="text-xs text-black">Sessions/Week</Text>
					</View>
					<View className="items-center">
						<Text className="text-lg text-black font-JakartaBold ">{program.session_duration}</Text>
						<Text className="text-xs text-black">Mins</Text>
					</View>
				</View>
				<View className={`mb-4 py-2 rounded-lg border-[1px] border-black`}>
					<Text
						className={`text-center font-JakartaBold tracking-wider text-white  ${program.status === 'active' ? 'text-green-600' : 'bg-gray-800'}`}
					>
						{program.status.charAt(0).toUpperCase() + program.status.slice(1)}
					</Text>
				</View>
				<View className="flex-row items-center mb-3">
					<Text className=" mr-2">Equipment Required: </Text>
					<View className="flex-row flex-wrap gap-1">
						{program.available_equipment.map((e, i) => {
							return (
								<View
									key={i}
									className="px-4 py-1 self-start rounded-full border-[1px] border-gray-500"
								>
									<Text>{e}</Text>
								</View>
							);
						})}
					</View>
				</View>
				<View className="flex-row items-center">
					<Text className=" mr-2">Days Scheduled: </Text>
					<View className="flex-row flex-wrap space-x-1">
						{program.workout_days.map((e, i) => {
							return (
								<View
									key={i}
									className="px-4 py-1 self-start rounded-full border-[1px] border-gray-500"
								>
									<Text>{e}</Text>
								</View>
							);
						})}
					</View>
				</View>

				{/* Show message if no sessions exist */}
				{(!program?.sessions || program.sessions.length === 0) && (
					<View className="my-4 p-4 bg-blue-100 rounded-lg">
						<Text className="font-JakartaBold text-blue-800 mb-2">No Workout Sessions Found</Text>
						<Text className="text-blue-700 mb-3">
							This program doesn't have any workout sessions yet. Sessions are typically created
							when you generate an AI workout program.
						</Text>
						<TouchableOpacity
							onPress={() => router.push('/workout-program-creation')}
							className="bg-blue-500 px-4 py-2 rounded-lg self-start"
						>
							<Text className="text-white font-JakartaSemiBold">Create New Program</Text>
						</TouchableOpacity>
					</View>
				)}

				{weeklyProgram && weeklyProgram.length > 0 ? (
					weeklyProgram.map((e, i) => {
						return (
							<View key={i} className="my-2 px-2 ">
								<Text className="text-lg mb-1 font-JakartaBold">Week {e.week}</Text>
								{e.sessions.map(session => {
									return (
										<View
											key={session.id}
											className="flex-row  justify-between items-center border-[1px] border-solid border-gray-400 mb-2 p-1 px-2 rounded-xl"
										>
											<View>
												<Text className="font-JakartaSemiBold">{session.title}</Text>
												<Text>
													{new Date(session.scheduled_date).toLocaleDateString('en-US', {
														weekday: 'short',
														month: 'short',
														day: 'numeric',
													})}
												</Text>
												<Text>
													{session.completion_status === 'in_progress'
														? 'in progress'
														: session.completion_status}
												</Text>
											</View>

											<TouchableOpacity
												onPress={() => startWorkout(session)}
												className="flex-row items-center justify-between p-3 bg-green-400 rounded-lg "
											>
												<Text>Start Session</Text>
											</TouchableOpacity>
										</View>
									);
								})}
							</View>
						);
					})
				) : (
					<View className="my-4 p-4 bg-red-100 rounded-lg">
						<Text className="text-red-800 font-JakartaBold">No Weekly Sessions Found</Text>
						<Text className="text-red-700">Weekly Program: {JSON.stringify(weeklyProgram)}</Text>
						<Text className="text-red-700">
							Program Sessions: {JSON.stringify(program?.sessions)}
						</Text>

						{/* Fallback: Show sessions directly if weekly grouping failed */}
						{program?.sessions &&
							Array.isArray(program.sessions) &&
							program.sessions.length > 0 && (
								<View className="mt-4">
									<Text className="text-red-800 font-JakartaBold mb-2">
										Fallback: Direct Sessions Display
									</Text>
									{program.sessions.map((session, index) => (
										<View key={session.id || index} className="mb-2 p-2 bg-white rounded">
											<Text className="font-JakartaSemiBold">{session.title}</Text>
											<Text>Week: {session.week_number}</Text>
											<Text>Status: {session.completion_status}</Text>
											<Text>Date: {session.scheduled_date}</Text>
										</View>
									))}
								</View>
							)}
					</View>
				)}
			</View>

			<DeleteProgramModal
				visible={showDeleteModal}
				onClose={() => setShowDeleteModal(false)}
				onConfirm={deleteProgram}
				programName={program?.program_name || ''}
				isDeleting={isDeleting}
			/>
		</ScrollView>
	);
}
