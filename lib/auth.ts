import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import { TokenCache } from '@clerk/clerk-expo/dist/cache'
import * as Linking from 'expo-linking';
import { fetchAPI } from '@/lib/fetch';

const createTokenCache = (): TokenCache => {
  return {
    getToken: async (key: string) => {
      try {
        const item = await SecureStore.getItemAsync(key)
        if (item) {
          console.log(`${key} was used 🔐 \n`)
        } else {
          console.log('No values stored under key: ' + key)
        }
        return item
      } catch (error) {
        console.error('secure store get item error: ', error)
        await SecureStore.deleteItemAsync(key)
        return null
      }
    },
    saveToken: (key: string, token: string) => {
      return SecureStore.setItemAsync(key, token)
    },
  }
}

export const googleOAuth = async ( startOAuthFlow: any ) => {
  try {
    const { createdSessionId, signIn, signUp, setActive } = await startOAuthFlow({
      redirectUrl: Linking.createURL('/(root)/(tabs)/home', { scheme: 'myapp' }),
    })

    // If sign in was successful, set the active session
    if (createdSessionId) {
      if (setActive) {
        await setActive!({ session: createdSessionId })

        if (signUp.createdUserId) {
          await fetchAPI('/(api)/user', {
            method: "POST",
            body: JSON.stringify({
              name: `${signUp.firstName} ${signUp.lastName}`,
              email: signUp.emailAddress,
              clerkId: signUp.createdUserId
            })
          })
        }
        return {
          success: true,
          code: "success",
          message: "You have successfully authenticated"
        }
      }
    }
    return {
      success: false,
      message: "An error occured"
    }
  } catch (error : any) {
    console.error(error)
    return {
      success: false,
      code: error.code,
      message: error?.errors[0]?.longMessage
    }
  }
}

// SecureStore is not supported on the web
export const tokenCache = Platform.OS !== 'web' ? createTokenCache() : undefined