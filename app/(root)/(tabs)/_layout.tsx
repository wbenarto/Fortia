import { withLayoutContext } from 'expo-router';
import { View, Image, ImageSourcePropType, StyleSheet, TouchableOpacity } from 'react-native';
import {
	createMaterialTopTabNavigator,
	type MaterialTopTabBarProps,
	type MaterialTopTabNavigationEventMap,
	type MaterialTopTabNavigationOptions,
} from '@react-navigation/material-top-tabs';
import type { ParamListBase, TabNavigationState } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { icons } from '@/constants/index';
import { Ionicons } from '@expo/vector-icons';
import QuickLogButton from '@/components/QuickLogButton';
import { SCREEN_BG } from '@/lib/theme';

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
		className={`flex flex-row justify-center overflow-hidden items-center rounded-full ${focused ? 'bg-general-300 w-12 h-12' : 'w-10 h-10'}`}
	>
		<View
			className={`rounded-full items-center justify-center ${focused ? 'bg-white w-12 h-12 border-2 border-[#E3BBA1]' : 'w-10 h-10'}`}
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
		{!focused && (
			<BlurView
				intensity={40}
				tint="dark"
				style={{
					position: 'absolute',
					width: '100%',
					height: '100%',
					opacity: 0.3,
				}}
			/>
		)}
	</View>
);

// Pager-backed tabs so a horizontal swipe moves to the adjacent screen. Bottom tabs
// can't do this; material-top-tabs can, with our own floating pill as the tab bar.
const { Navigator } = createMaterialTopTabNavigator();
const Tabs = withLayoutContext<
	MaterialTopTabNavigationOptions,
	typeof Navigator,
	TabNavigationState<ParamListBase>,
	MaterialTopTabNavigationEventMap
>(Navigator);

const TAB_ICONS: Record<string, string> = {
	home: 'stats-chart',
	meal: 'fast-food',
	workout: 'barbell',
	social: 'earth-outline',
};

const FloatingTabBar = ({ state, descriptors, navigation }: MaterialTopTabBarProps) => (
	<View
		style={{
			position: 'absolute',
			left: 20,
			right: 120, // clears the + button (QuickLogButton)
			bottom: 20,
			height: 60,
			borderRadius: 50,
			overflow: 'hidden',
		}}
	>
		<BlurView intensity={20} tint="light" style={[StyleSheet.absoluteFill, { borderRadius: 50 }]} />
		<View className="flex-1 flex-row items-center justify-around">
			{state.routes.map((route, index) => {
				const focused = state.index === index;
				const onPress = () => {
					const event = navigation.emit({
						type: 'tabPress',
						target: route.key,
						canPreventDefault: true,
					});
					if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
				};
				return (
					<TouchableOpacity
						key={route.key}
						onPress={onPress}
						activeOpacity={0.8}
						accessibilityRole="button"
						accessibilityState={focused ? { selected: true } : {}}
						accessibilityLabel={descriptors[route.key].options.title}
					>
						<TabIcon focused={focused} iconName={TAB_ICONS[route.name]} />
					</TouchableOpacity>
				);
			})}
		</View>
	</View>
);

const Layout = () => {
	return (
		<View style={{ flex: 1 }}>
			<Tabs
				initialRouteName="home"
				tabBarPosition="bottom"
				tabBar={props => <FloatingTabBar {...props} />}
				screenOptions={{
					sceneStyle: { backgroundColor: SCREEN_BG },
					// Mount lazily, but keep the neighbours ready so a swipe never lands on a blank screen
					lazy: true,
					lazyPreloadDistance: 1,
				}}
			>
				<Tabs.Screen name="home" options={{ title: 'Home' }} />
				<Tabs.Screen name="meal" options={{ title: 'Meal' }} />
				<Tabs.Screen name="workout" options={{ title: 'Workout' }} />
				<Tabs.Screen name="social" options={{ title: 'Social' }} />
			</Tabs>
			<QuickLogButton />
		</View>
	);
};

export default Layout;
