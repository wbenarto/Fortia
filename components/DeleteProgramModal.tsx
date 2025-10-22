import React from 'react';
import { View, Text, TouchableOpacity, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DeleteProgramModalProps {
	visible: boolean;
	onClose: () => void;
	onConfirm: () => void;
	programName: string;
	isDeleting: boolean;
}

export default function DeleteProgramModal({
	visible,
	onClose,
	onConfirm,
	programName,
	isDeleting,
}: DeleteProgramModalProps) {
	const handleConfirm = () => {
		Alert.alert(
			'Delete Program',
			`Are you sure you want to delete "${programName}"? This will remove the program, all sessions, and exercises. This action cannot be undone.`,
			[
				{
					text: 'Cancel',
					style: 'cancel',
				},
				{
					text: 'Delete',
					style: 'destructive',
					onPress: onConfirm,
				},
			]
		);
	};

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<TouchableOpacity
				className="flex-1 justify-start items-end pt-24 pr-4"
				activeOpacity={1}
				onPress={onClose}
			>
				<TouchableOpacity
					activeOpacity={1}
					onPress={e => e.stopPropagation()}
					className="bg-white rounded-lg px-4 py-2 shadow-lg"
				>
					<TouchableOpacity
						onPress={handleConfirm}
						className="flex-row items-center py-2"
						disabled={isDeleting}
					>
						<Ionicons name="trash" size={16} color="#DC2626" />
						<Text className="text-red-600 font-JakartaSemiBold ml-2">
							{isDeleting ? 'Deleting...' : 'Delete'}
						</Text>
					</TouchableOpacity>
				</TouchableOpacity>
			</TouchableOpacity>
		</Modal>
	);
}
