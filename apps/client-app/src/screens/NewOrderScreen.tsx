import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, Image,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import * as FileSystem from 'expo-file-system/legacy'
import Constants from 'expo-constants'
import api from '../services/api'
import { useAuth } from '../hooks/useAuth'

const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl as string
const SUPABASE_KEY = Constants.expoConfig?.extra?.supabaseAnonKey as string

async function uploadToStorage(photoUri: string, filename: string): Promise<string> {
  const result = await FileSystem.uploadAsync(
    `${SUPABASE_URL}/storage/v1/object/order-media/${filename}`,
    photoUri,
    {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'image/jpeg',
        'x-upsert': 'true',
      },
    }
  )
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Upload falhou (${result.status}): ${result.body}`)
  }
  return `${SUPABASE_URL}/storage/v1/object/public/order-media/${filename}`
}

const SUBCATEGORIES: Record<string, { key: string; label: string }[]> = {
  HID: [
    { key: 'VAZ', label: 'Vazamento' },
    { key: 'ENT', label: 'Entupimento' },
    { key: 'TOR', label: 'Torneira/Registro' },
    { key: 'CIS', label: "Caixa d'água" },
    { key: 'VAL', label: 'Válvula/Descarga' },
    { key: 'OUT', label: 'Outro' },
  ],
  CIV: [
    { key: 'TRI', label: 'Trinca/Rachadura' },
    { key: 'REV', label: 'Piso/Revestimento' },
    { key: 'PIN', label: 'Pintura' },
    { key: 'TEL', label: 'Telhado/Calha' },
    { key: 'OUT', label: 'Outro' },
  ],
  SER: [
    { key: 'POR', label: 'Porta/Portão' },
    { key: 'GRA', label: 'Grade/Cerca' },
    { key: 'FEC', label: 'Fechadura' },
    { key: 'COR', label: 'Corrimão' },
    { key: 'OUT', label: 'Outro' },
  ],
  ELE: [
    { key: 'QDA', label: 'Quadro/Disjuntor' },
    { key: 'TOM', label: 'Tomada/Interruptor' },
    { key: 'FIA', label: 'Fiação/Cabeamento' },
    { key: 'ILU', label: 'Iluminação' },
    { key: 'CUR', label: 'Curto-Circuito' },
    { key: 'OUT', label: 'Outro' },
  ],
}

const PRIORITIES = [
  { key: 'NORMAL', label: 'Normal', desc: 'Até 24 horas', color: '#3B82F6' },
  { key: 'HIGH', label: 'Urgente', desc: 'Até 4 horas', color: '#F59E0B' },
  { key: 'CRITICAL', label: 'Crítico', desc: 'Até 1 hora', color: '#EF4444' },
]

export default function NewOrderScreen({ route, navigation }: any) {
  const { category } = route.params
  const subcats = SUBCATEGORIES[category.key] || []
  const { user } = useAuth()

  const [step, setStep] = useState(1) // 1=subcat, 2=prioridade, 3=técnico, 4=detalhes
  const [subcategory, setSubcategory] = useState('')
  const [priority, setPriority] = useState('NORMAL')
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [matriculaInput, setMatriculaInput] = useState('')
  const [techSearching, setTechSearching] = useState(false)
  const [requestedTech, setRequestedTech] = useState<null | { id: string; name: string; specialties: string[]; rating: number; photoUrl?: string; available: boolean }>(null)
  const [techSearchError, setTechSearchError] = useState('')

  async function searchTechByMatricula() {
    const code = matriculaInput.trim().toUpperCase()
    if (!code) { setTechSearchError('Digite a matrícula do técnico'); return }
    setTechSearching(true)
    setTechSearchError('')
    setRequestedTech(null)
    try {
      const res = await api.get(`/technicians/by-matricula/${code}`)
      setRequestedTech(res.data.data)
    } catch {
      setTechSearchError('Técnico não encontrado. Verifique a matrícula.')
    } finally {
      setTechSearching(false)
    }
  }

  async function pickPhoto() {
    if (photos.length >= 3) {
      Alert.alert('Limite', 'Máximo de 3 fotos por chamado')
      return
    }
    Alert.alert('Adicionar foto', 'Como deseja adicionar?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: '📷 Tirar foto', onPress: pickFromCamera },
      { text: '🖼️ Da galeria', onPress: pickFromGallery },
    ])
  }

  async function pickFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (perm.status !== 'granted') {
      Alert.alert('Permissão necessária', 'Permita o acesso à câmera nas configurações do celular.')
      return
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
    await processPickedPhoto(result)
  }

  async function pickFromGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (perm.status !== 'granted') {
      Alert.alert('Permissão necessária', 'Permita o acesso à galeria nas configurações do celular.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 })
    await processPickedPhoto(result)
  }

  async function processPickedPhoto(result: ImagePicker.ImagePickerResult) {
    if (!result.canceled) {
      const compressed = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      )
      setPhotos((prev) => [...prev, compressed.uri])
    }
  }

  async function handleSubmit() {
    if (!subcategory) { Alert.alert('Atenção', 'Selecione o tipo do problema'); return }
    setLoading(true)
    try {
      // Resolve o endereço real do cliente
      const client = user?.client
      const baseAddress = client?.addressLine || ''
      const serviceCity = client?.city || ''

      // Em condomínio, anexa bloco/andar/unidade para o técnico localizar a unidade exata
      let serviceAddress = baseAddress
      if (client?.type === 'CONDO') {
        const condoParts: string[] = []
        if (client?.condoName) condoParts.push(client.condoName)
        if (client?.condoBlock) condoParts.push(`Bloco ${client.condoBlock}`)
        if (client?.condoFloor != null) condoParts.push(`${client.condoFloor}º andar`)
        if (client?.condoUnit) condoParts.push(`Unidade ${client.condoUnit}`)
        if (condoParts.length > 0) {
          serviceAddress = baseAddress
            ? `${baseAddress} — ${condoParts.join(', ')}`
            : condoParts.join(', ')
        }
      }

      if (!baseAddress || !serviceCity) {
        Alert.alert('Endereço incompleto', 'Complete seu perfil com endereço antes de abrir um chamado.')
        setLoading(false)
        return
      }

      // Cria o chamado
      const orderRes = await api.post('/orders', {
        category: category.key,
        subcategory,
        priority,
        description,
        serviceAddress,
        serviceCity,
        ...(requestedTech ? { requestedTechnicianId: requestedTech.id } : {}),
      })
      const orderId = orderRes.data.data.id

      // Upload das fotos para Supabase Storage — falha não bloqueia o chamado
      let photoFailCount = 0
      for (const photoUri of photos) {
        const filename = `orders/${orderId}/${Date.now()}.jpg`
        try {
          const publicUrl = await uploadToStorage(photoUri, filename)
          await api.post(`/orders/${orderId}/media`, {
            url: publicUrl, phase: 'REPORT', mimeType: 'image/jpeg',
          })
        } catch {
          photoFailCount++
        }
      }

      const photoWarning = photoFailCount > 0
        ? `\n\nAtenção: ${photoFailCount} foto(s) não enviada(s). Tente reenviar mais tarde.`
        : ''

      Alert.alert(
        'Chamado aberto! 🎉',
        `Código: ${orderRes.data.data.problemCode}\n\nUm técnico será designado em breve.${photoWarning}`,
        [{ text: 'Acompanhar', onPress: () => navigation.replace('OrderStatus', { orderId }) }]
      )
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao abrir chamado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Progress */}
      <View style={styles.progress}>
        {[1, 2, 3, 4].map((s) => (
          <View key={s} style={[styles.progressStep, step >= s && styles.progressStepActive]} />
        ))}
      </View>

      {/* STEP 1 — Subcategoria */}
      {step === 1 && (
        <View>
          <Text style={styles.stepTitle}>{category.icon} Qual é o problema?</Text>
          <Text style={styles.stepSubtitle}>Categoria: {category.label}</Text>
          {subcats.map((sub) => (
            <TouchableOpacity
              key={sub.key}
              style={[styles.optionCard, subcategory === sub.key && styles.optionCardActive]}
              onPress={() => setSubcategory(sub.key)}
            >
              <Text style={[styles.optionLabel, subcategory === sub.key && styles.optionLabelActive]}>
                {sub.label}
              </Text>
              {subcategory === sub.key && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.nextButton, !subcategory && styles.nextButtonDisabled]}
            onPress={() => subcategory && setStep(2)}
            disabled={!subcategory}
          >
            <Text style={styles.nextButtonText}>Próximo →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* STEP 2 — Prioridade */}
      {step === 2 && (
        <View>
          <Text style={styles.stepTitle}>⏱ Qual a urgência?</Text>
          <Text style={styles.stepSubtitle}>Isso define o prazo de atendimento</Text>
          {PRIORITIES.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[styles.optionCard, priority === p.key && { borderColor: p.color, backgroundColor: p.color + '10' }]}
              onPress={() => setPriority(p.key)}
            >
              <View>
                <Text style={[styles.optionLabel, priority === p.key && { color: p.color }]}>{p.label}</Text>
                <Text style={styles.optionDesc}>{p.desc}</Text>
              </View>
              {priority === p.key && <Text style={[styles.checkmark, { color: p.color }]}>✓</Text>}
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.nextButton} onPress={() => setStep(3)}>
            <Text style={styles.nextButtonText}>Próximo →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
            <Text style={styles.backButtonText}>← Voltar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* STEP 3 — Técnico preferido (opcional) */}
      {step === 3 && (
        <View>
          <Text style={styles.stepTitle}>👨‍🔧 Tem um técnico preferido?</Text>
          <Text style={styles.stepSubtitle}>Digite a matrícula — ou pule para o sistema escolher</Text>

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <TextInput
              style={[styles.textarea, { flex: 1, height: 48, textAlignVertical: 'center', marginTop: 0 }]}
              placeholder="Ex: TEC-0001"
              value={matriculaInput}
              onChangeText={(t) => { setMatriculaInput(t); setTechSearchError(''); setRequestedTech(null) }}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={[styles.nextButton, { marginTop: 0, paddingHorizontal: 16 }]}
              onPress={searchTechByMatricula}
              disabled={techSearching}
            >
              {techSearching ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.nextButtonText}>Buscar</Text>}
            </TouchableOpacity>
          </View>

          {techSearchError ? <Text style={{ color: '#EF4444', fontSize: 13, marginBottom: 8 }}>{techSearchError}</Text> : null}

          {requestedTech && (
            <View style={{ backgroundColor: requestedTech.available ? '#F0FDF4' : '#FEF3C7', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1.5, borderColor: requestedTech.available ? '#10B981' : '#F59E0B' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {requestedTech.photoUrl ? (
                  <Image source={{ uri: requestedTech.photoUrl }} style={{ width: 52, height: 52, borderRadius: 26 }} />
                ) : (
                  <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#1E40AF', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#fff' }}>{requestedTech.name.charAt(0)}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', fontSize: 15, color: '#1a1a1a' }}>{requestedTech.name}</Text>
                  <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>⭐ {requestedTech.rating.toFixed(1)} • {requestedTech.city}</Text>
                  <Text style={{ fontSize: 11, color: requestedTech.available ? '#065F46' : '#92400E', marginTop: 2, fontWeight: '600' }}>
                    {requestedTech.available ? '● Disponível' : '● Ocupado — outro técnico será designado'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => { setRequestedTech(null); setMatriculaInput('') }}>
                  <Text style={{ fontSize: 18, color: '#9CA3AF' }}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.nextButton} onPress={() => setStep(4)}>
            <Text style={styles.nextButtonText}>{requestedTech ? 'Confirmar técnico →' : 'Pular →'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={() => setStep(2)}>
            <Text style={styles.backButtonText}>← Voltar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* STEP 4 — Detalhes e fotos */}
      {step === 4 && (
        <View>
          <Text style={styles.stepTitle}>📝 Detalhes do problema</Text>
          <Text style={styles.stepSubtitle}>Quanto mais informação, melhor!</Text>

          <Text style={styles.label}>Descrição (opcional)</Text>
          <TextInput
            style={styles.textarea}
            placeholder="Descreva o problema com mais detalhes..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <Text style={styles.label}>Fotos ({photos.length}/3)</Text>
          <View style={styles.photosRow}>
            {photos.map((uri, i) => (
              <Image key={i} source={{ uri }} style={styles.photoThumb} />
            ))}
            {photos.length < 3 && (
              <TouchableOpacity style={styles.addPhoto} onPress={pickPhoto}>
                <Text style={styles.addPhotoIcon}>📷</Text>
                <Text style={styles.addPhotoText}>Tirar foto</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.nextButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Abrir chamado 🚀</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={() => setStep(3)}>
            <Text style={styles.backButtonText}>← Voltar</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  progress: { flexDirection: 'row', gap: 6, marginBottom: 24 },
  progressStep: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#e5e5e5' },
  progressStepActive: { backgroundColor: '#FF5A1F' },
  stepTitle: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 4 },
  stepSubtitle: { fontSize: 14, color: '#888', marginBottom: 20 },
  optionCard: {
    borderWidth: 2, borderColor: '#e5e5e5', borderRadius: 12,
    padding: 16, marginBottom: 10, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fafafa',
  },
  optionCardActive: { borderColor: '#FF5A1F', backgroundColor: '#fff5f2' },
  optionLabel: { fontSize: 15, fontWeight: '600', color: '#333' },
  optionLabelActive: { color: '#FF5A1F' },
  optionDesc: { fontSize: 12, color: '#888', marginTop: 2 },
  checkmark: { fontSize: 18, color: '#FF5A1F', fontWeight: 'bold' },
  nextButton: {
    backgroundColor: '#FF5A1F', borderRadius: 10,
    padding: 16, alignItems: 'center', marginTop: 16,
  },
  nextButtonDisabled: { opacity: 0.5 },
  nextButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  backButton: { alignItems: 'center', marginTop: 12 },
  backButtonText: { color: '#888', fontSize: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 16 },
  textarea: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    padding: 14, fontSize: 15, backgroundColor: '#fafafa', height: 100,
  },
  photosRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 4 },
  photoThumb: { width: 80, height: 80, borderRadius: 8 },
  addPhoto: {
    width: 80, height: 80, borderRadius: 8, borderWidth: 2,
    borderColor: '#ddd', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center',
  },
  addPhotoIcon: { fontSize: 24 },
  addPhotoText: { fontSize: 10, color: '#888', marginTop: 2 },
  submitButton: {
    backgroundColor: '#FF5A1F', borderRadius: 10,
    padding: 18, alignItems: 'center', marginTop: 24,
  },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
})
