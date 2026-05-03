import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, Image,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'
import api from '../services/api'

const supabase = createClient(
  Constants.expoConfig?.extra?.supabaseUrl,
  Constants.expoConfig?.extra?.supabaseAnonKey
)

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
  VID: [
    { key: 'JAN', label: 'Janela' },
    { key: 'BOX', label: 'Box de banheiro' },
    { key: 'ESP', label: 'Espelho' },
    { key: 'VIT', label: 'Vitrine' },
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

  const [step, setStep] = useState(1) // 1=subcat, 2=prioridade, 3=detalhes
  const [subcategory, setSubcategory] = useState('')
  const [priority, setPriority] = useState('NORMAL')
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  async function pickPhoto() {
    if (photos.length >= 3) {
      Alert.alert('Limite', 'Máximo de 3 fotos por chamado')
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    })
    if (!result.canceled) {
      // Comprime antes de fazer upload
      const compressed = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      )
      setPhotos([...photos, compressed.uri])
    }
  }

  async function handleSubmit() {
    if (!subcategory) { Alert.alert('Atenção', 'Selecione o tipo do problema'); return }
    setLoading(true)
    try {
      // Cria o chamado
      const orderRes = await api.post('/orders', {
        category: category.key,
        subcategory,
        priority,
        description,
        serviceAddress: 'Endereço do perfil',
        serviceCity: 'São Paulo',
      })
      const orderId = orderRes.data.data.id

      // Upload das fotos para Supabase Storage
      for (const photoUri of photos) {
        const filename = `orders/${orderId}/${Date.now()}.jpg`
        const response = await fetch(photoUri)
        const blob = await response.blob()

        const { data: uploadData } = await supabase.storage
          .from('order-media')
          .upload(filename, blob, { contentType: 'image/jpeg' })

        if (uploadData) {
          const { data: urlData } = supabase.storage.from('order-media').getPublicUrl(filename)
          await api.post(`/orders/${orderId}/media`, {
            url: urlData.publicUrl,
            phase: 'REPORT',
            mimeType: 'image/jpeg',
          })
        }
      }

      Alert.alert(
        'Chamado aberto! 🎉',
        `Código: ${orderRes.data.data.problemCode}\n\nUm técnico será designado em breve.`,
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
        {[1, 2, 3].map((s) => (
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

      {/* STEP 3 — Detalhes e fotos */}
      {step === 3 && (
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
          <TouchableOpacity style={styles.backButton} onPress={() => setStep(2)}>
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
