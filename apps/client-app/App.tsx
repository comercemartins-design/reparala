import React, { useEffect, useRef } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'
import { ActivityIndicator, View } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'

import { AuthProvider, useAuth } from './src/hooks/useAuth'
import api from './src/services/api'
import { navigationRef } from './src/services/navigationService'

// Screens
import LoginScreen from './src/screens/LoginScreen'
import RegisterScreen from './src/screens/RegisterScreen'
import HomeScreen from './src/screens/HomeScreen'
import NewOrderScreen from './src/screens/NewOrderScreen'
import OrderStatusScreen from './src/screens/OrderStatusScreen'
import OrderHistoryScreen from './src/screens/OrderHistoryScreen'
import CompleteProfileScreen from './src/screens/CompleteProfileScreen'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

const Stack = createNativeStackNavigator()

function AppNavigator() {
  const { user, loading } = useAuth()
  const notificationListener = useRef<any>()
  const responseListener = useRef<any>()

  useEffect(() => {
    if (user?.client) registerPushToken()

    notificationListener.current = Notifications.addNotificationReceivedListener(() => {})

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as any
      if (data?.orderId && navigationRef.isReady()) {
        navigationRef.navigate('OrderStatus' as never, { orderId: data.orderId } as never)
      }
    })

    return () => {
      notificationListener.current?.remove()
      responseListener.current?.remove()
    }
  }, [user])

  async function registerPushToken() {
    if (!Device.isDevice) return
    const { status } = await Notifications.requestPermissionsAsync()
    if (status !== 'granted') return
    const token = (await Notifications.getExpoPushTokenAsync()).data
    try {
      await api.patch('/auth/push-token', { pushToken: token })
    } catch {}
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#FF5A1F" />
      </View>
    )
  }

  return (
    <NavigationContainer ref={navigationRef as any}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#FF5A1F' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
          </>
        ) : !user.client ? (
          <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} options={{ title: 'Complete seu perfil', headerLeft: () => null }} />
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="NewOrder" component={NewOrderScreen} options={{ title: 'Novo Chamado' }} />
            <Stack.Screen name="OrderStatus" component={OrderStatusScreen} options={{ title: 'Acompanhar Chamado' }} />
            <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} options={{ title: 'Meus Chamados' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <AppNavigator />
    </AuthProvider>
  )
}
