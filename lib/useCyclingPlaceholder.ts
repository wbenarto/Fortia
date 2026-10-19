import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';

const CYCLE_MS = 2400;
const FADE_MS = 220;

// Cycles through `count` placeholder examples with a quick fade, so people see what
// kind of input we're after instead of staring at a blank field. Render the example at
// `index` in an Animated.Text with `opacity` over an empty input.
export const useCyclingPlaceholder = (count: number) => {
	const [index, setIndex] = useState(0);
	const opacity = useRef(new Animated.Value(1)).current;

	useEffect(() => {
		const timer = setInterval(() => {
			Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(
				() => {
					setIndex(i => (i + 1) % count);
					Animated.timing(opacity, {
						toValue: 1,
						duration: FADE_MS,
						useNativeDriver: true,
					}).start();
				}
			);
		}, CYCLE_MS);
		return () => clearInterval(timer);
	}, [opacity, count]);

	return { index, opacity };
};
