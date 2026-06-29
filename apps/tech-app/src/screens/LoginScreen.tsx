import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native'
import { useAuth } from '../hooks/useAuth'

export default function LoginScreen() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [slowWarning, setSlowWarning] = useState(false)

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Atenção', 'Preencha email e senha')
      return
    }
    setLoading(true)
    setSlowWarning(false)
    const slowTimer = setTimeout(() => setSlowWarning(true), 5000)
    try {
      await signIn(email.trim().toLowerCase(), password)
    } catch (error: any) {
      Alert.alert('Erro ao entrar', error.response?.data?.error || error.message || 'Email ou senha inválidos')
    } finally {
      clearTimeout(slowTimer)
      setLoading(false)
      setSlowWarning(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <Text style={styles.emoji}>🔧</Text>
        <Text style={styles.title}>Repara Lá</Text>
        <Text style={styles.subtitle}>Portal do Técnico</Text>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="seuemail@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Senha</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Entrar</Text>
            }
          </TouchableOpacity>

          {slowWarning && (
            <View style={{ backgroundColor: '#FEF3C7', borderRadius: 8, padding: 10, marginBottom: 8 }}>
              <Text style={{ fontSize: 12, color: '#92400E', textAlign: 'center' }}>
                ⏳ Servidor acordando... pode levar até 30 segundos na primeira vez.
              </Text>
            </View>
          )}

          <Text style={styles.hint}>Sua conta é criada pelo administrador do sistema.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1E40AF' },
  header: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emoji: { fontSize: 64, marginBottom: 12 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 16, color: '#93C5FD', marginTop: 4 },
  form: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    paddingBottom: 40,
  },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    backgroundColor: '#F9FAFB',
    color: '#111',
  },
  button: {
    backgroundColor: '#1E40AF',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  hint: { textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginTop: 16 },
})
