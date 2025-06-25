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
		className={`flex flex-row justify-centeritems-center rounded-full ${focused ? 'bg-general-300 w-12 h-12' : 'bg-white w-10 h-10'}`}
	>
		<View
			className={`rounded-full  items-center justify-center ${focused ? 'bg-white w-12 h-12' : 'bg-general-300 w-10 h-10'}`}
		>
			{iconName ? (
				<Ionicons
					name={iconName as any}
					size={focused ? 24 : 20}
					color={focused ? '#E3BBA1' : 'gray'}
				/>
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
					backgroundColor: '#E3BBA1',
					display: 'flex',
					borderRadius: 50,
					marginHorizontal: 20,
					marginRight: 120,
					paddingTop: 5,
					overflow: 'hidden',
					padding: 0,
					marginBottom: 20,
					height: 60,
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
