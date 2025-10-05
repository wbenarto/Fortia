import React, { useState } from 'react';
import { View, Text } from 'react-native';
import ReactNativeModal from 'react-native-modal';

interface FortiaPTProps {
	isVisible: boolean;
	onClose: () => void;
}

const FortiaPT: React.FC<FortiaPTProps> = ({ isVisible, onClose }) => {
	const handleClose = () => {
		onClose();
	};
	return (
		<ReactNativeModal
			isVisible={isVisible}
			onBackdropPress={handleClose}
			onBackButtonPress={handleClose}
			className="m-0"
			animationIn="slideInUp"
			animationOut="slideOutDown"
		>
			<View className="w-full h-24 bg-red-100 my-2 flex items-center justify-center">
				<Text className="font-JakartaSemiBold text-4xl">my fortia</Text>
				{/* <View className="w-[90%] h-20 bg-blue-100 rounded-lg border-[1px] border-gray-400"></View> */}
			</View>
		</ReactNativeModal>
	);
};

export default FortiaPT;
