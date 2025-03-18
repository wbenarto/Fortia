import { KeyboardAvoidingView , TouchableWithoutFeedback, View, Text, Image, TextInput, Platform, Keyboard } from 'react-native'

interface InputFieldProps {
  label: string;
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
            <View className='my-2 w-full'>
                <Text className={`text-lg font-JakartaSemiBold mb-3 text-white ${labelStyle}`}>
                    {label}
                </Text>
                <View className={`flex flex-row justify-start items-center relative bg-neutral-100 rounded-full border border-neutral-100
                    focus:border-primary-500 ${containerStyle}
                `}>
                    {icon && <Image source={icon} className={`w-6 h-6 ml-4 ${iconStyle}`}/>}
                    <TextInput 
                        className={`rounded-full p-4 font-JakartaSemiBold text-[15px] flex-1 ${inputStyle} text-left`}
                        secureTextEntry={secureTextEntry}
                        testID={testID}
                        {...props}
                    />
                </View>
            </View>
        </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
)

export default InputField