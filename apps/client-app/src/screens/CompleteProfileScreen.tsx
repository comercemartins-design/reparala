import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView,
} from 'react-native'
import api from '../services/api'

const CLIENT_TYPES = [
  { key: 'RESIDENCE', label: 'Residência', icon: '🏠', desc: 'Casa ou apartamento' },
  { key: 'COMPANY', label: 'Empresa', icon: '🏢', desc: 'Estabelecimento comercial' },
  { key: 'CONDO', label: 'Condomínio', icon: '🏗️', desc: 'Área comum ou unidade' },
]

export default function CompleteProfileScreen({ navigation }: any) {
  const [type, setType] = useState('RESIDENCE')
  const [addressLine, setAddressLine] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [condoName, setCondoName] = useState('')
  const [condoBlock, setCondoBlock] = useState('')
  const [condoFloor, setCondoFloor] = useState('')
  const [condoUnit, setCondoUnit] = useState('')
  const [loading, setLoading] = useState(false)

  async function fetchAddress(cep: string) {
    const clean = cep.replace(/\D/g, '')
    if (clean.length !== 8) return
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setAddressLine(data.logradouro)
        setCity(data.localidade)
        setState(data.uf)
      }
    } catch {}
  }

  async function handleSave() {
    if (!addressLine || !city || !state || !zipCode) {
      Alert.alert('Atenção', 'Preencha o endereço completo')
      return
    }
    setLoading(true)
    try {
      await api.post('/clients/profile', {
        type,
        addressLine,
        city,
        state,
        zipCode: zipCode.replace(/\D/g, ''),
        ...(type === 'CONDO' && {
          condoName,
          condoBlock,
          condoFloor: condoFloor ? parseInt(condoFloor) : undefined,
          condoUnit,
        }),
      })
      Alert.alert('Pronto!', 'Perfil configurado com sucesso', [
        { text: 'Continuar', onPress: () => navigation.replace('Home') }
      ])
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao salvar perfil')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Quase lá! 👋</Text>
      <Text style={styles.subtitle}>Precisamos de mais alguns dados para encontrar técnicos perto de você.</Text>

      <Text style={styles.sectionTitle}>Tipo de local</Text>
      <View style={styles.typeRow}>
        {CLIENT_TYPES.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.typeCard, type === t.key && styles.typeCardActive]}
            onPress={() => setType(t.key)}
          >
            <Text style={styles.typeIcon}>{t.icon}</Text>
            <Text style={[styles.typeLabel, type === t.key && styles.typeLabelActive]}>{t.label}</Text>
            <Text style={styles.typeDesc}>{t.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Endereço</Text>

      <Text style={styles.label}>CEP</Text>
      <TextInput
        style={styles.input}
        placeholder="00000-000"
        value={zipCode}
        onChangeText={(v) => { setZipCode(v); fetchAddress(v) }}
        keyboardType="numeric"
        maxLength={9}
      />

      <Text style={styles.label}>Endereço</Text>
      <TextInput
        style={styles.input}
        placeholder="Rua, número"
        value={addressLine}
        onChangeText={setAddressLine}
      />

      <View style={styles.row}>
        <View style={{ flex: 2, marginRight: 8 }}>
          <Text style={styles.label}>Cidade</Text>
          <TextInput style={styles.input} placeholder="São Paulo" value={city} onChangeText={setCity} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Estado</Text>
          <TextInput
            style={styles.input}
            placeholder="SP"
            value={state}
            onChangeText={setState}
            maxLength={2}
            autoCapitalize="characters"
          />
        </View>
      </View>

      {type === 'CONDO' && (
        <>
          <Text style={styles.sectionTitle}>Dados do Condomínio</Text>
          <Text style={styles.label}>Nome do condomínio</Text>
          <TextInput
            style={styles.input}
            placeholder="Residencial das Flores"
            value={condoName}
            onChangeText={setCondoName}
          />
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>Bloco</Text>
              <TextInput style={styles.input} placeholder="A" value={condoBlock} onChangeText={setCondoBlock} />
            </View>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>Andar</Text>
              <TextInput
                style={styles.input}
                placeholder="3"
                value={condoFloor}
                onChangeText={setCondoFloor}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Unidade</Text>
              <TextInput style={styles.input} placeholder="301" value={condoUnit} onChangeText={setCondoUnit} />
            </View>
          </View>
        </>
      )}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Salvar e continuar</Text>}
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 24, lineHeight: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginTop: 20, marginBottom: 12 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeCard: {
    flex: 1, padding: 12, borderRadius: 10, borderWidth: 2,
    borderColor: '#e5e5e5', alignItems: 'center', backgroundColor: '#fafafa',
  },
  typeCardActive: { borderColor: '#FF5A1F', backgroundColor: '#fff5f2' },
  typeIcon: { fontSize: 24, marginBottom: 4 },
  typeLabel: { fontSize: 12, fontWeight: '700', color: '#666' },
  typeLabelActive: { color: '#FF5A1F' },
  typeDesc: { fontSize: 10, color: '#aaa', textAlign: 'center', marginTop: 2 },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    padding: 13, fontSize: 15, backgroundColor: '#fafafa',
  },
  row: { flexDirection: 'row' },
  button: {
    backgroundColor: '#FF5A1F', borderRadius: 10,
    padding: 16, alignItems: 'center', marginTop: 28,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
})