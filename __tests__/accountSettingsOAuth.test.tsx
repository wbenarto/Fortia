import React from 'react';
import { render } from '@testing-library/react-native';
import AccountSettings from '../app/account-settings';

// Mock Expo
jest.mock('expo-asset', () => ({}));
jest.mock('expo-font', () => ({}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
	Ionicons: 'Ionicons',
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
	useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
	router: {
		back: jest.fn(),
		push: jest.fn(),
	},
	useFocusEffect: jest.fn(),
	Stack: {
		Screen: ({ children }: any) => children,
	},
}));

// Mock react-native-modal
jest.mock('react-native-modal', () => 'ReactNativeModal');

// Mock components
jest.mock('../components/GoalSetupModal', () => 'GoalSetupModal');
jest.mock('../components/PrivacyPolicyModal', () => 'PrivacyPolicyModal');
jest.mock('../components/TermsAndConditionsModal', () => 'TermsAndConditionsModal');
jest.mock('../components/InputField', () => 'InputField');
jest.mock('../components/CustomButton', () => 'CustomButton');

// Mock lib functions
jest.mock('../lib/fetch', () => ({
	fetchAPI: jest.fn(),
}));

jest.mock('../lib/userUtils', () => ({
	getUserDisplayName: jest.fn(() => 'Test User'),
	getUserLastName: jest.fn(() => 'User'),
	useUserProfile: jest.fn(() => ({
		firstName: 'Test',
		lastName: 'User',
	})),
}));

describe('AccountSettings OAuth Handling', () => {
	it('shows change password option for email/password users', () => {
		// Mock email/password user
		jest.doMock('@clerk/clerk-expo', () => ({
			useUser: () => ({
				user: {
					id: 'test-user-id',
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
			useAuth: () => ({
				signOut: jest.fn(),
			}),
		}));

		const { getByText } = render(<AccountSettings />);

		expect(getByText('Change Password')).toBeTruthy();
		expect(getByText('Update your account password')).toBeTruthy();
	});

	it('shows OAuth info for OAuth-only users', () => {
		// Mock OAuth user
		jest.doMock('@clerk/clerk-expo', () => ({
			useUser: () => ({
				user: {
					id: 'test-user-id',
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
			useAuth: () => ({
				signOut: jest.fn(),
			}),
		}));

		const { getByText } = render(<AccountSettings />);

		expect(getByText('Password Management')).toBeTruthy();
		expect(getByText(/managed through your google account/)).toBeTruthy();
	});

	it('shows OAuth info for Apple users', () => {
		// Mock Apple OAuth user
		jest.doMock('@clerk/clerk-expo', () => ({
			useUser: () => ({
				user: {
					id: 'test-user-id',
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
							provider: 'apple',
						},
					],
				},
			}),
			useAuth: () => ({
				signOut: jest.fn(),
			}),
		}));

		const { getByText } = render(<AccountSettings />);

		expect(getByText('Password Management')).toBeTruthy();
		expect(getByText(/managed through your apple account/)).toBeTruthy();
	});
});
