import React, { useEffect, useState } from 'react'
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, TouchableOpacity, RefreshControl,
} from 'react-native'
import api from '../services/api'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  COMPLETED:  { label: 'Concluído',  color: '#10B981' },
  CANCELLED:  { label: 'Cancelado',  color: '#EF4444' },
}

const CATEGORY_ICONS: Record<string, string> = {
  HID: '💧', CIV: '🏗️', SER: '🔩', VID: '🪟',
}

export default function HistoryScreen({ navigation }: any) {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadHistory()
  }, [])

  async function loadHistory() {
    try {
      const res = await api.get('/orders?status=COMPLETED&limit=50')
      const allOrders = res.data.data.orders || []
      setOrders(allOrders.filter((o: any) => ['COMPLETED', 'CANCELLED'].includes(o.status)))
    } catch {
    } finally {
      setLoading(false)
    }
  }

  async function onRefresh() {
    setRefreshing(true)
    await loadHistory()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1E40AF" />
      </View>
    )
  }

  return (
    <FlatList
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1E40AF" />}
      data={orders}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      renderItem={({ item }) => {
        const status = STATUS_LABELS[item.status] || { label: item.status, color: '#666' }
        return (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('ActiveOrder', { orderId: item.id })}
          >
            <View style={styles.cardHeader}>
              <View style={styles.codeRow}>
                <Text style={styles.icon}>{CATEGORY_ICONS[item.category] || '🔧'}</Text>
                <Text style={styles.code}>{item.problemCode}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
              </View>
            </View>
            {item.description ? (
              <Text style={styles.desc} numberOfLines={1}>{item.description}</Text>
            ) : null}
            <View style={styles.cardFooter}>
              <Text style={styles.city}>📍 {item.serviceCity}</Text>
              {item.rating ? (
                <Text style={styles.rating}>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</Text>
              ) : null}
              <Text style={styles.date}>
                {new Date(item.completedAt || item.createdAt).toLocaleDateString('pt-BR')}
              </Text>
            </View>
          </TouchableOpacity>
        )
      }}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>Nenhum serviço concluído ainda</Text>
          <Text style={styles.emptySubtext}>Seus chamados finalizados aparecerão aqui</Text>
        </View>
      }
    />
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4ff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    marginBottom: 10, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  icon: { fontSize: 18 },
  code: { fontSize: 14, fontWeight: '700', fontFamily: 'monospace', color: '#1a1a1a' },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  desc: { fontSize: 13, color: '#6B7280', marginBottom: 6 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  city: { fontSize: 12, color: '#9CA3AF', flex: 1 },
  rating: { fontSize: 14, color: '#F59E0B', marginRight: 8 },
  date: { fontSize: 11, color: '#9CA3AF' },
  empty: { alignItems: 'center', padding: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 6 },
  emptySubtext: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
})
