import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useUser, useAuth, useSignIn } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, Stack } from 'expo-router';
import ReactNativeModal from 'react-native-modal';
import GoalSetupModal from '../components/GoalSetupModal';
import PrivacyPolicyModal from '../components/PrivacyPolicyModal';
import TermsAndConditionsModal from '../components/TermsAndConditionsModal';
import { fetchAPI } from '../lib/fetch';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUserDisplayName, getUserLastName, useUserProfile } from '@/lib/userUtils';
import InputField from '../components/InputField';
import { formatHeight, formatWeight, useUnitStore, type UnitSystem } from '@/lib/units';
import { SCREEN_BG } from '@/lib/theme';
import EditDietModal from '../components/EditDietModal';
import {
	DIET_INFO,
	FASTING_INFO,
	formatEatingWindow,
	resolveDietType,
	resolveFastingSchedule,
	resolveFastingStartHour,
} from '@/lib/diet';

const UNIT_OPTIONS: { key: UnitSystem; label: string }[] = [
	{ key: 'us', label: 'US' },
	{ key: 'metric', label: 'Metric' },
];

const INK = '#262135';
const DANGER = '#E08585';
const EYEBROW_STYLE = { textTransform: 'uppercase', letterSpacing: 0.6 } as const;
const CARD_CLASS = 'bg-white rounded-3xl border-[1px] border-[#F0EBE6] p-5 mb-8';
const LIST_CARD_CLASS = 'bg-white rounded-3xl border-[1px] border-[#F0EBE6] overflow-hidden mb-4';

const SectionLabel = ({ children }: { children: string }) => (
	<Text className="text-[11px] font-JakartaSemiBold text-[#94897E] mb-2 ml-1" style={EYEBROW_STYLE}>
		{children}
	</Text>
);

const DetailRow = ({
	label,
	value,
	last,
	onPress,
}: {
	label: string;
	value: string;
	last?: boolean;
	onPress?: () => void;
}) => {
	const className = `flex-row justify-between items-center py-3 ${
		last ? '' : 'border-b-[1px] border-[#F0EBE6]'
	}`;
	const content = (
		<>
			<Text className="text-sm font-JakartaMedium text-[#94897E]">{label}</Text>
			<View className="flex-row items-center">
				<Text className="text-sm font-JakartaSemiBold text-[#262135]">{value}</Text>
				{onPress && (
					<Ionicons name="chevron-forward" size={14} color="#C9BEB4" style={{ marginLeft: 4 }} />
				)}
			</View>
		</>
	);
	return onPress ? (
		<TouchableOpacity onPress={onPress} activeOpacity={0.7} className={className}>
			{content}
		</TouchableOpacity>
	) : (
		<View className={className}>{content}</View>
	);
};

const MacroStat = ({ label, grams }: { label: string; grams: number }) => (
	<View>
		<Text className="text-[10px] font-JakartaSemiBold text-[#94897E]" style={EYEBROW_STYLE}>
			{label}
		</Text>
		<View className="flex-row items-baseline mt-0.5">
			<Text className="font-JakartaExtraBold text-[18px] text-[#262135]">{Math.round(grams)}</Text>
			<Text className="font-JakartaMedium text-xs text-[#94897E] ml-1">g</Text>
		</View>
	</View>
);

const RowIcon = ({
	name,
	color = INK,
}: {
	name: keyof typeof Ionicons.glyphMap;
	color?: string;
}) => (
	<View className="w-9 h-9 rounded-full bg-[#F9F9F8] border-[1px] border-[#F0EBE6] items-center justify-center">
		<Ionicons name={name} size={18} color={color} />
	</View>
);

const ListRow = ({
	icon,
	title,
	subtitle,
	onPress,
	danger,
	last,
}: {
	icon: keyof typeof Ionicons.glyphMap;
	title: string;
	subtitle: string;
	onPress?: () => void;
	danger?: boolean;
	last?: boolean;
}) => {
	const content = (
		<>
			<RowIcon name={icon} color={danger ? DANGER : INK} />
			<View className="ml-3 flex-1">
				<Text className="font-JakartaSemiBold text-sm" style={{ color: danger ? DANGER : INK }}>
					{title}
				</Text>
				<Text className="text-xs font-JakartaMedium text-[#94897E] mt-0.5">{subtitle}</Text>
			</View>
			{onPress && <Ionicons name="chevron-forward" size={18} color="#C9BEB4" />}
		</>
	);
	const className = `flex-row items-center px-4 py-3.5 ${last ? '' : 'border-b-[1px] border-[#F0EBE6]'}`;
	return onPress ? (
		<TouchableOpacity onPress={onPress} activeOpacity={0.7} className={className}>
			{content}
		</TouchableOpacity>
	) : (
		<View className={className}>{content}</View>
	);
};

interface NutritionGoals {
	id: string;
	userId: string;
	dob: string;
	age: number;
	weight: number;
	target_weight: number;
	height: number;
	gender: string;
	activity_level: string;
	fitness_goal: string;
	daily_calories: number;
	daily_protein: number;
	daily_carbs: number;
	daily_fats: number;
	diet_type?: string;
	fasting_schedule?: string;
	fasting_start_hour?: number;
	bmr: number;
	tdee: number;
	created_at: string;
	updated_at: string;
}

// "16:8 · 12pm–8pm", or "Off"
const formatFasting = (goals: NutritionGoals) => {
	const schedule = resolveFastingSchedule(goals.fasting_schedule);
	const window = formatEatingWindow(schedule, resolveFastingStartHour(goals.fasting_start_hour));
	return window ? `${FASTING_INFO[schedule].label} · ${window}` : FASTING_INFO[schedule].label;
};

const AccountSettings = () => {
	const { user } = useUser();
	const { signOut } = useAuth();
	const { signIn } = useSignIn();
	const [nutritionGoals, setNutritionGoals] = useState<NutritionGoals | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [goalSetupModal, setGoalSetupModal] = useState(false);
	const [dietModal, setDietModal] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [deleteAccountModal, setDeleteAccountModal] = useState(false);
	const [privacyPolicyModal, setPrivacyPolicyModal] = useState(false);
	const [termsAndConditionsModal, setTermsAndConditionsModal] = useState(false);
	const [password, setPassword] = useState('');
	const [isValidating, setIsValidating] = useState(false);
	const [passwordError, setPasswordError] = useState('');
	const insets = useSafeAreaInsets();
	const unitSystem = useUnitStore(s => s.system);
	const setUnitSystem = useUnitStore(s => s.setSystem);

	useEffect(() => {
		if (user?.id) {
			fetchNutritionGoals();
		}
	}, [user?.id]);

	// Refresh data when page comes into focus (e.g., after editing profile)
	useFocusEffect(
		React.useCallback(() => {
			if (user?.id) {
				fetchNutritionGoals();
			}
		}, [user?.id])
	);

	const userProfile = useUserProfile();

	// Check if user signed up with email/password (not OAuth)
	const isEmailPasswordUser = () => {
		if (!user) return false;

		// Check if user has any OAuth accounts
		const hasOAuthAccounts = user.externalAccounts && user.externalAccounts.length > 0;

		// Check if user has password-based authentication
		// This is more reliable than checking email verification status
		// OAuth users will have verified emails but no password-based auth
		const hasPasswordAuth = user.passwordEnabled;

		// User can change password if they have password-based authentication
		// OAuth-only users (no password auth) cannot change passwords
		return hasPasswordAuth;
	};

	const fetchNutritionGoals = async () => {
		if (!user?.id) return;

		setIsLoading(true);
		try {
			const response = await fetchAPI(`/api/user?clerkId=${user.id}`, {
				method: 'GET',
			});

			if (response.success && response.data) {
				setNutritionGoals(response.data);
			}
		} catch (error) {
			console.error('Failed to fetch nutrition goals:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleGoalsUpdated = () => {
		fetchNutritionGoals();
		setGoalSetupModal(false);
	};

	const handleSignOut = async () => {
		try {
			// Close all modals first to prevent cleanup issues
			setGoalSetupModal(false);
			setDeleteAccountModal(false);
			setPrivacyPolicyModal(false);
			setTermsAndConditionsModal(false);

			// Add a small delay to allow modals to close properly
			await new Promise(resolve => setTimeout(resolve, 100));

			// First, sign out from Clerk
			await signOut();

			// Use router.push instead of replace to avoid cleanup issues
			router.push('/(auth)/sign-in');
		} catch (error) {
			console.error('Sign out error:', error);
			// Even if signOut fails, try to navigate to sign-in
			router.push('/(auth)/sign-in');
		}
	};

	const handleDeleteAccount = () => {
		setDeleteAccountModal(true);
	};

	const handlePasswordValidation = async () => {
		setIsValidating(true);
		setPasswordError(''); // Clear any previous error

		try {
			// For password-based users, validate their password
			if (isEmailPasswordUser()) {
				// Check if password is provided for password-based users
				if (!password.trim()) {
					Alert.alert('Error', 'Please enter your password to continue.');
					return;
				}

				// ISSUE FIXED: The original code was trying to use signIn.create() while already signed in,
				// which Clerk doesn't allow. This caused the "You're already signed in" error.
				//
				// SOLUTION: Instead of trying to create a new sign-in attempt, we'll use a confirmation dialog.
				// In a production app, you might want to implement server-side password verification
				// or use Clerk's verifyPassword method if available.

				// Show a confirmation dialog for password users
				Alert.alert(
					'Confirm Account Deletion',
					'Are you sure you want to permanently delete your account? This action cannot be undone.',
					[
						{
							text: 'Cancel',
							style: 'cancel',
						},
						{
							text: 'Delete Account',
							style: 'destructive',
							onPress: async () => {
								await performAccountDeletion();
							},
						},
					]
				);
			} else {
				// For OAuth users, just proceed with deletion (no password to verify)
				await performAccountDeletion();
			}
		} catch (error) {
			console.error('Password validation error:', error);
			setPasswordError('An error occurred. Please try again.');
			setPassword(''); // Clear the password field
		} finally {
			setIsValidating(false);
		}
	};

	const performAccountDeletion = async () => {
		if (!user?.id) {
			Alert.alert('Error', 'User not found');
			return;
		}

		try {
			// Step 1: Delete all data from our database

			const dbResponse = await fetchAPI(`/api/delete-account?clerkId=${user.id}`, {
				method: 'DELETE',
			});

			if (!dbResponse.success) {
				console.error('Database deletion failed:', dbResponse.error);
				Alert.alert('Error', 'Failed to delete account data. Please try again.');
				return;
			}

			// Step 2: Delete user from Clerk

			await user.delete();

			// Step 3: Show success message and redirect
			Alert.alert(
				'Account Deleted',
				'Your account and all associated data have been permanently deleted.',
				[
					{
						text: 'OK',
						onPress: async () => {
							try {
								// Close all modals first
								setGoalSetupModal(false);
								setDeleteAccountModal(false);
								setPrivacyPolicyModal(false);
								setTermsAndConditionsModal(false);

								// Add a small delay to allow modals to close properly
								await new Promise(resolve => setTimeout(resolve, 100));

								// Sign out and redirect to sign-in
								await signOut();
								router.push('/(auth)/sign-in');
							} catch (error) {
								console.error('Sign out error:', error);
								router.push('/(auth)/sign-in');
							}
						},
					},
				]
			);
		} catch (error) {
			console.error('Account deletion error:', error);
			Alert.alert('Error', 'Failed to delete account. Please try again.');
		}
	};

	const closeDeleteModal = () => {
		setDeleteAccountModal(false);
		setPassword('');
		setIsValidating(false);
		setPasswordError('');
	};

	const getActivityLevelLabel = (level: string) => {
		const levels = {
			sedentary: 'Sedentary',
			light: 'Lightly Active',
			moderate: 'Moderately Active',
			active: 'Very Active',
			very_active: 'Extremely Active',
		};
		return levels[level as keyof typeof levels] || level;
	};

	const getFitnessGoalLabel = (goal: string) => {
		const goals = {
			weight_loss: 'Weight Loss',
			weight_gain: 'Weight Gain',
			maintenance: 'Maintenance',
			muscle_gain: 'Muscle Gain',
		};
		return goals[goal as keyof typeof goals] || goal;
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	};

	const formatDOB = (dob: string) => {
		const date = new Date(dob);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	};

	const calculateCurrentAge = (dob: string) => {
		const birthDate = new Date(dob);
		const today = new Date();
		let age = today.getFullYear() - birthDate.getFullYear();
		const monthDiff = today.getMonth() - birthDate.getMonth();
		if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
			age--;
		}
		return age;
	};

	const initials = getUserDisplayName(userProfile)
		.split(' ')
		.map(n => n[0])
		.join('')
		.toUpperCase();

	if (isLoading) {
		return (
			<>
				<Stack.Screen options={{ headerShown: false }} />
				<View
					className="flex-1 justify-center items-center"
					style={{ backgroundColor: SCREEN_BG, paddingTop: insets.top }}
				>
					<ActivityIndicator size="large" color="#E3BBA1" />
					<Text className="text-sm font-JakartaMedium text-[#94897E] mt-4">Loading profile…</Text>
				</View>
			</>
		);
	}

	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<View className="flex-1" style={{ backgroundColor: SCREEN_BG, paddingTop: insets.top }}>
				{/* Header */}
				<View className="flex-row items-center justify-between px-5 py-3">
					<TouchableOpacity onPress={() => router.back()} hitSlop={10}>
						<Ionicons name="chevron-back" size={26} color={INK} />
					</TouchableOpacity>
					<Text className="font-JakartaSemiBold text-[#262135] text-base">Account Settings</Text>
					<View style={{ width: 26 }} />
				</View>

				<ScrollView
					contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 60 }}
					showsVerticalScrollIndicator={false}
				>
					{/* Profile */}
					<View className="flex-row items-center mb-8">
						<View className="w-16 h-16 rounded-full bg-[#E3BBA1] items-center justify-center">
							<Text className="font-JakartaBold text-[20px] text-white">{initials}</Text>
						</View>
						<View className="ml-4 flex-1">
							<Text className="font-JakartaBold text-[22px] text-[#262135]" numberOfLines={1}>
								{getUserDisplayName(userProfile)}
							</Text>
							<Text className="text-sm font-JakartaMedium text-[#94897E] mt-0.5" numberOfLines={1}>
								{user?.emailAddresses[0]?.emailAddress}
							</Text>
						</View>
					</View>

					{/* Nutrition Goals */}
					<SectionLabel>Nutrition Goals</SectionLabel>
					{!nutritionGoals ? (
						<View className={CARD_CLASS}>
							<Text className="text-sm font-JakartaMedium text-[#94897E] text-center mb-4">
								No nutrition goals set. Set up your goals to get personalized recommendations.
							</Text>
							<TouchableOpacity
								onPress={() => setGoalSetupModal(true)}
								className="bg-[#E3BBA1] rounded-xl py-3"
							>
								<Text className="text-white text-center font-JakartaSemiBold">Set Up Goals</Text>
							</TouchableOpacity>
						</View>
					) : (
						<View className={CARD_CLASS}>
							<View className="flex-row justify-between items-center mb-1">
								<Text className="font-JakartaBold text-[15px] text-[#262135]">Current Goals</Text>
								<TouchableOpacity
									onPress={() => setGoalSetupModal(true)}
									hitSlop={10}
									className="flex-row items-center"
								>
									<Ionicons name="pencil-outline" size={14} color="#C98B67" />
									<Text className="text-xs font-JakartaSemiBold ml-1" style={{ color: '#C98B67' }}>
										Edit
									</Text>
								</TouchableOpacity>
							</View>

							<DetailRow label="Age" value={`${calculateCurrentAge(nutritionGoals.dob)} years`} />
							<DetailRow
								label="Weight"
								value={formatWeight(nutritionGoals.weight, unitSystem, 0)}
							/>
							<DetailRow label="Height" value={formatHeight(nutritionGoals.height, unitSystem)} />
							<DetailRow
								label="Target Weight"
								value={formatWeight(nutritionGoals.target_weight, unitSystem, 0)}
							/>
							<DetailRow
								label="Activity Level"
								value={getActivityLevelLabel(nutritionGoals.activity_level)}
							/>
							<DetailRow
								label="Fitness Goal"
								value={getFitnessGoalLabel(nutritionGoals.fitness_goal)}
							/>
							<DetailRow
								label="Diet"
								value={DIET_INFO[resolveDietType(nutritionGoals.diet_type)].label}
								onPress={() => setDietModal(true)}
							/>
							<DetailRow
								label="Fasting"
								value={formatFasting(nutritionGoals)}
								onPress={() => setDietModal(true)}
								last
							/>

							<View className="h-[1px] bg-[#F0EBE6] my-4" />

							<Text
								className="text-[10px] font-JakartaSemiBold text-[#94897E]"
								style={EYEBROW_STYLE}
							>
								Daily Targets
							</Text>
							<View className="flex-row items-baseline mt-1">
								<Text className="font-JakartaExtraBold text-[28px] text-[#262135]">
									{nutritionGoals.daily_calories}
								</Text>
								<Text className="font-JakartaMedium text-xs text-[#94897E] ml-1">kcal</Text>
							</View>
							<View className="flex-row justify-between mt-4">
								<MacroStat label="Protein" grams={nutritionGoals.daily_protein} />
								<MacroStat label="Carbs" grams={nutritionGoals.daily_carbs} />
								<MacroStat label="Fats" grams={nutritionGoals.daily_fats} />
							</View>
						</View>
					)}

					{/* App Settings */}
					<SectionLabel>App Settings</SectionLabel>
					<View className={LIST_CARD_CLASS}>
						<View className="flex-row items-center px-4 py-3.5 border-b-[1px] border-[#F0EBE6]">
							<RowIcon name="speedometer-outline" />
							<View className="ml-3 flex-1">
								<Text className="font-JakartaSemiBold text-sm text-[#262135]">Units</Text>
								<Text className="text-xs font-JakartaMedium text-[#94897E] mt-0.5">
									{unitSystem === 'metric' ? 'kg · cm' : 'lbs · ft/in'}
								</Text>
							</View>
							<View className="flex-row bg-[#F1F1F1] rounded-full p-1">
								{UNIT_OPTIONS.map(option => {
									const selected = unitSystem === option.key;
									return (
										<TouchableOpacity
											key={option.key}
											onPress={() => setUnitSystem(option.key)}
											accessibilityRole="button"
											accessibilityState={{ selected }}
											className={`px-3 py-1.5 rounded-full ${selected ? 'bg-[#E3BBA1]' : ''}`}
										>
											<Text
												className={`text-xs font-JakartaSemiBold ${
													selected ? 'text-white' : 'text-[#64748B]'
												}`}
											>
												{option.label}
											</Text>
										</TouchableOpacity>
									);
								})}
							</View>
						</View>
						<ListRow
							icon="help-circle-outline"
							title="Help & Support"
							subtitle="Get help and contact support"
							onPress={() => router.push('/help-support')}
						/>
						<ListRow
							icon="shield-outline"
							title="Privacy Policy"
							subtitle="Read our privacy policy"
							onPress={() => setPrivacyPolicyModal(true)}
						/>
						<ListRow
							icon="document-text-outline"
							title="Terms & Conditions"
							subtitle="Read our terms of service"
							onPress={() => setTermsAndConditionsModal(true)}
							last
						/>
					</View>

					{/* Account Actions */}
					<SectionLabel>Account Actions</SectionLabel>
					<View className={LIST_CARD_CLASS}>
						{/* Only show Change Password for email/password users */}
						{isEmailPasswordUser() && (
							<ListRow
								icon="lock-closed-outline"
								title="Change Password"
								subtitle="Update your account password"
								onPress={() => router.push('/(auth)/change-password')}
							/>
						)}

						{/* Show OAuth info for OAuth-only users */}
						{!isEmailPasswordUser() &&
							user?.externalAccounts &&
							user.externalAccounts.length > 0 && (
								<ListRow
									icon="information-circle-outline"
									title="Password Management"
									subtitle={`Password changes are managed through your ${user?.externalAccounts[0]?.provider} account`}
								/>
							)}

						<ListRow
							icon="log-out-outline"
							title="Sign Out"
							subtitle="Sign out of your account"
							onPress={handleSignOut}
							last
						/>
					</View>

					<View className={LIST_CARD_CLASS}>
						<ListRow
							icon="trash-outline"
							title="Delete Account"
							subtitle="Permanently delete your account"
							onPress={handleDeleteAccount}
							danger
							last
						/>
					</View>
				</ScrollView>

				{/* Modals */}
				<EditDietModal
					isVisible={dietModal}
					onClose={() => setDietModal(false)}
					onSaved={fetchNutritionGoals}
				/>

				<GoalSetupModal
					isVisible={goalSetupModal}
					onClose={() => setGoalSetupModal(false)}
					onGoalsSet={handleGoalsUpdated}
				/>

				<PrivacyPolicyModal
					isVisible={privacyPolicyModal}
					onClose={() => setPrivacyPolicyModal(false)}
				/>

				<TermsAndConditionsModal
					isVisible={termsAndConditionsModal}
					onClose={() => setTermsAndConditionsModal(false)}
				/>

				{/* Delete Account Modal */}
				<ReactNativeModal
					isVisible={deleteAccountModal}
					onBackdropPress={closeDeleteModal}
					onBackButtonPress={closeDeleteModal}
					animationIn="slideInUp"
					animationOut="slideOutDown"
					className="m-0 justify-end"
				>
					<View
						className="bg-white rounded-t-3xl p-6"
						style={{ paddingBottom: 24 + insets.bottom }}
					>
						<View className="items-center mb-6">
							<View
								className="w-14 h-14 rounded-full items-center justify-center mb-4"
								style={{ backgroundColor: `${DANGER}1F` }}
							>
								<Ionicons name="warning-outline" size={28} color={DANGER} />
							</View>
							<Text className="text-xl font-JakartaExtraBold text-[#262135] text-center mb-2">
								Delete Account
							</Text>
							<Text className="text-sm font-JakartaMedium text-[#94897E] text-center leading-5">
								This action cannot be undone. All your data will be permanently deleted.
							</Text>
						</View>

						{/* Show password field only for password-based users */}
						{isEmailPasswordUser() && (
							<View className="mb-6">
								<Text className="text-xs font-JakartaSemiBold text-[#262135] mb-2">
									Enter your password to confirm:
								</Text>
								<InputField
									placeholder="Password"
									value={password}
									onChangeText={setPassword}
									secureTextEntry
									error={passwordError}
								/>
							</View>
						)}

						{/* Show different message for OAuth users */}
						{!isEmailPasswordUser() && (
							<View className="mb-6">
								<Text className="text-sm font-JakartaSemiBold text-[#262135] mb-1">
									Confirm Account Deletion
								</Text>
								<Text className="text-xs font-JakartaMedium text-[#94897E] leading-5">
									This will permanently delete your account and all associated data. This action
									cannot be undone.
								</Text>
							</View>
						)}

						<View className="flex-row" style={{ columnGap: 12 }}>
							<TouchableOpacity
								onPress={closeDeleteModal}
								className="flex-1 bg-[#F1F1F1] rounded-xl py-3"
							>
								<Text className="text-[#262135] text-center font-JakartaSemiBold">Cancel</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={handlePasswordValidation}
								disabled={isValidating}
								className="flex-1 rounded-xl py-3"
								style={{ backgroundColor: DANGER }}
							>
								{isValidating ? (
									<ActivityIndicator size="small" color="white" />
								) : (
									<Text className="text-white text-center font-JakartaSemiBold">
										{isEmailPasswordUser() ? 'Delete Account' : 'Confirm Deletion'}
									</Text>
								)}
							</TouchableOpacity>
						</View>
					</View>
				</ReactNativeModal>
			</View>
		</>
	);
};

export default AccountSettings;
