import {TouchableOpacity, Text} from 'react-native';

const getBgVariantStyle = (variant: ButtonProps['bgVariant']) => {
    switch (variant) {
        case "secondary":
            return "bg-gray-500";
        case "danger":
            return "bg-red-500";
        case "success":
            return "bg-green-500";
        case "outline":
            return "bg-transparent border-neutral-300 border-[0.5px]";  
        default: 
            return 'bg-[#494358]'
    }
}

const getTextVariantStyle = (variant: ButtonProps['textVariant']) => {
    switch (variant) {
        case "primary":
            return "text-black";
        case "secondary":
            return "text-gray-100";
        case "success":
            return "text-green-100";
        case "danger":
            return "text-red-100";  
        default: 
            return 'text-white'
    }
}



const CustomButton = ({onPress, title, bgVariant='primary', textVariant='default', IconLeft, IconRight, className, width, ...props}: ButtonProps) => (
    <TouchableOpacity onPress={onPress}
        className={`w-${width} p-3 mt-4 rounded-full flex flex-row justify-center items-center shadow-md shadow-neutral-400/70 ${getBgVariantStyle(bgVariant)} ${className}`}
        {...props}
    >
        {IconLeft && <IconLeft />}
        <Text className={`text-lg font-bold ${getTextVariantStyle(textVariant)}`}>{title}</Text>
        {IconRight && <IconRight />}
    </TouchableOpacity>
)

export default CustomButton; 