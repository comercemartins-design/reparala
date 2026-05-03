import React, { useEffect, useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, Alert, RefreshControl,
} from 'react-native'
import { useAuth } from '../hooks/useAuth'
import api from '../services/api'

const CATEGORIES = [
  { key: 'HID', label: 'Hidráulica', icon: '💧', color: '#3B82F6' },
  { key: 'CIV', label: 'Civil', icon: '🏗️', color: '#F59E0B' },
  { key: 'SER', label: 'Serralheria', icon: '🔩', color: '#6B7280' },
  { key: 'VID', label: 'Vidraçaria', icon: '🪟', color: '#06B6D4' },
]

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  OPEN:               { label: 'Aguardando técnico', color: '#F59E0B' },
  DISPATCHED:         { label: 'Técnico notificado',  color: '#3B82F6' },
  ACCEPTED:           { label: 'Técnico confirmado',  color: '#3B82F6' },
  EN_ROUTE:           { label: 'A caminho',           color: '#8B5CF6' },
  IN_PROGRESS:        { label: 'Em execução',         color: '#FF5A1F' },
  AWAITING_APPROVAL:  { label: 'Aguardando aprovação',color: '#F59E0B' },
  COMPLETED:          { label: 'Concluído',           color: '#10B981' },
  CANCELLED:          { label: 'Cancelado',           color: '#EF4444' },
}

export default function HomeScreen({ navigation }: any) {
  const { user, signOut } = useAuth()
  const [orders, setOrders] = useState<any[]>([])
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { loadOrders() }, [])

  async function loadOrders() {
    try {
      const res = await api.get('/orders?limit=5')
      setOrders(res.data.data.orders || [])
    } catch {}
  }

  async function onRefresh() {
    setRefreshing(true)
    await loadOrders()
    setRefreshing(false)
  }

  return (
    <FlatList
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF5A1F" />}
      ListHeaderComponent={
        <View>
          {/* Saudação */}
          <View style={styles.greeting}>
            <Text style={styles.greetingText}>Olá, {user?.name?.split(' ')[0]}! 👋</Text>
            <Text style={styles.greetingSubtitle}>O que precisa ser resolvido hoje?</Text>
          </View>

          {/* Categorias */}
          <Text style={styles.sectionTitle}>Abrir novo chamado</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[styles.categoryCard, { borderColor: cat.color }]}
                onPress={() => navigation.navigate('NewOrder', { category: cat })}
              >
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                <Text style={[styles.categoryLabel, { color: cat.color }]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Chamados recentes */}
          <View style={styles.recentHeader}>
            <Text style={styles.sectionTitle}>Chamados recentes</Text>
            <TouchableOpacity onPress={() => navigation.navigate('OrderHistory')}>
              <Text style={styles.seeAll}>Ver todos</Text>
            </TouchableOpacity>
          </View>
        </View>
      }
      data={orders}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => {
        const status = STATUS_LABELS[item.status] || { label: item.status, color: '#666' }
        return (
          <TouchableOpacity
            style={styles.orderCard}
            onPress={() => navigation.navigate('OrderStatus', { orderId: item.id })}
          >
            <View style={styles.orderHeader}>
              <Text style={styles.orderCode}>{item.problemCode}</Text>
              <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
              </View>
            </View>
            {item.description && (
              <Text style={styles.orderDesc} numberOfLines={1}>{item.description}</Text>
            )}
            <Text style={styles.orderDate}>
              {new Date(item.createdAt).toLocaleDateString('pt-BR')}
            </Text>
          </TouchableOpacity>
        )
      }}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔧</Text>
          <Text style={styles.emptyText}>Nenhum chamado ainda</Text>
          <Text style={styles.emptySubtext}>Selecione uma categoria acima para abrir seu primeiro chamado</Text>
        </View>
      }
      contentContainerStyle={{ paddingBottom: 32 }}
    />
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  greeting: { backgroundColor: '#FF5A1F', padding: 20, paddingTop: 16, paddingBottom: 24 },
  greetingText: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  greetingSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginHorizontal: 16, marginTop: 20, marginBottom: 12 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  categoryCard: {
    width: '47%', backgroundColor: '#fff', borderRadius: 12, borderWidth: 2,
    padding: 16, alignItems: 'center', marginHorizontal: 4,
  },
  categoryIcon: { fontSize: 32, marginBottom: 6 },
  categoryLabel: { fontSize: 13, fontWeight: '700' },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginRight: 16 },
  seeAll: { fontSize: 13, color: '#FF5A1F', fontWeight: '600' },
  orderCard: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10,
    borderRadius: 12, padding: 14, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, elevation: 2,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  orderCode: { fontSize: 13, fontWeight: '700', color: '#1a1a1a', fontFamily: 'monospace' },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  orderDesc: { fontSize: 13, color: '#666', marginBottom: 4 },
  orderDate: { fontSize: 11, color: '#aaa' },
  empty: { alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 6 },
  emptySubtext: { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 18 },
})
