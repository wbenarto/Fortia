import {
	KeyboardAvoidingView,
	TouchableWithoutFeedback,
	View,
	Text,
	Image,
	TextInput,
	Platform,
	Keyboard,
} from 'react-native';

interface InputFieldProps {
	label?: string;
	labelStyle?: string;
	icon?: any;
	secureTextEntry?: boolean;
	containerStyle?: string;
	inputStyle?: string;
	iconStyle?: string;
	className?: string;
	testID?: string;
	onChangeText: (text: string) => void;
	[key: string]: any;
}

const InputField = ({
	label,
	labelStyle,
	icon,
	secureTextEntry = false,
	containerStyle,
	inputStyle,
	iconStyle,
	className,
	testID,
	...props
}: InputFieldProps) => (
	<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
		<TouchableWithoutFeedback onPress={Keyboard.dismiss}>
			<View className="my-2 w-full">
				{label && (
					<Text className={`text-sm font-JakartaSemiBold mb-2 text-black ${labelStyle}`}>
						{label}
					</Text>
				)}
				<View
					className={`flex flex-row justify-start items-center relative rounded-md
                    focus:border-primary-500 ${containerStyle}
                `}
				>
					{icon && <Image source={icon} className={`w-6 h-6 ml-4 ${iconStyle}`} />}
					<TextInput
						className={`px-2 py-2 font-JakartaSemiBold border-b-[1px] border-gray-400 text-sm flex-1 ${inputStyle} text-left`}
						secureTextEntry={secureTextEntry}
						testID={testID}
						{...props}
					/>
				</View>
			</View>
		</TouchableWithoutFeedback>
	</KeyboardAvoidingView>
);

export default InputField;
