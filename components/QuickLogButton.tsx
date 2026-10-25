import { useState } from 'react';
import { View, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuickLogStore, type QuickLogType } from '@/store';
import NewWorkoutModal from '@/components/NewWorkoutModal';
import FoodLookupModal from '@/components/FoodLookupModal';

const FAB_SIZE = 64;
const BADGE_SIZE = 54;
// FAB offset from the wrap's bottom-right corner — the badge fan is anchored to
// the FAB centre, so nudging these moves the whole cluster together.
const FAB_RIGHT = 10;
const FAB_BOTTOM = -20;
// Small food-lookup button stacked just above the FAB
const SEARCH_SIZE = 40;
const SEARCH_GAP = 12;
const RADIUS = 124;
// Degrees measured from straight up, sweeping down toward horizontal-left.
const ANGLES = [8, 44, 80];

const OPTIONS: {
	key: QuickLogType;
	icon: keyof typeof Ionicons.glyphMap;
	color: string;
}[] = [
	{ key: 'meal', icon: 'restaurant', color: '#7DB88A' },
	{ key: 'weight', icon: 'scale-outline', color: '#8FA9BA' },
	{ key: 'activity', icon: 'barbell', color: '#E3BBA1' },
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

			<View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + 40 }]}>
				{open &&
					OPTIONS.map((opt, i) => {
						const rad = (ANGLES[i] * Math.PI) / 180;
						const right = FAB_RIGHT + FAB_SIZE / 2 + RADIUS * Math.sin(rad) - BADGE_SIZE / 2;
						const bottom = FAB_BOTTOM + FAB_SIZE / 2 + RADIUS * Math.cos(rad) - BADGE_SIZE / 2;
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
									style={[styles.badge, { backgroundColor: opt.color }]}
								>
									<Ionicons name={opt.icon} size={24} color="#FFFFFF" />
								</TouchableOpacity>
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

				<TouchableOpacity activeOpacity={0.85} onPress={() => setOpen(v => !v)} style={styles.fab}>
					<Ionicons name={open ? 'close' : 'add'} size={32} color="#FFFFFF" />
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
		backgroundColor: 'rgba(15,12,20,0.48)',
	},
	wrap: {
		position: 'absolute',
		right: 20,
		width: 200,
		height: 190,
	},
	fab: {
		position: 'absolute',
		right: FAB_RIGHT,
		bottom: FAB_BOTTOM,
		width: FAB_SIZE,
		height: FAB_SIZE,
		borderRadius: FAB_SIZE / 2,
		backgroundColor: '#E3BBA1',
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#6B5344',
		shadowOffset: { width: 0, height: 6 },
		shadowOpacity: 0.35,
		shadowRadius: 10,
		elevation: 8,
	},
	searchSlot: {
		position: 'absolute',
		right: FAB_RIGHT + (FAB_SIZE - SEARCH_SIZE) / 2,
		bottom: FAB_BOTTOM + FAB_SIZE + SEARCH_GAP,
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
	badge: {
		width: BADGE_SIZE,
		height: BADGE_SIZE,
		borderRadius: BADGE_SIZE / 2,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#3A2E28',
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.22,
		shadowRadius: 6,
		elevation: 4,
	},
});

export default QuickLogButton;
