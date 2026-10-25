import { memo, useCallback, useRef, useState } from 'react';
import {
	FlatList,
	Text,
	View,
	type LayoutChangeEvent,
	type NativeScrollEvent,
	type NativeSyntheticEvent,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

const ACCENT = '#E3BBA1';
const TICK_SPACING = 10; // px per 0.1 step
const TICKS_PER_UNIT = 10;
const UNIT_WIDTH = TICK_SPACING * TICKS_PER_UNIT;

const round1 = (value: number) => Math.round(value * 10) / 10;

// One whole unit (e.g. 150 → 150.9): a labelled major tick plus nine minor ticks.
// Rendering per unit instead of per tick keeps the list to a few hundred items.
const UnitSegment = memo(({ unit }: { unit: number }) => (
	<View style={{ width: UNIT_WIDTH, height: 64 }}>
		<View className="flex-row items-start" style={{ height: 36 }}>
			{Array.from({ length: TICKS_PER_UNIT }, (_, i) => (
				<View key={i} style={{ width: TICK_SPACING }}>
					<View
						style={{
							width: i === 0 ? 2 : 1,
							height: i === 0 ? 32 : i === 5 ? 22 : 14,
							borderRadius: 1,
							backgroundColor: i === 0 ? '#94897E' : '#D8CFC6',
						}}
					/>
				</View>
			))}
		</View>
		{unit % 5 === 0 && (
			<Text
				className="font-JakartaSemiBold text-[11px] text-[#94897E]"
				style={{ position: 'absolute', top: 40, left: -20, width: 40, textAlign: 'center' }}
			>
				{unit}
			</Text>
		)}
	</View>
));

// Horizontal ruler picker in 0.1 steps. Swipe left/right to change the value; the
// accent line in the middle marks the selection. `value` is only read on mount,
// so remount (e.g. via `key`) to jump to a different starting value.
const WeightRuler = ({
	value,
	min,
	max,
	unit,
	onChange,
}: {
	value: number;
	min: number;
	max: number;
	unit: string;
	onChange: (value: number) => void;
}) => {
	const [width, setWidth] = useState(0);
	const [current, setCurrent] = useState(() => round1(Math.min(max, Math.max(min, value))));
	const lastValue = useRef(current);
	const listRef = useRef<FlatList<number>>(null);

	const units = useRef(
		Array.from({ length: Math.floor(max) - Math.ceil(min) + 1 }, (_, i) => Math.ceil(min) + i)
	).current;
	const start = units[0];
	const initialOffset = (current - start) * TICKS_PER_UNIT * TICK_SPACING;

	const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

	const onScroll = useCallback(
		(e: NativeSyntheticEvent<NativeScrollEvent>) => {
			const steps = Math.round(e.nativeEvent.contentOffset.x / TICK_SPACING);
			const next = round1(Math.min(max, Math.max(min, start + steps / TICKS_PER_UNIT)));
			if (next === lastValue.current) return;
			lastValue.current = next;
			setCurrent(next);
			onChange(next);
			Haptics.selectionAsync().catch(() => {});
		},
		[min, max, start, onChange]
	);

	return (
		<View>
			<View className="flex-row items-baseline justify-center mb-4">
				<Text className="font-JakartaExtraBold text-[44px] text-[#262135]">
					{current.toFixed(1)}
				</Text>
				<Text className="font-JakartaSemiBold text-base text-[#94897E] ml-1.5">{unit}</Text>
			</View>

			<View onLayout={onLayout} style={{ height: 64 }}>
				{width > 0 && (
					<FlatList
						data={units}
						keyExtractor={item => String(item)}
						renderItem={({ item }) => <UnitSegment unit={item} />}
						horizontal
						showsHorizontalScrollIndicator={false}
						getItemLayout={(_, index) => ({
							length: UNIT_WIDTH,
							offset: UNIT_WIDTH * index,
							index,
						})}
						// Half-width padding on both sides lines the first/last tick up with the centre marker
						contentContainerStyle={{ paddingHorizontal: width / 2 }}
						ref={listRef}
						// Render around the starting unit, then nudge to the exact tenth
						initialScrollIndex={Math.floor(current) - start}
						onLayout={() =>
							listRef.current?.scrollToOffset({ offset: initialOffset, animated: false })
						}
						initialNumToRender={Math.ceil(width / UNIT_WIDTH) + 2}
						windowSize={7}
						snapToInterval={TICK_SPACING}
						decelerationRate="fast"
						onScroll={onScroll}
						scrollEventThrottle={16}
					/>
				)}
				{/* Centre marker */}
				<View
					pointerEvents="none"
					style={{
						position: 'absolute',
						left: width / 2 - 1.5,
						top: -6,
						width: 3,
						height: 44,
						borderRadius: 2,
						backgroundColor: ACCENT,
					}}
				/>
			</View>

			{/* Fade the ruler edges into the card */}
			<LinearGradient
				pointerEvents="none"
				colors={['#FFFFFF', '#FFFFFF00']}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 0 }}
				style={{ position: 'absolute', left: 0, bottom: 0, width: 48, height: 64 }}
			/>
			<LinearGradient
				pointerEvents="none"
				colors={['#FFFFFF00', '#FFFFFF']}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 0 }}
				style={{ position: 'absolute', right: 0, bottom: 0, width: 48, height: 64 }}
			/>
		</View>
	);
};

export default WeightRuler;
