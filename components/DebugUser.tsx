import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { fetchAPI } from '@/lib/fetch';

const DebugUser = () => {
	const { user } = useUser();
	const [isLoading, setIsLoading] = useState(false);

	const debugUser = async () => {
		if (!user?.id) {
			Alert.alert('Error', 'No user ID available');
			return;
		}

		setIsLoading(true);
		try {
			// Debug user info
			const userResponse = await fetchAPI(`/(api)/user?clerkId=${user.id}`, {
				method: 'GET',
			});

			// Debug meals
			const mealsResponse = await fetchAPI(`/(api)/meals?clerkId=${user.id}`, {
				method: 'PATCH',
			});

			const debugInfo = {
				clerkUser: {
					id: user.id,
					firstName: user.firstName,
					lastName: user.lastName,
					email: user.emailAddresses?.[0]?.emailAddress,
				},
				userAPI: userResponse,
				mealsAPI: mealsResponse,
			};

			console.log('Debug Info:', JSON.stringify(debugInfo, null, 2));
			Alert.alert('Debug Info', 'Check console for detailed debug information');
		} catch (error) {
			console.error('Debug error:', error);
			Alert.alert('Error', 'Failed to get debug info');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<View className="p-4">
			<TouchableOpacity
				onPress={debugUser}
				disabled={isLoading}
				className="bg-red-500 p-3 rounded-lg"
			>
				<Text className="text-white text-center font-bold">
					{isLoading ? 'Debugging...' : 'Debug User (Check Console)'}
				</Text>
			</TouchableOpacity>
			<Text className="text-white text-xs mt-2">User ID: {user?.id || 'Not available'}</Text>
		</View>
	);
};

export default DebugUser;
