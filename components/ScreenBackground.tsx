import { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SCREEN_BG } from '@/lib/theme';

const ScreenBackground = ({ children }: { children: ReactNode }) => {
	const insets = useSafeAreaInsets();

	return (
		<View className="flex-1" style={{ flex: 1, backgroundColor: SCREEN_BG, paddingTop: insets.top }}>
			{children}
		</View>
	);
};

export default ScreenBackground;
