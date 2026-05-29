import React, { useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Image,
} from 'react-native'
import api from '../services/api'

const CATEGORY_LABELS: Record<string, string> = {
  HID: '💧 Hidráulica',
  CIV: '🏗️ Civil',
  SER: '🔩 Serralheria',
  ELE: '⚡ Elétrica',
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#6B7280', NORMAL: '#3B82F6', HIGH: '#F59E0B', CRITICAL: '#EF4444',
}

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baixa prioridade', NORMAL: 'Normal (24h)', HIGH: 'Urgente (4h)', CRITICAL: 'Crítico (1h)',
}

const CLIENT_TYPE_LABELS: Record<string, string> = {
  RESIDENCE: '🏠 Residência',
  COMPANY: '🏢 Empresa',
  CONDO: '🏗️ Condomínio',
}

const TIMER_SECONDS = 30

export default function OrderOfferScreen({ route, navigation }: any) {
  const { orderId } = route.params
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<'accept' | 'reject' | null>(null)
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS)
  const timerRef = useRef<any>(null)
  const autoRejected = useRef(false)

  useEffect(() => {
    loadOrder()
  }, [])

  // Timer de 30 segundos — auto-rejeita quando chegar a zero
  useEffect(() => {
    if (!order) return

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          handleAutoReject()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [order])

  async function loadOrder() {
    try {
      const res = await api.get(`/orders/${orderId}`)
      setOrder(res.data.data)
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar o chamado')
      navigation.goBack()
    } finally {
      setLoading(false)
    }
  }

  async function handleAutoReject() {
    if (autoRejected.current || actionLoading) return
    autoRejected.current = true
    try {
      await api.patch(`/orders/${orderId}/reject`)
    } catch {}
    Alert.alert('Tempo esgotado', 'O chamado foi recusado automaticamente.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ])
  }

  async function handleAccept() {
    clearInterval(timerRef.current)
    Alert.alert(
      'Aceitar chamado?',
      `Confirmar atendimento do chamado ${order.problemCode}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceitar',
          onPress: async () => {
            setActionLoading('accept')
            try {
              await api.patch(`/orders/${orderId}/accept`)
              Alert.alert('Chamado aceito! ✅', 'Vá ao local do chamado.', [
                {
                  text: 'Abrir chamado',
                  onPress: () => navigation.replace('ActiveOrder', { orderId }),
                },
              ])
            } catch (error: any) {
              Alert.alert('Erro', error.response?.data?.error || 'Erro ao aceitar')
              setActionLoading(null)
            }
          },
        },
      ]
    )
  }

  async function handleReject() {
    clearInterval(timerRef.current)
    Alert.alert('Recusar chamado?', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Recusar',
        style: 'destructive',
        onPress: async () => {
          setActionLoading('reject')
          try {
            await api.patch(`/orders/${orderId}/reject`)
            navigation.goBack()
          } catch (error: any) {
            Alert.alert('Erro', error.response?.data?.error || 'Erro ao recusar')
            setActionLoading(null)
          }
        },
      },
    ])
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1E40AF" />
      </View>
    )
  }

  if (!order) return null

  const priorityColor = PRIORITY_COLORS[order.priority] || '#3B82F6'
  const timerProgress = timeLeft / TIMER_SECONDS
  const timerColor = timeLeft > 15 ? '#10B981' : timeLeft > 7 ? '#F59E0B' : '#EF4444'

  return (
    <View style={styles.container}>
      {/* Timer de 30 segundos */}
      <View style={[styles.timerBar, { backgroundColor: timerColor + '20' }]}>
        <View style={styles.timerContent}>
          <Text style={[styles.timerText, { color: timerColor }]}>
            ⏱ Responda em {timeLeft}s
          </Text>
          <Text style={[styles.timerHint, { color: timerColor }]}>
            Auto-rejeita se expirar
          </Text>
        </View>
        {/* Barra de progresso */}
        <View style={styles.timerProgressBg}>
          <View style={[styles.timerProgressFill, { width: `${timerProgress * 100}%`, backgroundColor: timerColor }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Cabeçalho do chamado */}
        <View style={[styles.codeCard, { borderLeftColor: priorityColor }]}>
          <Text style={styles.codeLabel}>Novo chamado</Text>
          <Text style={styles.codeValue}>{order.problemCode}</Text>
          <View style={[styles.priorityTag, { backgroundColor: priorityColor + '20' }]}>
            <Text style={[styles.priorityTagText, { color: priorityColor }]}>
              ⏱ {PRIORITY_LABELS[order.priority]}
            </Text>
          </View>
        </View>

        {/* Detalhes */}
        <View style={styles.section}>
          <Row label="Categoria" value={CATEGORY_LABELS[order.category] || order.category} />
          <Row label="Tipo de local" value={CLIENT_TYPE_LABELS[order.client?.type] || '—'} />
          <Row label="Cidade" value={order.serviceCity || '—'} />
          <Row label="Endereço" value={order.serviceAddress || '—'} />
        </View>

        {/* Descrição */}
        {order.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Descrição</Text>
            <Text style={styles.description}>{order.description}</Text>
          </View>
        ) : null}

        {/* Fotos do cliente */}
        {order.media?.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fotos ({order.media.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {order.media.map((m: any) => (
                <Image key={m.id} source={{ uri: m.url }} style={styles.photo} resizeMode="cover" />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={[styles.section, styles.infoBox]}>
          <Text style={styles.infoText}>
            ℹ️ Ao aceitar, o endereço completo será liberado e o cliente será notificado.
          </Text>
        </View>
      </ScrollView>

      {/* Botões de ação */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.rejectBtn, !!actionLoading && styles.btnDisabled]}
          onPress={handleReject}
          disabled={!!actionLoading}
        >
          {actionLoading === 'reject' ? (
            <ActivityIndicator color="#EF4444" />
          ) : (
            <Text style={styles.rejectBtnText}>✕  Recusar</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.acceptBtn, !!actionLoading && styles.btnDisabled]}
          onPress={handleAccept}
          disabled={!!actionLoading}
        >
          {actionLoading === 'accept' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.acceptBtnText}>✓  Aceitar chamado</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4ff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  timerBar: { padding: 12, paddingTop: 8 },
  timerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  timerText: { fontSize: 15, fontWeight: '800' },
  timerHint: { fontSize: 11, fontWeight: '600', opacity: 0.8 },
  timerProgressBg: { height: 4, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 2, overflow: 'hidden' },
  timerProgressFill: { height: 4, borderRadius: 2 },
  scroll: { padding: 16, paddingBottom: 100 },
  codeCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginBottom: 12, borderLeftWidth: 4,
  },
  codeLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 4 },
  codeValue: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a', fontFamily: 'monospace' },
  priorityTag: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginTop: 8 },
  priorityTagText: { fontSize: 12, fontWeight: '700' },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 10 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  rowLabel: { fontSize: 13, color: '#6B7280' },
  rowValue: { fontSize: 13, fontWeight: '600', color: '#1a1a1a', flex: 1, textAlign: 'right' },
  description: { fontSize: 14, color: '#374151', lineHeight: 20 },
  photo: { width: 120, height: 120, borderRadius: 8, marginRight: 10 },
  infoBox: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' },
  infoText: { fontSize: 13, color: '#1D4ED8', lineHeight: 18 },
  actions: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', flexDirection: 'row', padding: 16,
    gap: 10, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingBottom: 32,
  },
  rejectBtn: {
    flex: 1, borderWidth: 2, borderColor: '#EF4444', borderRadius: 12,
    padding: 16, alignItems: 'center',
  },
  rejectBtnText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
  acceptBtn: {
    flex: 2, backgroundColor: '#1E40AF', borderRadius: 12,
    padding: 16, alignItems: 'center',
  },
  acceptBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  btnDisabled: { opacity: 0.6 },
})
