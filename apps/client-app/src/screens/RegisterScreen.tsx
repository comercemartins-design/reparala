import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { useAuth } from '../hooks/useAuth'

const ORANGE = '#FF5A1F'
const NAVY = '#0F172A'

export default function RegisterScreen({ navigation }: any) {
  const { signUp } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister() {
    if (!name || !email || !password) {
      Alert.alert('Atenção', 'Preencha nome, email e senha')
      return
    }
    if (password.length < 6) {
      Alert.alert('Atenção', 'A senha deve ter pelo menos 6 caracteres')
      return
    }
    setLoading(true)
    try {
      await signUp({ name, email: email.trim().toLowerCase(), password, phone })
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={s.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          bounces={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ─── MINI HERO ─── */}
          <View style={s.hero}>
            <View style={s.logoRow}>
              <Text style={s.logoEmoji}>🏠</Text>
              <View>
                <Text style={s.brand}>ReparaLá</Text>
                <Text style={s.brandSub}>MANUTENÇÃO PREDIAL</Text>
              </View>
            </View>
            <Text style={s.heroLine}>
              Crie sua conta grátis e acesse{'\n'}profissionais verificados.
            </Text>
          </View>

          {/* ─── FORM CARD ─── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Criar conta</Text>
            <Text style={s.cardSub}>Rápido, grátis e seguro ✅</Text>

            <Text style={s.label}>Nome completo *</Text>
            <TextInput
              style={s.input}
              placeholder="João Silva"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
            />

            <Text style={s.label}>Email *</Text>
            <TextInput
              style={s.input}
              placeholder="seu@email.com"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={s.label}>Telefone / WhatsApp</Text>
            <TextInput
              style={s.input}
              placeholder="(11) 99999-9999"
              placeholderTextColor="#9CA3AF"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <Text style={s.label}>Senha *</Text>
            <TextInput
              style={s.input}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={[s.btn, loading && s.btnOff]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnText}>Criar minha conta</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={s.loginLink} onPress={() => navigation.goBack()}>
              <Text style={s.loginText}>
                Já tem conta?{' '}
                <Text style={s.loginBold}>Entrar</Text>
              </Text>
            </TouchableOpacity>

            <View style={s.badges}>
              <Text style={s.badge}>🔒 Dados protegidos</Text>
              <Text style={s.badge}>🚫 Sem spam</Text>
              <Text style={s.badge}>🆓 100% grátis</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },

  /* Mini hero */
  hero: {
    paddingTop: Platform.OS === 'ios' ? 64 : 44,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16,
  },
  logoEmoji: { fontSize: 44 },
  brand: {
    fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -1,
  },
  brandSub: {
    fontSize: 9, fontWeight: '800', color: ORANGE, letterSpacing: 3,
  },
  heroLine: {
    fontSize: 16, color: 'rgba(255,255,255,0.7)',
    textAlign: 'center', lineHeight: 24,
  },

  /* Card */
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: Platform.OS === 'ios' ? 48 : 36,
    flex: 1,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 2 },
  cardSub: { fontSize: 13, color: '#9CA3AF', marginBottom: 8 },

  label: {
    fontSize: 13, fontWeight: '700', color: '#374151',
    marginBottom: 8, marginTop: 16,
  },
  input: {
    borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, backgroundColor: '#F9FAFB', color: '#111',
  },
  btn: {
    backgroundColor: ORANGE, borderRadius: 14,
    paddingVertical: 17, alignItems: 'center', marginTop: 28,
    shadowColor: ORANGE, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45, shadowRadius: 12, elevation: 8,
  },
  btnOff: { opacity: 0.6, shadowOpacity: 0, elevation: 0 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.4 },

  loginLink: { alignItems: 'center', marginTop: 22 },
  loginText: { color: '#6B7280', fontSize: 14 },
  loginBold: { color: ORANGE, fontWeight: '800' },

  badges: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 12, marginTop: 20,
  },
  badge: { fontSize: 11, color: '#9CA3AF' },
})
