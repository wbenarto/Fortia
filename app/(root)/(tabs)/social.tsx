import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SignedIn, SignedOut, useUser, useAuth } from '@clerk/clerk-expo';
import { useState } from 'react';
import Navbar from '@/components/Navbar';
import ScreenBackground from '@/components/ScreenBackground';
import { Ionicons } from '@expo/vector-icons';

type SocialTabType = 'challenges' | 'friends';

const Social = () => {
	const [activeTab, setActiveTab] = useState<SocialTabType>('challenges');

	return (
		<ScreenBackground>
			<SignedIn>
				<Navbar />

				{/* Tab Navigation */}
				<View className="px-4 mt-4">
					<View className="flex flex-row bg-gray-100 rounded-xl p-1">
						<TouchableOpacity
							onPress={() => setActiveTab('challenges')}
							className={`flex-1 py-3 rounded-lg ${
								activeTab === 'challenges' ? 'bg-[#E3BBA1]' : 'bg-transparent'
							}`}
						>
							<View className="flex flex-row items-center justify-center">
								<Ionicons
									name="trophy-outline"
									size={20}
									color={activeTab === 'challenges' ? 'white' : 'gray'}
								/>
								<Text
									className={`ml-2 font-JakartaSemiBold ${
										activeTab === 'challenges' ? 'text-white' : 'text-gray-700'
									}`}
								>
									Challenges
								</Text>
							</View>
						</TouchableOpacity>

						<TouchableOpacity
							onPress={() => setActiveTab('friends')}
							className={`flex-1 py-3 rounded-lg ${
								activeTab === 'friends' ? 'bg-[#E3BBA1]' : 'bg-transparent'
							}`}
						>
							<View className="flex flex-row items-center justify-center">
								<Ionicons
									name="people-outline"
									size={20}
									color={activeTab === 'friends' ? 'white' : 'gray'}
								/>
								<Text
									className={`ml-2 font-JakartaSemiBold ${
										activeTab === 'friends' ? 'text-white' : 'text-gray-700'
									}`}
								>
									Friends
								</Text>
							</View>
						</TouchableOpacity>
					</View>
				</View>

				{/* Tab Content */}
				<ScrollView className="flex-1 px-4 mt-4 bg-transparent">
					{activeTab === 'challenges' && (
						<View>
							<Text className="text-lg font-JakartaSemiBold mb-4">Challenges</Text>
							<View className="bg-gray-50 p-4 rounded-xl">
								<Text className="text-gray-700 text-center">No active challenges yet</Text>
							</View>
						</View>
					)}

					{activeTab === 'friends' && (
						<View>
							<Text className="text-lg font-JakartaSemiBold mb-4">Friends</Text>
							<View className="bg-gray-50 p-4 rounded-xl">
								<Text className="text-gray-700 text-center">No friends added yet</Text>
							</View>
						</View>
					)}
				</ScrollView>
			</SignedIn>
		</ScreenBackground>
	);
};

export default Social;
