import { Stack, Tabs } from 'expo-router';
import { View, Image } from 'react-native';
import { icons } from '@/constants/index';

const TabIcon = ({ source, focused}:  
  {source: ImageSourcePropType; 
  focused: Boolean; 
}) => (
  <View className={`flex flex-row justify-center items-center rounded-full ${focused ? 'bg-general-100' : ''}`}>
    <View className={`rounded-full w-14 h-14 items-center justify-center ${focused ? "bg-general-300" : "bg-general-600"}`}>
      <Image source={source} tintColor='#5A556B' resizeMode='contain' className='w-7 h-7'/>
    </View>
  </View>
)

const Layout = () => {
  

  return (
   
      <Tabs initialRouteName="home" screenOptions={{
        tabBarActiveTintColor:'white',
        tabBarInactiveTintColor:'white',
        tabBarShowLabel:false,
        tabBarStyle: {
          backgroundColor: '#5A556B',
          borderRadius: 50,
          marginHorizontal: 20,
          overflow: 'hidden',
          padding: 0,
          marginBottom: 20,
          height: 78,
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'absolute'
        }
       
      }}>
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            headerShown: false,
            tabBarIcon: ({focused})=> <TabIcon focused={focused} source={icons.Home} />

          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            headerShown: false,
            tabBarIcon: ({focused})=> <TabIcon focused={focused} source={icons.Profile} />

          }}
        />

      </Tabs>
   

  );
}

export default Layout;