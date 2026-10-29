import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Linking, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchAPI } from '@/lib/fetch';

// Library images come as start/end positions; flipping between them reads as a
// simple demo loop without needing video.
export const ExerciseFrames = ({
	images,
	size,
	height,
	animate = true,
}: {
	images: string[];
	size?: number;
	height?: number;
	animate?: boolean;
}) => {
	const [frame, setFrame] = useState(0);

	useEffect(() => {
		if (!animate || images.length < 2) return;
		const timer = setInterval(() => setFrame(f => (f + 1) % images.length), 1100);
		return () => clearInterval(timer);
	}, [animate, images.length]);

	const style = size ? { width: size, height: size } : { width: '100%' as const, height };

	if (images.length === 0) {
		return (
			<View
				className="bg-[#F9F9F8] items-center justify-center rounded-2xl border-[1px] border-[#F0EBE6]"
				style={style}
			>
				<Ionicons name="barbell-outline" size={size ? size * 0.45 : 40} color="#857869" />
			</View>
		);
	}

	return (
		<View
			className="bg-white rounded-2xl overflow-hidden border-[1px] border-[#F0EBE6]"
			style={style}
		>
			<Image
				source={{ uri: images[frame] }}
				style={{ width: '100%', height: '100%' }}
				resizeMode="cover"
			/>
		</View>
	);
};

// "Watch demo": looks the video up only when tapped (cached server-side), then opens
// it in YouTube / the browser.
export const WatchDemoButton = ({ exerciseName }: { exerciseName: string }) => {
	const [loading, setLoading] = useState(false);
	const [failed, setFailed] = useState(false);

	const open = async () => {
		setLoading(true);
		setFailed(false);
		try {
			const result = await fetchAPI(
				`/api/exercise-videos?exercise=${encodeURIComponent(exerciseName)}`,
				{ method: 'GET' }
			);
			if (result.success && result.data?.videoUrl) {
				await Linking.openURL(result.data.videoUrl);
			} else {
				setFailed(true);
			}
		} catch (err) {
			console.error('Demo video error:', err);
			setFailed(true);
		} finally {
			setLoading(false);
		}
	};

	return (
		<TouchableOpacity
			onPress={open}
			disabled={loading}
			className="flex-row items-center self-start bg-[#F1F1F1] rounded-full px-3 py-1.5"
		>
			{loading ? (
				<ActivityIndicator size="small" color="#574F47" />
			) : (
				<Ionicons name="play-circle-outline" size={16} color="#262135" />
			)}
			<Text className="text-xs font-JakartaSemiBold text-[#262135] ml-1.5">
				{failed ? 'Video unavailable' : 'Watch demo'}
			</Text>
		</TouchableOpacity>
	);
};

export const InstructionSteps = ({ steps }: { steps: string[] }) => (
	<View style={{ rowGap: 10 }}>
		{steps.map((step, i) => (
			<View key={i} className="flex-row">
				<View className="w-5 h-5 rounded-full bg-[#E3BBA1] items-center justify-center mr-2.5 mt-0.5">
					<Text className="text-[10px] font-JakartaBold text-white">{i + 1}</Text>
				</View>
				<Text className="flex-1 text-[13px] leading-5 font-JakartaMedium text-[#262135]">
					{step}
				</Text>
			</View>
		))}
	</View>
);
