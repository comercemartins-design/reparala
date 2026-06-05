import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl, Image, Linking, TextInput,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import Constants from 'expo-constants'
import api from '../services/api'

const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl as string
const SUPABASE_KEY = Constants.expoConfig?.extra?.supabaseAnonKey as string

async function uploadToStorage(photoUri: string, filename: string): Promise<string | null> {
  try {
    const response = await fetch(photoUri)
    const blob = await response.blob()
    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/order-media/${filename}`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'image/jpeg' },
        body: blob,
      }
    )
    if (!uploadRes.ok) return null
    return `${SUPABASE_URL}/storage/v1/object/public/order-media/${filename}`
  } catch {
    return null
  }
}

const STATUS_FLOW = [
  { key: 'ACCEPTED',          label: 'Chamado aceito',        icon: '✅' },
  { key: 'EN_ROUTE',          label: 'A caminho',             icon: '🚗' },
  { key: 'IN_PROGRESS',       label: 'Em execução',           icon: '🔧' },
  { key: 'AWAITING_APPROVAL', label: 'Aguardando aprovação',  icon: '⏳' },
  { key: 'COMPLETED',         label: 'Concluído',             icon: '🎉' },
]

const NEXT_ACTION: Record<string, { label: string; nextStatus: string; confirm: string }> = {
  ACCEPTED: {
    label: '🚗 Saí para o chamado',
    nextStatus: 'EN_ROUTE',
    confirm: 'Confirmar que você saiu para o chamado?',
  },
  EN_ROUTE: {
    label: '🔧 Cheguei — Iniciar serviço',
    nextStatus: 'IN_PROGRESS',
    confirm: 'Confirmar que você chegou e iniciou o serviço?',
  },
  IN_PROGRESS: {
    label: '✅ Concluir serviço',
    nextStatus: 'AWAITING_APPROVAL',
    confirm: 'Confirmar conclusão? O cliente irá avaliar o serviço.',
  },
}

export default function ActiveOrderScreen({ route, navigation }: any) {
  const { orderId } = route.params
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [completionPhoto, setCompletionPhoto] = useState<string | null>(null)
  const [observations, setObservations] = useState('')

  useEffect(() => {
    loadOrder()
    const interval = setInterval(loadOrder, 15000)
    return () => clearInterval(interval)
  }, [])

  async function loadOrder() {
    try {
      const res = await api.get(`/orders/${orderId}`)
      setOrder(res.data.data)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  async function onRefresh() {
    setRefreshing(true)
    await loadOrder()
    setRefreshing(false)
  }

  async function takeCompletionPhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (perm.status !== 'granted') {
      Alert.alert('Permissão necessária', 'Permita o acesso à câmera nas configurações do celular.')
      return
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
    await processCompletionPhoto(result)
  }

  async function pickCompletionFromGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (perm.status !== 'granted') {
      Alert.alert('Permissão necessária', 'Permita o acesso à galeria nas configurações do celular.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 })
    await processCompletionPhoto(result)
  }

  async function processCompletionPhoto(result: ImagePicker.ImagePickerResult) {
    if (!result.canceled) {
      const compressed = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      )
      setCompletionPhoto(compressed.uri)
    }
  }

  async function uploadCompletionPhoto(photoUri: string) {
    const filename = `orders/${orderId}/completion-${Date.now()}.jpg`
    const publicUrl = await uploadToStorage(photoUri, filename)
    if (publicUrl) {
      await api.post(`/orders/${orderId}/media`, {
        url: publicUrl, phase: 'COMPLETION', mimeType: 'image/jpeg',
      })
    }
  }

  async function handleStatusUpdate(nextStatus: string, confirm: string) {
    if (nextStatus === 'AWAITING_APPROVAL' && !completionPhoto) {
      Alert.alert('Foto obrigatória', 'Tire uma foto do serviço antes de finalizar.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Tirar foto', onPress: takeCompletionPhoto },
      ])
      return
    }
    Alert.alert('Confirmar', confirm, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: async () => {
          setActionLoading(true)
          try {
            if (nextStatus === 'AWAITING_APPROVAL' && completionPhoto) {
              await uploadCompletionPhoto(completionPhoto)
            }
            await api.patch(`/orders/${orderId}/status`, { status: nextStatus })
            await loadOrder()
            setCompletionPhoto(null)
            if (nextStatus === 'AWAITING_APPROVAL') {
              Alert.alert('Serviço concluído! 🎉', 'Aguardando avaliação do cliente.')
            }
          } catch (error: any) {
            Alert.alert('Erro', error.response?.data?.error || 'Erro ao atualizar status')
          } finally {
            setActionLoading(false)
          }
        },
      },
    ])
  }

  function openMaps() {
    if (!order?.serviceAddress) return
    const encoded = encodeURIComponent(`${order.serviceAddress}, ${order.serviceCity}`)
    Linking.openURL(`https://maps.google.com/?q=${encoded}`)
  }

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#1E40AF" /></View>
  }

  if (!order) {
    return <View style={styles.centered}><Text>Chamado não encontrado</Text></View>
  }

  const currentIndex = STATUS_FLOW.findIndex((s) => s.key === order.status)
  const nextAction = NEXT_ACTION[order.status]
  const isCompleted = order.status === 'COMPLETED'
  const isWaiting = order.status === 'AWAITING_APPROVAL'

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1E40AF" />}
        contentContainerStyle={{ paddingBottom: nextAction ? 120 : 32 }}
      >
        {/* Código */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Chamado em andamento</Text>
          <Text style={styles.codeValue}>{order.problemCode}</Text>
          <Text style={styles.codeCity}>📍 {order.serviceCity}</Text>
        </View>

        {/* Endereço — toca para abrir Maps */}
        <TouchableOpacity style={styles.addressCard} onPress={openMaps}>
          <View style={{ flex: 1 }}>
            <Text style={styles.addressLabel}>Endereço do serviço</Text>
            <Text style={styles.addressValue}>{order.serviceAddress}</Text>
            <Text style={styles.addressCity}>{order.serviceCity}</Text>
          </View>
          <Text style={styles.mapIcon}>🗺️</Text>
        </TouchableOpacity>

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progresso</Text>
          {STATUS_FLOW.map((step, index) => {
            const done = index < currentIndex
            const current = index === currentIndex
            return (
              <View key={step.key} style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  <View style={[
                    styles.timelineDot,
                    done && styles.timelineDotDone,
                    current && styles.timelineDotCurrent,
                  ]}>
                    {done ? <Text style={styles.timelineDotText}>✓</Text>
                     : current ? <Text style={styles.timelineDotText}>{step.icon}</Text>
                     : null}
                  </View>
                  {index < STATUS_FLOW.length - 1 && (
                    <View style={[styles.timelineLine, done && styles.timelineLineDone]} />
                  )}
                </View>
                <Text style={[
                  styles.timelineLabel,
                  index > currentIndex && styles.timelineLabelFuture,
                  current && styles.timelineLabelCurrent,
                ]}>
                  {step.label}
                </Text>
              </View>
            )
          })}
        </View>

        {/* Descrição e Fotos do Problema */}
        {order.description || (order.media && order.media.some((m: any) => m.phase === 'REPORT')) ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detalhes do problema</Text>
            {order.description ? (
              <Text style={styles.description}>{order.description}</Text>
            ) : null}
            
            {order.media && order.media.some((m: any) => m.phase === 'REPORT') && (
              <View style={{ marginTop: 12 }}>
                <Text style={[styles.fieldLabel, { marginBottom: 8 }]}>Fotos enviadas pelo cliente:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                  {order.media.filter((m: any) => m.phase === 'REPORT').map((m: any) => (
                    <TouchableOpacity key={m.id} onPress={() => Linking.openURL(m.url)}>
                      <Image 
                        source={{ uri: m.url }} 
                        style={{ width: 100, height: 100, borderRadius: 8, marginRight: 10 }} 
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        ) : null}

        {/* Foto de conclusão + Observações */}
        {order.status === 'IN_PROGRESS' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Finalizar serviço</Text>

            <Text style={styles.fieldLabel}>Foto do serviço concluído *</Text>
            <Text style={styles.photoHint}>Obrigatória — registra o trabalho realizado.</Text>
            {completionPhoto ? (
              <View style={{ marginBottom: 16 }}>
                <Image source={{ uri: completionPhoto }} style={styles.completionPhoto} />
                <View style={styles.photoActions}>
                  <TouchableOpacity style={styles.photoActionBtn} onPress={takeCompletionPhoto}>
                    <Text style={styles.photoActionText}>📷 Câmera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.photoActionBtn} onPress={pickCompletionFromGallery}>
                    <Text style={styles.photoActionText}>🖼️ Galeria</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={[styles.photoPickerRow, { marginBottom: 16 }]}>
                <TouchableOpacity style={[styles.photoBtn, { flex: 1 }]} onPress={takeCompletionPhoto}>
                  <Text style={styles.photoBtnIcon}>📷</Text>
                  <Text style={styles.photoBtnText}>Câmera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.photoBtn, { flex: 1 }]} onPress={pickCompletionFromGallery}>
                  <Text style={styles.photoBtnIcon}>🖼️</Text>
                  <Text style={styles.photoBtnText}>Galeria</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.fieldLabel}>Observações (opcional)</Text>
            <TextInput
              style={styles.observationsInput}
              placeholder="Descreva o que foi feito, peças substituídas, recomendações..."
              value={observations}
              onChangeText={setObservations}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        )}

        {/* Aguardando avaliação */}
        {isWaiting && (
          <View style={styles.waitingCard}>
            <Text style={styles.waitingIcon}>⏳</Text>
            <Text style={styles.waitingTitle}>Aguardando avaliação</Text>
            <Text style={styles.waitingText}>
              O cliente foi notificado. O chamado será concluído após a avaliação.
            </Text>
          </View>
        )}

        {/* Concluído */}
        {isCompleted && (
          <View style={styles.completedCard}>
            <Text style={styles.completedIcon}>🎉</Text>
            <Text style={styles.completedTitle}>Chamado concluído!</Text>
            {order.rating ? (
              <Text style={styles.completedRating}>
                {'★'.repeat(order.rating)}{'☆'.repeat(5 - order.rating)}
              </Text>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* Botão de ação (fixo no rodapé) */}
      {nextAction && !isWaiting && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.actionBtn, actionLoading && styles.actionBtnDisabled]}
            onPress={() => handleStatusUpdate(nextAction.nextStatus, nextAction.confirm)}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionBtnText}>{nextAction.label}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4ff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  codeCard: {
    backgroundColor: '#1E40AF', margin: 16, borderRadius: 14,
    padding: 20, alignItems: 'center',
  },
  codeLabel: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 6 },
  codeValue: { fontSize: 24, fontWeight: 'bold', color: '#fff', fontFamily: 'monospace' },
  codeCity: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 6 },
  addressCard: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12,
    borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center',
  },
  addressLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 4 },
  addressValue: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  addressCity: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  mapIcon: { fontSize: 28, marginLeft: 12 },
  section: {
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 12,
    padding: 16, marginBottom: 12,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 14 },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start' },
  timelineLeft: { alignItems: 'center', marginRight: 14, width: 28 },
  timelineDot: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: '#e5e5e5', backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  timelineDotDone: { backgroundColor: '#10B981', borderColor: '#10B981' },
  timelineDotCurrent: { backgroundColor: '#1E40AF', borderColor: '#1E40AF' },
  timelineDotText: { fontSize: 12, color: '#fff' },
  timelineLine: { width: 2, height: 24, backgroundColor: '#e5e5e5', marginVertical: 2 },
  timelineLineDone: { backgroundColor: '#10B981' },
  timelineLabel: { fontSize: 14, color: '#1a1a1a', paddingTop: 5, paddingBottom: 18, flex: 1 },
  timelineLabelFuture: { color: '#bbb' },
  timelineLabelCurrent: { color: '#1E40AF', fontWeight: '700' },
  description: { fontSize: 14, color: '#374151', lineHeight: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 4 },
  photoHint: { fontSize: 12, color: '#6B7280', marginBottom: 10 },
  observationsInput: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10,
    padding: 12, fontSize: 14, backgroundColor: '#FAFAFA',
    minHeight: 80, color: '#374151',
  },
  photoPickerRow: { flexDirection: 'row', gap: 10 },
  photoBtn: {
    borderWidth: 2, borderColor: '#93C5FD', borderStyle: 'dashed',
    borderRadius: 12, padding: 20, alignItems: 'center', backgroundColor: '#EFF6FF',
  },
  photoBtnIcon: { fontSize: 28 },
  photoBtnText: { fontSize: 13, color: '#1D4ED8', fontWeight: '600', marginTop: 6 },
  completionPhoto: { width: '100%', height: 200, borderRadius: 10 },
  photoActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  photoActionBtn: {
    flex: 1, borderWidth: 1, borderColor: '#93C5FD', borderRadius: 10,
    padding: 10, alignItems: 'center', backgroundColor: '#EFF6FF',
  },
  photoActionText: { fontSize: 13, color: '#1D4ED8', fontWeight: '600' },
  actionContainer: {
    backgroundColor: '#fff', padding: 16, paddingBottom: 32,
    borderTopWidth: 1, borderTopColor: '#e5e7eb',
  },
  actionBtn: {
    backgroundColor: '#1E40AF', borderRadius: 12, padding: 16, alignItems: 'center',
  },
  actionBtnDisabled: { opacity: 0.6 },
  actionBtnText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  waitingCard: {
    backgroundColor: '#FFFBEB', marginHorizontal: 16, borderRadius: 12,
    padding: 20, alignItems: 'center', marginBottom: 12,
    borderWidth: 1, borderColor: '#FCD34D',
  },
  waitingIcon: { fontSize: 36, marginBottom: 8 },
  waitingTitle: { fontSize: 16, fontWeight: '700', color: '#92400E', marginBottom: 6 },
  waitingText: { fontSize: 13, color: '#78350F', textAlign: 'center', lineHeight: 18 },
  completedCard: {
    backgroundColor: '#F0FDF4', marginHorizontal: 16, borderRadius: 12,
    padding: 20, alignItems: 'center', marginBottom: 12,
    borderWidth: 1, borderColor: '#86EFAC',
  },
  completedIcon: { fontSize: 36, marginBottom: 8 },
  completedTitle: { fontSize: 16, fontWeight: '700', color: '#166534', marginBottom: 6 },
  completedRating: { fontSize: 20, color: '#F59E0B' },
})
