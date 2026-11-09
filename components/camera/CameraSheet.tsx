import { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';

export type CameraMode = 'barcode' | 'photo' | 'label';

// Long edge sent to the AI: big enough to tell foods apart, small enough to stay
// ~150 KB and ~560 image tokens (see fortia-api meal-photo-analysis)
const MAX_EDGE = 1024;

const COPY: Record<CameraMode, { title: string; hint: string }> = {
	barcode: { title: 'Scan barcode', hint: 'Line up the barcode inside the frame' },
	photo: { title: 'Snap your meal', hint: 'Get the whole plate in, from a little above' },
	label: { title: 'Snap the label', hint: 'Fill the frame with the Nutrition Facts panel' },
};

/** Resize to MAX_EDGE on the long side and return JPEG base64. */
const toUploadImage = async (uri: string, width?: number, height?: number) => {
	const landscape = (width ?? 0) >= (height ?? 0);
	const resize = landscape ? { width: MAX_EDGE } : { height: MAX_EDGE };
	const result = await manipulateAsync(uri, [{ resize }], {
		compress: 0.7,
		format: SaveFormat.JPEG,
		base64: true,
	});
	return result.base64 ?? '';
};

// Full-screen camera that sits on top of the Log meal sheet (absolute fill, not a
// second modal). Barcode mode reports the first EAN/UPC it sees; photo/label modes
// take a picture (or pick one from the library) and hand back resized base64.
const CameraSheet = ({
	mode,
	onClose,
	onBarcode,
	onPhoto,
}: {
	mode: CameraMode;
	onClose: () => void;
	onBarcode?: (code: string) => void;
	onPhoto?: (base64: string) => void;
}) => {
	const insets = useSafeAreaInsets();
	const [permission, requestPermission] = useCameraPermissions();
	const cameraRef = useRef<CameraView>(null);
	const [ready, setReady] = useState(false);
	const [torch, setTorch] = useState(false);
	const [busy, setBusy] = useState(false);
	// One barcode per open; the scanner fires many times a second
	const scannedRef = useRef(false);
	const copy = COPY[mode];

	const handleBarcode = ({ data }: BarcodeScanningResult) => {
		if (scannedRef.current || !data) return;
		scannedRef.current = true;
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
		onBarcode?.(data);
	};

	const takePhoto = async () => {
		if (!cameraRef.current || busy) return;
		setBusy(true);
		try {
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
			const picture = await cameraRef.current.takePictureAsync({ quality: 0.8 });
			if (!picture?.uri) return;
			onPhoto?.(await toUploadImage(picture.uri, picture.width, picture.height));
		} catch (err) {
			console.error('Take photo error:', err);
		} finally {
			setBusy(false);
		}
	};

	const pickFromLibrary = async () => {
		if (busy) return;
		setBusy(true);
		try {
			const picked = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ['images'],
				quality: 0.8,
			});
			const asset = picked.canceled ? null : picked.assets?.[0];
			if (asset?.uri) onPhoto?.(await toUploadImage(asset.uri, asset.width, asset.height));
		} catch (err) {
			console.error('Pick photo error:', err);
		} finally {
			setBusy(false);
		}
	};

	const closeButton = (
		<TouchableOpacity
			onPress={onClose}
			className="w-10 h-10 rounded-full items-center justify-center"
			style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
			accessibilityLabel="Close camera"
		>
			<Ionicons name="close" size={24} color="#FFFFFF" />
		</TouchableOpacity>
	);

	// Permission not decided yet / denied
	if (!permission?.granted) {
		const canAsk = !permission || permission.canAskAgain;
		return (
			<View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#262135' }]}>
				<View className="px-5" style={{ paddingTop: insets.top + 8 }}>
					{closeButton}
				</View>
				<View className="flex-1 items-center justify-center px-8">
					<View className="w-16 h-16 rounded-full items-center justify-center bg-[#2D2A3F]">
						<Ionicons name="camera-outline" size={30} color="#E3BBA1" />
					</View>
					<Text className="text-white font-JakartaExtraBold text-[20px] mt-5 text-center">
						Camera access needed
					</Text>
					<Text className="text-[#E3BBA1] font-JakartaMedium text-[14px] mt-2 text-center leading-[20px]">
						Fortia uses the camera to scan barcodes and photograph meals. Photos are only used to
						read your food and aren't saved.
					</Text>
					<TouchableOpacity
						onPress={() => (canAsk ? requestPermission() : Linking.openSettings())}
						className="bg-white rounded-xl py-3 px-8 mt-6"
					>
						<Text className="text-[#262135] font-JakartaBold text-[15px]">
							{canAsk ? 'Allow camera' : 'Open Settings'}
						</Text>
					</TouchableOpacity>
					{mode !== 'barcode' && (
						<TouchableOpacity onPress={pickFromLibrary} className="mt-4 py-2">
							<Text className="text-white font-JakartaSemiBold text-[14px]">
								Choose from library instead
							</Text>
						</TouchableOpacity>
					)}
				</View>
			</View>
		);
	}

	return (
		<View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000000' }]}>
			<CameraView
				ref={cameraRef}
				style={StyleSheet.absoluteFillObject}
				facing="back"
				enableTorch={torch}
				onCameraReady={() => setReady(true)}
				barcodeScannerSettings={
					mode === 'barcode' ? { barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] } : undefined
				}
				onBarcodeScanned={mode === 'barcode' ? handleBarcode : undefined}
			/>

			{/* Top bar */}
			<View
				className="absolute left-0 right-0 flex-row items-center justify-between px-5"
				style={{ top: insets.top + 8 }}
			>
				{closeButton}
				<Text className="text-white font-JakartaBold text-[16px]">{copy.title}</Text>
				<TouchableOpacity
					onPress={() => setTorch(t => !t)}
					className="w-10 h-10 rounded-full items-center justify-center"
					style={{ backgroundColor: torch ? '#E3BBA1' : 'rgba(0,0,0,0.35)' }}
					accessibilityLabel={torch ? 'Turn flashlight off' : 'Turn flashlight on'}
				>
					<Ionicons name={torch ? 'flash' : 'flash-outline'} size={20} color="#FFFFFF" />
				</TouchableOpacity>
			</View>

			{/* Frame */}
			<View
				style={StyleSheet.absoluteFillObject}
				pointerEvents="none"
				className="items-center justify-center"
			>
				<View
					style={{
						width: mode === 'barcode' ? 280 : 300,
						height: mode === 'barcode' ? 170 : mode === 'label' ? 380 : 300,
						borderRadius: 24,
						borderWidth: 3,
						borderColor: 'rgba(255,255,255,0.9)',
					}}
				/>
				<Animated.View
					entering={FadeIn.delay(300)}
					className="mt-5 px-4 py-2 rounded-full"
					style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
				>
					<Text className="text-white font-JakartaSemiBold text-[13px]">{copy.hint}</Text>
				</Animated.View>
			</View>

			{/* Shutter + library (photo / label) */}
			{mode !== 'barcode' && (
				<View
					className="absolute left-0 right-0 flex-row items-center justify-center"
					style={{ bottom: insets.bottom + 32 }}
				>
					<TouchableOpacity
						onPress={pickFromLibrary}
						className="absolute left-10 w-12 h-12 rounded-full items-center justify-center"
						style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
						accessibilityLabel="Choose from library"
					>
						<Ionicons name="images-outline" size={22} color="#FFFFFF" />
					</TouchableOpacity>
					<TouchableOpacity
						onPress={takePhoto}
						disabled={!ready || busy}
						className="w-[76px] h-[76px] rounded-full items-center justify-center"
						style={{ borderWidth: 4, borderColor: '#FFFFFF', opacity: ready ? 1 : 0.5 }}
						accessibilityLabel="Take photo"
					>
						<View className="w-[60px] h-[60px] rounded-full bg-white items-center justify-center">
							{busy && <ActivityIndicator color="#262135" />}
						</View>
					</TouchableOpacity>
				</View>
			)}
		</View>
	);
};

export default CameraSheet;
