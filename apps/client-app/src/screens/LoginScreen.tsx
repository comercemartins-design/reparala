import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { useAuth } from '../hooks/useAuth'

const ORANGE = '#FF5A1F'
const NAVY = '#0F172A'

export default function LoginScreen({ navigation }: any) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Atenção', 'Preencha email e senha')
      return
    }
    setLoading(true)
    try {
      await signIn(email.trim().toLowerCase(), password)
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Email ou senha inválidos')
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
          {/* ─── HERO ─── */}
          <View style={s.hero}>
            {/* Logo mark */}
            <View style={s.logoWrap}>
              <Text style={s.logoHouse}>🏠</Text>
              <View style={s.logoOrangeDot}>
                <Text style={s.logoWrench}>🔧</Text>
              </View>
            </View>

            <Text style={s.brand}>ReparaLá</Text>
            <Text style={s.brandSub}>MANUTENÇÃO PREDIAL</Text>

            <Text style={s.headline}>
              Tudo que seu imóvel{'\n'}
              <Text style={s.headlineHighlight}>precisa, a um clique.</Text>
            </Text>

            {/* Service chips */}
            <View style={s.chips}>
              {[
                { icon: '💧', label: 'Hidráulica' },
                { icon: '🔩', label: 'Serralheria' },
                { icon: '🏗️', label: 'Civil' },
                { icon: '⚡', label: 'Elétrica' },
              ].map((item) => (
                <View key={item.label} style={s.chip}>
                  <Text style={s.chipIcon}>{item.icon}</Text>
                  <Text style={s.chipLabel}>{item.label}</Text>
                </View>
              ))}
            </View>

            {/* Trust row */}
            <View style={s.trust}>
              <Text style={s.trustItem}>✅ Verificados</Text>
              <View style={s.trustSep} />
              <Text style={s.trustItem}>⚡ Rápido</Text>
              <View style={s.trustSep} />
              <Text style={s.trustItem}>🛡️ Garantido</Text>
            </View>
          </View>

          {/* ─── FORM CARD ─── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Entre na sua conta</Text>

            <Text style={s.label}>Email</Text>
            <TextInput
              style={s.input}
              placeholder="seu@email.com"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={s.label}>Senha</Text>
            <TextInput
              style={s.input}
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={[s.btn, loading && s.btnOff]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnText}>Entrar</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={s.regLink}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={s.regText}>
                Não tem conta?{' '}
                <Text style={s.regBold}>Cadastre-se grátis</Text>
              </Text>
            </TouchableOpacity>

            <Text style={s.footer}>
              Segurança para você  •  Valor para o seu imóvel
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },

  /* Hero */
  hero: {
    paddingTop: Platform.OS === 'ios' ? 64 : 44,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  logoWrap: { position: 'relative', width: 72, height: 72, marginBottom: 12 },
  logoHouse: { fontSize: 60, lineHeight: 72 },
  logoOrangeDot: {
    position: 'absolute', bottom: 0, right: -4,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: ORANGE,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: NAVY,
  },
  logoWrench: { fontSize: 13 },

  brand: {
    fontSize: 38, fontWeight: '900', color: '#fff',
    letterSpacing: -1.5, marginBottom: 2,
  },
  brandSub: {
    fontSize: 11, fontWeight: '800', color: ORANGE,
    letterSpacing: 4, marginBottom: 22,
  },
  headline: {
    fontSize: 22, color: 'rgba(255,255,255,0.75)',
    textAlign: 'center', lineHeight: 32, marginBottom: 22,
  },
  headlineHighlight: { color: '#fff', fontWeight: '800' },

  /* Chips */
  chips: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'center', gap: 8, marginBottom: 22,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20, paddingVertical: 7, paddingHorizontal: 13,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  chipIcon: { fontSize: 14 },
  chipLabel: { fontSize: 12, color: '#fff', fontWeight: '600' },

  /* Trust */
  trust: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10,
  },
  trustItem: { fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: '500' },
  trustSep: {
    width: 3, height: 3, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
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
  cardTitle: {
    fontSize: 22, fontWeight: '800', color: '#111827',
    marginBottom: 20,
  },
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

  regLink: { alignItems: 'center', marginTop: 22 },
  regText: { color: '#6B7280', fontSize: 14 },
  regBold: { color: ORANGE, fontWeight: '800' },

  footer: {
    textAlign: 'center', marginTop: 24,
    fontSize: 11, color: '#D1D5DB', letterSpacing: 0.3,
  },
})
