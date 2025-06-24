import { Stack, Tabs } from 'expo-router';
import { View, Image, ImageSourcePropType } from 'react-native';
import { icons } from '@/constants/index';
import { Ionicons } from '@expo/vector-icons';

const TabIcon = ({
	iconName,
	source,
	focused,
}: {
	iconName?: string;
	source?: ImageSourcePropType;
	focused: boolean;
}) => (
	<View
		className={`flex flex-row justify-center w-14 h-14 items-center rounded-full ${focused ? 'bg-general-300' : 'bg-gray-400'}`}
	>
		<View
			className={`rounded-full w-14 h-14 items-center justify-center ${focused ? 'bg-general-300' : 'bg-gray-[#2C263A]'}`}
		>
			{iconName ? (
				<Ionicons name={iconName as any} size={28} color="#5A556B" />
			) : (
				<Image source={source!} tintColor="#5A556B" resizeMode="contain" className="w-7 h-7" />
			)}
		</View>
	</View>
);

const Layout = () => {
	return (
		<Tabs
			initialRouteName="home"
			screenOptions={{
				tabBarActiveTintColor: 'white',
				tabBarInactiveTintColor: 'white',
				tabBarShowLabel: false,
				tabBarStyle: {
					backgroundColor: '#5A556B',
					display: 'none',
					borderRadius: 50,
					marginHorizontal: 40,
					overflow: 'hidden',
					padding: 0,
					marginBottom: 20,
					height: 80,
					flexDirection: 'row',
					justifyContent: 'space-between',
					alignItems: 'center',
					position: 'absolute',
				},
			}}
		>
			<Tabs.Screen
				name="home"
				options={{
					title: 'Home',
					headerShown: false,
					tabBarIcon: ({ focused }) => <TabIcon focused={focused} iconName="stats-chart" />,
				}}
			/>
			<Tabs.Screen
				name="meal"
				options={{
					title: 'Meal',
					headerShown: false,
					tabBarIcon: ({ focused }) => <TabIcon focused={focused} iconName="fast-food" />,
				}}
			/>
			<Tabs.Screen
				name="calendar"
				options={{
					title: 'Calendar',
					headerShown: false,
					tabBarIcon: ({ focused }) => <TabIcon focused={focused} iconName="barbell" />,
				}}
			/>
			<Tabs.Screen
				name="profile"
				options={{
					title: 'Profile',
					headerShown: false,
					tabBarIcon: ({ focused }) => <TabIcon focused={focused} iconName="person-circle" />,
				}}
			/>
		</Tabs>
	);
};

export default Layout;
