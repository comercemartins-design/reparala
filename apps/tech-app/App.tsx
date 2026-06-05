import React, { useEffect, useRef } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { StatusBar } from 'expo-status-bar'
import { ActivityIndicator, View, Text, Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'

import { AuthProvider, useAuth } from './src/hooks/useAuth'
import api from './src/services/api'
import { navigationRef } from './src/services/navigationService'

import LoginScreen from './src/screens/LoginScreen'
import DashboardScreen from './src/screens/DashboardScreen'
import OrderOfferScreen from './src/screens/OrderOfferScreen'
import ActiveOrderScreen from './src/screens/ActiveOrderScreen'
import HistoryScreen from './src/screens/HistoryScreen'
import ProfileScreen from './src/screens/ProfileScreen'

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
const Tab = createBottomTabNavigator()

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{icon}</Text>
  )
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1E40AF' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        tabBarActiveTintColor: '#1E40AF',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: { paddingBottom: Platform.OS === 'ios' ? 20 : 8, height: Platform.OS === 'ios' ? 88 : 60 },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Chamados',
          tabBarLabel: 'Chamados',
          tabBarIcon: ({ focused }) => <TabIcon icon="🔧" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          title: 'Histórico',
          tabBarLabel: 'Histórico',
          tabBarIcon: ({ focused }) => <TabIcon icon="📋" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Perfil',
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  )
}

function AppNavigator() {
  const { user, loading } = useAuth()
  const notificationListener = useRef<any>()
  const responseListener = useRef<any>()

  useEffect(() => {
    if (user) registerPushToken()

    notificationListener.current = Notifications.addNotificationReceivedListener(() => {})

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as any
      if (data?.orderId && navigationRef.isReady()) {
        if (data?.screen === 'OrderOffer' || data?.screen === 'ActiveOrder') {
          navigationRef.navigate(data.screen || 'OrderOffer' as never, { orderId: data.orderId } as never)
        }
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
        <ActivityIndicator size="large" color="#1E40AF" />
      </View>
    )
  }

  return (
    <NavigationContainer ref={navigationRef as any}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#1E40AF' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen
              name="OrderOffer"
              component={OrderOfferScreen}
              options={{ title: 'Detalhes do Chamado' }}
            />
            <Stack.Screen
              name="ActiveOrder"
              component={ActiveOrderScreen}
              options={{ title: 'Chamado em Andamento' }}
            />
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
