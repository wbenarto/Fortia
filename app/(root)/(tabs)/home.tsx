import { SignedIn, SignedOut, useUser, useAuth } from '@clerk/clerk-expo'
import { CartesianChart, Line } from "victory-native";
import { Link } from 'expo-router'
import { View, Text , Image , ScrollView, TouchableOpacity, Button } from 'react-native';
import InputField from '@/components/InputField';
import { FontAwesome } from '@expo/vector-icons'
import { images } from '@/constants/index'
import ReactNativeModal from 'react-native-modal';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState, useEffect } from 'react';
import CustomButton from '@/components/CustomButton';
import { fetchAPI, useFetch } from '@/lib/fetch';
import { Weights } from '@/types/type';
import { LineChart } from 'react-native-gifted-charts';
// import { DATA } from '@/lib/data'

export default function Page() {
    const [addWeightModal, setAddWeightModal] = useState(false)
    const [ userWeights, setUserWeights ] = useState([])
    const [ showDatePicker, setShowDatePicker ] = useState(false)
    const { getToken } = useAuth()
    const [ weightForm, setWeightForm ] = useState({
        weight: '',
        date: new Date()
    })

    const DATA =[ {value:150}, {value:150}, {value:150}, {value:150},{value:150},{value:150},{value:150} ,{value:150} ]
    
    const { user } = useUser()
    // const DATA = Array.from({ length: 31 }, (_, i) => ({
    //     day: i,
    //     lowTmp: 20 + 10 * Math.random(),
    //     highTmp: 40 + 30 * Math.random(),
    //   }));
    

    const { 
        data,
        loading, 
        error
    } = useFetch<Weights[]>(`/(api)/weight`)
    console.log('weights data: ', data, loading,)

    useEffect(()=>{
        const fetchData = async () => {
            const token = await getToken()
            const response = await fetchAPI(`/(api)/weight?userId=${user?.id}`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": 'application/json'
                }
            })
            console.log('wow')

            const data = response.data

            console.log("fetchAPI in useeffect data: ", data.sort((a,b)=> a.date - b.date))
            // setUserWeights(data)
            setUserWeights(data.sort((a: any,b: any) => new Date(a.date)  - new Date(b.date)  ).map(({date, weight})=>({
                label: date.split('T')[0].slice(5), 
                value: +weight,
                dataPointText: `${weight}`
            })))
        }

        fetchData()
    }, [])


    const handleAddWeightModal = () => (
        setAddWeightModal(!addWeightModal)
    )

    const onChange = (event, selectedDate: any) => {
        console.log('selectedDate; ', selectedDate)
        console.log('weightform date state', weightForm.date)
        setShowDatePicker(false);
      
        if (selectedDate) {
          setWeightForm({...weightForm, date: selectedDate});
        }
    };

    console.log("user weights: ", userWeights)

    const handleWeightSubmission = async () => {
        console.log('ello', weightForm, user)

        try {
            await fetchAPI('/(api)/weight', {
                method: 'POST',
                body: JSON.stringify({
                    weight: weightForm.weight,
                    date: weightForm.date,
                    clerkId: user?.id
                })
            })
            setAddWeightModal(false)
            

        } catch (error) {
            console.error(error)
        }
       

    }
    
    return (
        <View>
        <SignedIn>
            <ScrollView className='bg-[#262135] w-full h-full  '>
                <View className=' w-full  pt-14 px-8'>
                    <Text className='text-white text-4xl mb-4 font-JakartaSemiBold'>
                        Hi,{'\n'}
                        {user?.firstName}
                    </Text>
                    <View className='w-full relative'>
                        <TouchableOpacity onPress={handleAddWeightModal}>
                            <FontAwesome name='plus' size={40} color='white' className='flex-end flex bg-red-100'/>
                        </TouchableOpacity>

                        <View className='w-full overflow-hidden p-2 rounded-xl '>
                   
                            <View className=' '>
                                <LineChart 
                                    color={'#ffffff'}
                                    data={userWeights}
                                    curved
                                    endSpacing={30}
                                    hideRules={true}
                                    yAxisOffset={130}
                                    dataPointsColor={'white'}
                                    data2={DATA}
                                    maxValue={50}
                                    yAxisColor="white"
                                    xAxisColor='white'
                                    xAxisLabelTextStyle={{ color: "white", fontSize: 12 }}
                                    yAxisTextStyle={{ color: "white", fontSize: 12 }}
                                    
                                />
                            </View>
                 
                            {/* {userWeights.map((e,i) => {
                                return (
                                    <View key={i} className='flex flex-row gap-4'>
                                        <Text >{e.date.split('T')[0]}</Text>
                                        <Text className='text-black'>{e.weight}</Text>
                                    </View>
                                )
                            })} */}
                        </View>
                        
                        {/* <Image source={images.Chart} className='object-contain w-full h-full' resizeMode='contain' /> */}

                    </View>
                </View>
                <View className='w-full  px-8 pb-40'>
                    <Text className='text-white text-3xl font-JakartaSemiBold mt-8'>
                        Your {'\n'}
                        Schedule
                    </Text>
                    <Text className='text-white mt-4'>
                        Today's Activity
                    </Text>
                    <View className='w-full '>
                        {/* Activity Component */}
                        <View className='h-20 my-2 w-full rounded-[20px] items-center justify-between flex-row'>
                            <View className='w-14 h-14 rounded-full bg-yellow-100 flex justify-center items-center'>
                                <View className='w-4 h-4 rounded-full bg-black'>

                                </View>
                            </View>
                            <View className='ml-4'>
                                <Text className='text-gray-100 text-lg '>Bench Press</Text>
                                <Text className='text-gray-200 '>4 sets of 12</Text>
                            </View>
                            <View className='w-20 h-10 bg-yellow-100 rounded-full flex justify-center items-center ml-auto'>
                                <Text className='text-md font-JakartaExtraBold'>
                                    Start
                                </Text>
                            </View>
                        </View>
                        <View className='h-20 w-full rounded-[20px] items-center justify-between flex-row'>
                            <View className='w-14 h-14 rounded-full bg-yellow-100 flex justify-center items-center'>
                                <View className='w-4 h-4 rounded-full bg-black'>

                                </View>
                            </View>
                            <View className='ml-4'>
                                <Text className='text-gray-100 text-lg '>Incline Dumbell Press</Text>
                                <Text className='text-gray-200 '>4 sets of 12</Text>
                            </View>
                            <View className='w-20 h-10 bg-yellow-100 rounded-full flex justify-center items-center ml-auto'>
                                <Text className='text-md font-JakartaExtraBold'>
                                    Start
                                </Text>
                            </View>
                        </View>
                        <View className='h-20 w-full rounded-[20px] items-center justify-between flex-row'>
                            <View className='w-14 h-14 rounded-full bg-yellow-100 flex justify-center items-center'>
                                <View className='w-4 h-4 rounded-full bg-black'>

                                </View>
                            </View>
                            <View className='ml-4'>
                                <Text className='text-gray-100 text-lg '>Ball Shooting Drill</Text>
                                <Text className='text-gray-200 '>50 made threes</Text>
                            </View>
                            <View className='w-20 h-10 bg-yellow-100 rounded-full flex justify-center items-center ml-auto'>
                                <Text className='text-md font-JakartaExtraBold'>
                                    Start
                                </Text>
                            </View>
                        </View><View className='h-20 w-full rounded-[20px] items-center justify-between flex-row'>
                            <View className='w-14 h-14 rounded-full bg-yellow-100 flex justify-center items-center'>
                                <View className='w-4 h-4 rounded-full bg-black'>

                                </View>
                            </View>
                            <View className='ml-4'>
                                <Text className='text-gray-100 text-lg '>Tricep Dips</Text>
                                <Text className='text-gray-200 '>4 sets of 8</Text>
                            </View>
                            <View className='w-20 h-10 bg-yellow-100 rounded-full flex justify-center items-center ml-auto'>
                                <Text className='text-md font-JakartaExtraBold'>
                                    Start
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                <ReactNativeModal isVisible={addWeightModal}
                    onBackdropPress={()=> setAddWeightModal(false)}
                    
                >
                    <View className='bg-white py-10 px-4 mx-10 rounded-md'>
                        <View className='pb-10 '>
                            <Text className='text-xl text-center font-JakartaSemiBold'>
                                Log your weight 
                            </Text>
                        </View>
                      
                        <View className='flex mx-auto w-full justify-center' >
                            
                            <DateTimePicker value={weightForm.date} mode="date" display="default" className='mx-auto ' style={{margin: 'auto'}} onChange={onChange} />
 
                            
                            <InputField 
                                label=''
                                placeholder='Enter your weight'
                                keyboardType='numeric'
                                value={weightForm.weight}
                                className='text-center flex p-4 '
                                onChangeText={(value)=> setWeightForm({...weightForm, weight: value})}
                            />
                            
                        </View>
                        <View className=''><Text className='text-lg text-center font-JakartaSemiBold'>lbs</Text></View>

                        <CustomButton onPress={handleWeightSubmission} title='Save'  />
                        
                        

                    </View>
                </ReactNativeModal>
            </ScrollView>
        </SignedIn>
        <SignedOut>
            <Link href="/(auth)/sign-in">
            <Text>Sign in</Text>
            </Link>
            <Link href="/(auth)/sign-up">
            <Text>Sign up</Text>
            </Link>
        </SignedOut>
        </View>
  )
}