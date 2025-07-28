import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ChangePassword from '../app/(auth)/change-password';

// Mock Expo
jest.mock('expo-asset', () => ({}));
jest.mock('expo-font', () => ({}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
	Ionicons: 'Ionicons',
}));

// Mock Clerk
jest.mock('@clerk/clerk-expo', () => ({
	useUser: () => ({
		user: {
			updatePassword: jest.fn(),
			passwordEnabled: true,
			emailAddresses: [
				{
					verification: {
						status: 'verified',
					},
				},
			],
			externalAccounts: [],
		},
	}),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
	router: {
		back: jest.fn(),
	},
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
	useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('ChangePassword', () => {
	it('renders correctly', () => {
		const { getByText, getByPlaceholderText } = render(<ChangePassword />);

		expect(getByText('Change Password')).toBeTruthy();
		expect(getByText('Password Requirements')).toBeTruthy();
		expect(getByPlaceholderText('Enter your current password')).toBeTruthy();
		expect(getByPlaceholderText('Enter your new password')).toBeTruthy();
		expect(getByPlaceholderText('Confirm your new password')).toBeTruthy();
		expect(getByText('Update Password')).toBeTruthy();
	});

	it('shows validation errors for empty fields', async () => {
		const { getByText, getByPlaceholderText } = render(<ChangePassword />);

		const updateButton = getByText('Update Password');
		fireEvent.press(updateButton);

		await waitFor(() => {
			expect(getByText('Current password is required')).toBeTruthy();
			expect(getByText('New password is required')).toBeTruthy();
			expect(getByText('Please confirm your new password')).toBeTruthy();
		});
	});

	it('shows validation error for weak password', async () => {
		const { getByText, getByPlaceholderText } = render(<ChangePassword />);

		const newPasswordInput = getByPlaceholderText('Enter your new password');
		fireEvent.changeText(newPasswordInput, 'weak');

		const updateButton = getByText('Update Password');
		fireEvent.press(updateButton);

		await waitFor(() => {
			expect(getByText('Password must be at least 8 characters long')).toBeTruthy();
		});
	});

	it('shows validation error for password mismatch', async () => {
		const { getByText, getByPlaceholderText } = render(<ChangePassword />);

		const newPasswordInput = getByPlaceholderText('Enter your new password');
		const confirmPasswordInput = getByPlaceholderText('Confirm your new password');

		fireEvent.changeText(newPasswordInput, 'StrongPass123');
		fireEvent.changeText(confirmPasswordInput, 'DifferentPass123');

		const updateButton = getByText('Update Password');
		fireEvent.press(updateButton);

		await waitFor(() => {
			expect(getByText('Passwords do not match')).toBeTruthy();
		});
	});

	it('shows validation error for same password', async () => {
		const { getByText, getByPlaceholderText } = render(<ChangePassword />);

		const currentPasswordInput = getByPlaceholderText('Enter your current password');
		const newPasswordInput = getByPlaceholderText('Enter your new password');

		fireEvent.changeText(currentPasswordInput, 'SamePassword123');
		fireEvent.changeText(newPasswordInput, 'SamePassword123');

		const updateButton = getByText('Update Password');
		fireEvent.press(updateButton);

		await waitFor(() => {
			expect(getByText('New password must be different from current password')).toBeTruthy();
		});
	});

	it('shows OAuth message for OAuth-only users', () => {
		// Mock OAuth user
		jest.doMock('@clerk/clerk-expo', () => ({
			useUser: () => ({
				user: {
					updatePassword: jest.fn(),
					passwordEnabled: false,
					emailAddresses: [
						{
							verification: {
								status: 'verified',
							},
						},
					],
					externalAccounts: [
						{
							provider: 'google',
						},
					],
				},
			}),
		}));

		const { getByText } = render(<ChangePassword />);

		expect(getByText('Password Management')).toBeTruthy();
		expect(getByText(/managed through your google account/)).toBeTruthy();
	});
});
