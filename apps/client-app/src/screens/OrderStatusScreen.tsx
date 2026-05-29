import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
  RefreshControl, FlatList, TextInput,
} from 'react-native'
import api from '../services/api'

const STATUS_FLOW = [
  { key: 'OPEN',               label: 'Chamado aberto',        icon: '📋' },
  { key: 'DISPATCHED',         label: 'Técnico notificado',    icon: '📡' },
  { key: 'ACCEPTED',           label: 'Técnico confirmado',    icon: '✅' },
  { key: 'EN_ROUTE',           label: 'A caminho',             icon: '🚗' },
  { key: 'IN_PROGRESS',        label: 'Em execução',           icon: '🔧' },
  { key: 'AWAITING_APPROVAL',  label: 'Aguardando aprovação',  icon: '⏳' },
  { key: 'COMPLETED',          label: 'Concluído',             icon: '🎉' },
]

export function OrderStatusScreen({ route, navigation }: any) {
  const { orderId } = route.params
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [rating, setRating] = useState(0)
  const [rated, setRated] = useState(false)

  useEffect(() => {
    loadOrder()
    // Polling a cada 15 segundos
    const interval = setInterval(loadOrder, 15000)
    return () => clearInterval(interval)
  }, [])

  async function loadOrder() {
    try {
      const res = await api.get(`/orders/${orderId}`)
      setOrder(res.data.data)
      if (res.data.data.rating) setRated(true)
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

  async function handleRate(stars: number) {
    setRating(stars)
    try {
      const comment = order?.tempComment || undefined;
      await api.post(`/orders/${orderId}/rate`, { rating: stars, comment })
      setRated(true)
      Alert.alert('Obrigado! 🌟', 'Sua avaliação foi registrada.')
    } catch {
      Alert.alert('Erro', 'Não foi possível registrar a avaliação')
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF5A1F" />
      </View>
    )
  }

  if (!order) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Chamado não encontrado</Text>
      </View>
    )
  }

  const currentIndex = STATUS_FLOW.findIndex((s) => s.key === order.status)

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF5A1F" />}
    >
      {/* Código do chamado */}
      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>Código do chamado</Text>
        <Text style={styles.codeValue}>{order.problemCode}</Text>
        <Text style={styles.codeDate}>
          Aberto em {new Date(order.createdAt).toLocaleDateString('pt-BR')}
        </Text>
      </View>

      {/* Técnico */}
      {order.technician && (
        <View style={styles.techCard}>
          <Text style={styles.techLabel}>Técnico responsável</Text>
          <Text style={styles.techName}>{order.technician.user?.name}</Text>
          <View style={styles.techRating}>
            <Text style={styles.techRatingText}>⭐ {order.technician.rating?.toFixed(1)}</Text>
          </View>
        </View>
      )}

      {/* Timeline de status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Acompanhamento</Text>
        {STATUS_FLOW.map((step, index) => {
          const done = index < currentIndex
          const current = index === currentIndex
          const future = index > currentIndex
          return (
            <View key={step.key} style={styles.timelineRow}>
              <View style={styles.timelineLeft}>
                <View style={[
                  styles.timelineDot,
                  done && styles.timelineDotDone,
                  current && styles.timelineDotCurrent,
                ]}>
                  {done ? <Text style={styles.timelineDotText}>✓</Text> :
                   current ? <Text style={styles.timelineDotText}>{step.icon}</Text> : null}
                </View>
                {index < STATUS_FLOW.length - 1 && (
                  <View style={[styles.timelineLine, done && styles.timelineLineDone]} />
                )}
              </View>
              <Text style={[
                styles.timelineLabel,
                future && styles.timelineLabelFuture,
                current && styles.timelineLabelCurrent,
              ]}>
                {step.label}
              </Text>
            </View>
          )
        })}
      </View>

      {/* Avaliação */}
      {order.status === 'AWAITING_APPROVAL' && !rated && (
        <View style={styles.ratingCard}>
          <Text style={styles.ratingTitle}>Serviço concluído! Como foi?</Text>
          <Text style={styles.ratingSubtitle}>Toque nas estrelas para avaliar</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <Text style={[styles.star, rating >= star && styles.starActive]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {rating > 0 && (
            <View style={{ width: '100%', marginTop: 16 }}>
              <Text style={{ fontSize: 13, color: '#333', marginBottom: 8, fontWeight: '600' }}>
                Deixe uma observação (opcional)
              </Text>
              <TextInput
                style={{
                  borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
                  padding: 12, minHeight: 80, backgroundColor: '#fafafa', textAlignVertical: 'top'
                }}
                placeholder="Como foi o serviço?"
                multiline
                onChangeText={(text) => setOrder({ ...order, tempComment: text })}
              />
              <TouchableOpacity 
                style={{ backgroundColor: '#FF5A1F', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 12 }}
                onPress={() => handleRate(rating)}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Enviar Avaliação</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {rated && (
        <View style={styles.ratedCard}>
          <Text style={styles.ratedText}>✅ Você avaliou este serviço</Text>
          <Text style={styles.ratedStars}>{'★'.repeat(order.rating || rating)}</Text>
        </View>
      )}
    </ScrollView>
  )
}

export function OrderHistoryScreen({ navigation }: any) {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadOrders() }, [])

  async function loadOrders() {
    try {
      const res = await api.get('/orders?limit=50')
      setOrders(res.data.data.orders || [])
    } catch {
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color="#FF5A1F" /></View>
  }

  return (
    <FlatList
      style={{ backgroundColor: '#f5f5f5' }}
      data={orders}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16 }}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.historyCard}
          onPress={() => navigation.navigate('OrderStatus', { orderId: item.id })}
        >
          <Text style={styles.historyCode}>{item.problemCode}</Text>
          <Text style={styles.historyStatus}>{item.status}</Text>
          <Text style={styles.historyDate}>{new Date(item.createdAt).toLocaleDateString('pt-BR')}</Text>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <Text style={{ textAlign: 'center', color: '#888', marginTop: 40 }}>Nenhum chamado encontrado</Text>
      }
    />
  )
}

export default OrderStatusScreen

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  codeCard: {
    backgroundColor: '#FF5A1F', margin: 16, borderRadius: 12,
    padding: 20, alignItems: 'center',
  },
  codeLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 6 },
  codeValue: { fontSize: 22, fontWeight: 'bold', color: '#fff', fontFamily: 'monospace' },
  codeDate: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 6 },
  techCard: {
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 12,
    padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center',
  },
  techLabel: { fontSize: 12, color: '#888', marginBottom: 2 },
  techName: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', flex: 1 },
  techRating: { backgroundColor: '#FEF3C7', borderRadius: 6, padding: 4 },
  techRatingText: { fontSize: 13, fontWeight: '700', color: '#D97706' },
  section: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 12, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 16 },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 0 },
  timelineLeft: { alignItems: 'center', marginRight: 14, width: 28 },
  timelineDot: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: '#e5e5e5', backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  timelineDotDone: { backgroundColor: '#10B981', borderColor: '#10B981' },
  timelineDotCurrent: { backgroundColor: '#FF5A1F', borderColor: '#FF5A1F' },
  timelineDotText: { fontSize: 12, color: '#fff' },
  timelineLine: { width: 2, height: 24, backgroundColor: '#e5e5e5', marginVertical: 2 },
  timelineLineDone: { backgroundColor: '#10B981' },
  timelineLabel: { fontSize: 14, color: '#1a1a1a', paddingTop: 5, paddingBottom: 18, flex: 1 },
  timelineLabelFuture: { color: '#bbb' },
  timelineLabelCurrent: { color: '#FF5A1F', fontWeight: '700' },
  ratingCard: {
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 12,
    padding: 20, alignItems: 'center', marginBottom: 16,
  },
  ratingTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 4 },
  ratingSubtitle: { fontSize: 13, color: '#888', marginBottom: 16 },
  stars: { flexDirection: 'row', gap: 8 },
  star: { fontSize: 40, color: '#e5e5e5' },
  starActive: { color: '#F59E0B' },
  ratedCard: {
    backgroundColor: '#F0FDF4', marginHorizontal: 16, borderRadius: 12,
    padding: 16, alignItems: 'center', marginBottom: 16,
  },
  ratedText: { fontSize: 14, color: '#16A34A', fontWeight: '600' },
  ratedStars: { fontSize: 20, color: '#F59E0B', marginTop: 4 },
  historyCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    marginBottom: 10, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, elevation: 1,
  },
  historyCode: { fontSize: 14, fontWeight: '700', fontFamily: 'monospace', color: '#1a1a1a' },
  historyStatus: { fontSize: 12, color: '#666', marginTop: 2 },
  historyDate: { fontSize: 11, color: '#aaa', marginTop: 4 },
})
