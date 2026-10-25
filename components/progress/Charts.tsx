import { useState } from 'react';
import { View, Text, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

// Lightweight charts drawn with plain views / SVG so they follow the design system
// exactly (gifted-charts is still used for the small Home weight sparkline).

export interface BarPoint {
	value: number;
	color: string;
	label?: string; // shown under the bar when set
}

// Vertical bars with an optional dashed target line.
export const Bars = ({
	data,
	target,
	height = 120,
	emptyColor = '#F0EBE6',
}: {
	data: BarPoint[];
	target?: number | null;
	height?: number;
	emptyColor?: string;
}) => {
	const max = Math.max(1, target || 0, ...data.map(d => d.value)) * 1.08;
	const gap = data.length > 40 ? 1 : data.length > 14 ? 2 : 6;
	const targetTop = target ? height - (target / max) * height : null;

	return (
		<View>
			<View style={{ height }} className="flex-row items-end">
				{data.map((d, i) => (
					<View
						key={i}
						style={{ flex: 1, marginHorizontal: gap / 2, height: '100%' }}
						className="justify-end"
					>
						<View
							style={{
								height: d.value > 0 ? Math.max(3, (d.value / max) * height) : 3,
								backgroundColor: d.value > 0 ? d.color : emptyColor,
								borderRadius: data.length > 40 ? 1.5 : 4,
							}}
						/>
					</View>
				))}
				{targetTop != null && (
					<View
						pointerEvents="none"
						style={{
							position: 'absolute',
							left: 0,
							right: 0,
							top: targetTop,
							borderTopWidth: 1.5,
							borderStyle: 'dashed',
							borderColor: '#262135',
							opacity: 0.35,
						}}
					/>
				)}
			</View>
			{data.some(d => d.label) && (
				<View className="flex-row mt-1.5">
					{data.map((d, i) => (
						<Text
							key={i}
							style={{ flex: 1 }}
							numberOfLines={1}
							className="text-[9px] font-JakartaMedium text-[#94897E] text-center"
						>
							{d.label || ''}
						</Text>
					))}
				</View>
			)}
		</View>
	);
};

export interface LinePoint {
	x: number; // 0..1 across the range
	y: number;
}

// Weight line: raw weigh-ins as dots, smoothed trend line, dashed target.
export const TrendLine = ({
	points,
	trend,
	target,
	height = 140,
}: {
	points: LinePoint[];
	trend: LinePoint[];
	target?: number | null;
	height?: number;
}) => {
	const [width, setWidth] = useState(0);
	const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

	const ys = [...points.map(p => p.y), ...(target ? [target] : [])];
	const pad = 6;
	const min = Math.min(...ys);
	const max = Math.max(...ys);
	const span = Math.max(1, max - min);
	const lo = min - span * 0.15;
	const hi = max + span * 0.15;
	const px = (x: number) => pad + x * (width - pad * 2);
	const py = (y: number) => pad + (1 - (y - lo) / (hi - lo)) * (height - pad * 2);

	return (
		<View onLayout={onLayout} style={{ height }}>
			{width > 0 && points.length > 0 && (
				<Svg width={width} height={height}>
					{target != null && (
						<Line
							x1={0}
							x2={width}
							y1={py(target)}
							y2={py(target)}
							stroke="#262135"
							strokeOpacity={0.3}
							strokeWidth={1.5}
							strokeDasharray="5 5"
						/>
					)}
					{trend.length > 1 && (
						<Polyline
							points={trend.map(p => `${px(p.x)},${py(p.y)}`).join(' ')}
							fill="none"
							stroke="#E3BBA1"
							strokeWidth={3}
							strokeLinejoin="round"
							strokeLinecap="round"
						/>
					)}
					{points.map((p, i) => (
						<Circle
							key={i}
							cx={px(p.x)}
							cy={py(p.y)}
							r={i === points.length - 1 ? 4.5 : 3}
							fill={i === points.length - 1 ? '#262135' : '#C9BEB4'}
							stroke="#FFFFFF"
							strokeWidth={i === points.length - 1 ? 2 : 0}
						/>
					))}
				</Svg>
			)}
		</View>
	);
};

// Thin rounded progress bar (marker-on-bar family) for "x of target" stats.
export const ProgressBar = ({
	value,
	target,
	color = '#E3BBA1',
}: {
	value: number;
	target: number;
	color?: string;
}) => {
	const pct = target > 0 ? Math.min(1, value / target) : 0;
	return (
		<View className="h-1.5 rounded-full bg-[#F0EBE6] overflow-hidden">
			<View
				className="h-full rounded-full"
				style={{ width: `${pct * 100}%`, backgroundColor: color }}
			/>
		</View>
	);
};
