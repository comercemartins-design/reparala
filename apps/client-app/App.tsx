import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'
import { AuthProvider, useAuth } from './src/hooks/useAuth'
import { ActivityIndicator, View } from 'react-native'

// Screens
import LoginScreen from './src/screens/LoginScreen'
import RegisterScreen from './src/screens/RegisterScreen'
import HomeScreen from './src/screens/HomeScreen'
import NewOrderScreen from './src/screens/NewOrderScreen'
import OrderStatusScreen from './src/screens/OrderStatusScreen'
import OrderHistoryScreen from './src/screens/OrderHistoryScreen'
import CompleteProfileScreen from './src/screens/CompleteProfileScreen'

const Stack = createNativeStackNavigator()

function AppNavigator() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#FF5A1F" />
      </View>
    )
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#FF5A1F' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      {!user ? (
        // Fluxo de autenticação
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
        </>
      ) : !user.client ? (
        // Perfil incompleto
        <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} options={{ title: 'Complete seu perfil', headerLeft: () => null }} />
      ) : (
        // App principal
        <>
          <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
          <Stack.Screen name="NewOrder" component={NewOrderScreen} options={{ title: 'Novo Chamado' }} />
          <Stack.Screen name="OrderStatus" component={OrderStatusScreen} options={{ title: 'Acompanhar Chamado' }} />
          <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} options={{ title: 'Meus Chamados' }} />
        </>
      )}
    </Stack.Navigator>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  )
}
