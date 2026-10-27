import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const RING_SIZE = 140;
const STROKE = 10;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const eyebrowStyle = { textTransform: 'uppercase', letterSpacing: 0.6 } as const;

const StatRow = ({
	dot,
	label,
	value,
	isLoading,
}: {
	dot?: string;
	label: string;
	value: number;
	isLoading: boolean;
}) => (
	<View className="flex-row items-center">
		<View
			className="w-2 h-2 rounded-full mr-2"
			style={dot ? { backgroundColor: dot } : { borderWidth: 1.5, borderColor: '#94897E' }}
		/>
		<Text className="flex-1 text-[12px] font-JakartaMedium text-[#94897E]">{label}</Text>
		<Text className="text-[15px] font-JakartaBold text-[#262135]">
			{isLoading ? '...' : Math.round(value).toLocaleString()}
		</Text>
	</View>
);

const CalorieHero = ({
	eaten,
	burned,
	goal,
	isLoading,
}: {
	eaten: number;
	burned: number;
	goal: number;
	isLoading: boolean;
}) => {
	const net = Math.round(burned - eaten);
	const isBalanced = net === 0;
	const isDeficit = net > 0;
	const netColor = isBalanced ? '#64748B' : isDeficit ? '#7DB88A' : '#E3BBA1';
	const netLabel = isBalanced ? 'Balanced' : isDeficit ? 'Deficit' : 'Surplus';
	// Darker shade of the badge colour for the text, so it reads on the tinted pill
	const netTextColor = isBalanced ? '#475569' : isDeficit ? '#4F8A5E' : '#B26F55';

	const percentOfGoal = goal ? (eaten / goal) * 100 : 0;
	const ringColor =
		percentOfGoal > 100 ? '#E08585' : percentOfGoal >= 90 ? '#F2D58E' : '#7DB88A';
	const progress = Math.min(Math.max(percentOfGoal, 0), 100) / 100;

	const remaining = Math.round(goal - eaten);
	const isOver = remaining < 0;

	return (
		<View className="w-full flex-row items-center">
			<View style={{ width: RING_SIZE, height: RING_SIZE }}>
				<Svg width={RING_SIZE} height={RING_SIZE}>
					<Circle
						cx={RING_SIZE / 2}
						cy={RING_SIZE / 2}
						r={RADIUS}
						stroke="#94897E33"
						strokeWidth={STROKE}
						fill="none"
					/>
					{!isLoading && progress > 0 && (
						<Circle
							cx={RING_SIZE / 2}
							cy={RING_SIZE / 2}
							r={RADIUS}
							stroke={ringColor}
							strokeWidth={STROKE}
							strokeLinecap="round"
							fill="none"
							strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
							strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
							transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
						/>
					)}
				</Svg>
				<View style={StyleSheet.absoluteFill} className="items-center justify-center">
					<Text className="font-JakartaExtraBold text-[28px] text-[#262135]">
						{isLoading ? '...' : Math.abs(remaining).toLocaleString()}
					</Text>
					<Text className="text-[10px] font-JakartaSemiBold text-[#94897E]" style={eyebrowStyle}>
						{isOver ? 'cal over' : 'cal left'}
					</Text>
				</View>
			</View>

			<View className="flex-1 ml-6">
				<StatRow dot="#E3BBA1" label="Eaten" value={eaten} isLoading={isLoading} />
				<View className="h-3" />
				<StatRow dot="#8FA9BA" label="Burned" value={burned} isLoading={isLoading} />
				<View className="h-3" />
				<StatRow label="Goal" value={goal} isLoading={isLoading} />

				<View
					className="self-stretch flex-row items-center justify-center rounded-full px-3 py-1.5 mt-4"
					style={{ backgroundColor: `${netColor}33` }}
				>
					<Text
						className="text-[12px] font-JakartaBold text-center"
						style={{ color: netTextColor }}
					>
						{isLoading
							? '...'
							: isBalanced
								? netLabel
								: `${netLabel} ${Math.abs(net).toLocaleString()} cal`}
					</Text>
				</View>
			</View>
		</View>
	);
};

export default CalorieHero;
