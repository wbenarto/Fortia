import { useState } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuickLogStore, type QuickLogType } from '@/store';
import NewWorkoutModal from '@/components/NewWorkoutModal';
import FoodLookupModal from '@/components/FoodLookupModal';

// Round gradient + button
const FAB_WIDTH = 60;
const FAB_HEIGHT = 60;
const BADGE_SIZE = 54;
const BADGE_LABEL_WIDTH = 72;
// FAB offset from the wrap's bottom-right corner — the badge fan is anchored to
// the FAB centre, so nudging these moves the whole cluster together.
const FAB_RIGHT = 10;
// Inside the wrap (not negative): touches outside the wrap's bounds don't register on iOS
const FAB_BOTTOM = 0;
// Small food-lookup button stacked just above the FAB
const SEARCH_SIZE = 40;
const SEARCH_GAP = 12;
const RADIUS = 150;
// Degrees measured from straight up, sweeping down toward horizontal-left.
const ANGLES = [8, 44, 80];

// The + button and the three log options share this warm terracotta gradient
const BUTTON_GRADIENT = ['#E9A27E', '#C9754F'] as const;

const OPTIONS: {
	key: QuickLogType;
	icon: keyof typeof Ionicons.glyphMap;
	label: string;
	nudgeX?: number; // fine-tune: px to the right of its arc position
}[] = [
	{ key: 'meal', icon: 'restaurant', label: 'Meal' },
	{ key: 'weight', icon: 'scale-outline', label: 'Weight', nudgeX: 8 },
	{ key: 'activity', icon: 'barbell', label: 'Exercise' },
];

const QuickLogButton = () => {
	const [open, setOpen] = useState(false);
	const [activityModal, setActivityModal] = useState(false);
	const [lookupModal, setLookupModal] = useState(false);
	const insets = useSafeAreaInsets();
	const router = useRouter();
	const requestLog = useQuickLogStore(s => s.requestLog);

	const handleOption = (key: QuickLogType) => {
		setOpen(false);
		if (key === 'meal') {
			// Opens the meal modal on the current screen (home / meal both host it).
			requestLog('meal');
			// Drop the request if no screen picked it up (e.g. workout / social tab).
			setTimeout(() => {
				if (useQuickLogStore.getState().pending === 'meal') {
					useQuickLogStore.getState().consume();
				}
			}, 600);
		} else if (key === 'weight') {
			requestLog('weight');
			router.push('/(root)/(tabs)/home');
		} else {
			setActivityModal(true);
		}
	};

	return (
		<>
			{open && (
				<Animated.View
					entering={FadeIn.duration(280)}
					exiting={FadeOut.duration(260)}
					style={StyleSheet.absoluteFill}
				>
					<Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
				</Animated.View>
			)}

			<View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + 22 }]}>
				{open &&
					OPTIONS.map((opt, i) => {
						const rad = (ANGLES[i] * Math.PI) / 180;
						const right =
							FAB_RIGHT +
							FAB_WIDTH / 2 +
							RADIUS * Math.sin(rad) -
							BADGE_SIZE / 2 -
							(opt.nudgeX ?? 0);
						const bottom = FAB_BOTTOM + FAB_HEIGHT / 2 + RADIUS * Math.cos(rad) - BADGE_SIZE / 2;
						return (
							<Animated.View
								key={opt.key}
								entering={ZoomIn.duration(320).delay(i * 70)}
								exiting={ZoomOut.duration(240).delay((OPTIONS.length - 1 - i) * 45)}
								style={[styles.badgeSlot, { right, bottom }]}
							>
								<TouchableOpacity
									activeOpacity={0.85}
									onPress={() => handleOption(opt.key)}
									style={styles.badge}
									accessibilityRole="button"
									accessibilityLabel={`Log ${opt.label.toLowerCase()}`}
								>
									<LinearGradient
										colors={BUTTON_GRADIENT}
										start={{ x: 0, y: 0 }}
										end={{ x: 1, y: 1 }}
										style={styles.badgeFill}
									>
										<Ionicons name={opt.icon} size={24} color="#FFFFFF" />
									</LinearGradient>
								</TouchableOpacity>
								{/* Positioned under the badge so it doesn't shift the fan layout */}
								<Text pointerEvents="none" style={styles.badgeLabel} numberOfLines={1}>
									{opt.label}
								</Text>
							</Animated.View>
						);
					})}

				{!open && (
					<Animated.View
						entering={FadeIn.duration(200)}
						exiting={FadeOut.duration(120)}
						style={styles.searchSlot}
					>
						<TouchableOpacity
							activeOpacity={0.85}
							onPress={() => setLookupModal(true)}
							style={styles.search}
							accessibilityRole="button"
							accessibilityLabel="Look up food"
						>
							<Ionicons name="search" size={18} color="#262135" />
						</TouchableOpacity>
					</Animated.View>
				)}

				<TouchableOpacity
					activeOpacity={0.85}
					onPress={() => setOpen(v => !v)}
					style={styles.fab}
					accessibilityRole="button"
					accessibilityLabel={open ? 'Close log menu' : 'Log'}
				>
					<LinearGradient
						colors={BUTTON_GRADIENT}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 1 }}
						style={styles.fabFill}
					>
						<Ionicons name={open ? 'close' : 'add'} size={32} color="#FFFFFF" />
					</LinearGradient>
				</TouchableOpacity>
			</View>

			<NewWorkoutModal isVisible={activityModal} onClose={() => setActivityModal(false)} />
			<FoodLookupModal isVisible={lookupModal} onClose={() => setLookupModal(false)} />
		</>
	);
};

const styles = StyleSheet.create({
	backdrop: {
		flex: 1,
		backgroundColor: 'rgba(15,12,20,0.75)',
	},
	wrap: {
		position: 'absolute',
		right: 20,
		// Must contain every badge: touches outside the wrap's bounds don't register on iOS
		width: 250,
		height: 230,
	},
	fab: {
		position: 'absolute',
		right: FAB_RIGHT,
		bottom: FAB_BOTTOM,
		width: FAB_WIDTH,
		height: FAB_HEIGHT,
		borderRadius: FAB_HEIGHT / 2,
		shadowColor: '#96502D',
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.4,
		shadowRadius: 12,
		elevation: 8,
	},
	fabFill: {
		flex: 1,
		borderRadius: FAB_HEIGHT / 2,
		alignItems: 'center',
		justifyContent: 'center',
	},
	searchSlot: {
		position: 'absolute',
		right: FAB_RIGHT + (FAB_WIDTH - SEARCH_SIZE) / 2,
		bottom: FAB_BOTTOM + FAB_HEIGHT + SEARCH_GAP,
	},
	search: {
		width: SEARCH_SIZE,
		height: SEARCH_SIZE,
		borderRadius: SEARCH_SIZE / 2,
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#F0EBE6',
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#3A2E28',
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.15,
		shadowRadius: 6,
		elevation: 3,
	},
	badgeSlot: {
		position: 'absolute',
	},
	badgeLabel: {
		position: 'absolute',
		top: BADGE_SIZE + 5,
		left: (BADGE_SIZE - BADGE_LABEL_WIDTH) / 2,
		width: BADGE_LABEL_WIDTH,
		textAlign: 'center',
		color: '#FFFFFF',
		fontFamily: 'Jakarta-SemiBold',
		fontSize: 12,
		textShadowColor: 'rgba(0,0,0,0.35)',
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 3,
	},
	badgeFill: {
		flex: 1,
		borderRadius: BADGE_SIZE / 2,
		alignItems: 'center',
		justifyContent: 'center',
	},
	badge: {
		width: BADGE_SIZE,
		height: BADGE_SIZE,
		borderRadius: BADGE_SIZE / 2,
		shadowColor: '#3A2E28',
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.22,
		shadowRadius: 6,
		elevation: 4,
	},
});

export default QuickLogButton;
