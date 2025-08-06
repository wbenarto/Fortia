import { TouchableOpacity, Text } from 'react-native';

const getBgVariantStyle = (variant: ButtonProps['bgVariant'], disabled?: boolean) => {
	if (disabled) {
		return 'bg-gray-300';
	}

	switch (variant) {
		case 'primary':
			return 'bg-[#E3BBA1]';
		case 'secondary':
			return 'bg-gray-500';
		case 'danger':
			return 'bg-red-500';
		case 'success':
			return 'bg-green-500';
		case 'outline':
			return 'bg-transparent border-neutral-300 border-[0.5px]';
		default:
			return 'bg-[#E3BBA1]';
	}
};

const getTextVariantStyle = (variant: ButtonProps['textVariant'], disabled?: boolean) => {
	if (disabled) {
		return 'text-gray-500';
	}

	switch (variant) {
		case 'primary':
			return 'text-[#E3BBA1]';
		case 'secondary':
			return 'text-gray-100';
		case 'success':
			return 'text-green-100';
		case 'danger':
			return 'text-red-100';
		case 'black':
			return 'text-black';
		default:
			return 'text-white';
	}
};

interface ButtonProps {
	onPress: () => void;
	title: string;
	bgVariant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
	textVariant?: 'default' | 'primary' | 'secondary' | 'success' | 'danger' | 'black';
	IconLeft?: React.ComponentType<any>;
	IconRight?: React.ComponentType<any>;
	textProp?: string;
	className?: string;
	width?: string | number;
	testID?: string;
	disabled?: boolean;
}

const CustomButton = ({
	onPress,
	title,
	bgVariant = 'primary',
	textVariant = 'default',
	IconLeft,
	IconRight,
	className,
	textProp,
	width,
	testID,
	disabled = false,
	...props
}: ButtonProps) => (
	<TouchableOpacity
		onPress={disabled ? undefined : onPress}
		className={`w-${width} p-4 my-2 rounded-lg flex flex-row justify-center items-center shadow-sm shadow-neutral-400/70 ${getBgVariantStyle(bgVariant, disabled)} ${className}`}
		testID={testID}
		{...props}
	>
		{IconLeft && <IconLeft />}
		<Text
			className={`mx-1 font-JakartaBold ${textProp} ${getTextVariantStyle(textVariant, disabled)}`}
		>
			{title}
		</Text>
		{IconRight && <IconRight />}
	</TouchableOpacity>
);

export default CustomButton;
