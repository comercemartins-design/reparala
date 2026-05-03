import React, { useCallback, useEffect, useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, RefreshControl, Switch, Alert,
} from 'react-native'
import { useAuth } from '../hooks/useAuth'
import api from '../services/api'

const CATEGORY_LABELS: Record<string, string> = {
  HID: '💧 Hidráulica',
  CIV: '🏗️ Civil',
  SER: '🔩 Serralheria',
  VID: '🪟 Vidraçaria',
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#6B7280',
  NORMAL: '#3B82F6',
  HIGH: '#F59E0B',
  CRITICAL: '#EF4444',
}

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baixa',
  NORMAL: 'Normal',
  HIGH: 'Urgente',
  CRITICAL: 'Crítico',
}

const ACTIVE_STATUSES = ['ACCEPTED', 'EN_ROUTE', 'IN_PROGRESS', 'AWAITING_APPROVAL']

export default function DashboardScreen({ navigation }: any) {
  const { user, refreshUser } = useAuth()
  const [orders, setOrders] = useState<any[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [availabilityLoading, setAvailabilityLoading] = useState(false)

  const isAvailable = user?.technician?.status === 'AVAILABLE'

  const activeOrder = orders.find(
    (o) => ACTIVE_STATUSES.includes(o.status) && o.technician?.id === user?.technician?.id
  )

  const dispatchedOrders = orders.filter(
    (o) => o.status === 'DISPATCHED' && o.technician?.id === user?.technician?.id
  )

  const openOrders = orders.filter((o) => o.status === 'OPEN')

  useEffect(() => {
    loadOrders()
    const interval = setInterval(loadOrders, 20000)
    return () => clearInterval(interval)
  }, [])

  async function loadOrders() {
    try {
      const res = await api.get('/orders?limit=40')
      setOrders(res.data.data.orders || [])
    } catch {}
  }

  async function onRefresh() {
    setRefreshing(true)
    await Promise.all([loadOrders(), refreshUser()])
    setRefreshing(false)
  }

  async function toggleAvailability(value: boolean) {
    if (!user?.technician?.id) return
    setAvailabilityLoading(true)
    try {
      await api.patch(`/technicians/${user.technician.id}/availability`, { available: value })
      await refreshUser()
    } catch {
      Alert.alert('Erro', 'Não foi possível alterar disponibilidade')
    } finally {
      setAvailabilityLoading(false)
    }
  }

  const renderOrderCard = useCallback(({ item }: any) => {
    const isDispatched = item.status === 'DISPATCHED' && item.technician?.id === user?.technician?.id
    return (
      <TouchableOpacity
        style={[styles.orderCard, isDispatched && styles.orderCardDispatched]}
        onPress={() => navigation.navigate('OrderOffer', { orderId: item.id })}
      >
        {isDispatched && (
          <View style={styles.dispatchBadge}>
            <Text style={styles.dispatchBadgeText}>📡 ENVIADO PARA VOCÊ</Text>
          </View>
        )}
        <View style={styles.orderCardHeader}>
          <Text style={styles.orderCode}>{item.problemCode}</Text>
          <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLORS[item.priority] + '20' }]}>
            <Text style={[styles.priorityText, { color: PRIORITY_COLORS[item.priority] }]}>
              {PRIORITY_LABELS[item.priority]}
            </Text>
          </View>
        </View>
        <Text style={styles.orderCategory}>{CATEGORY_LABELS[item.category] || item.category}</Text>
        {item.description ? (
          <Text style={styles.orderDesc} numberOfLines={2}>{item.description}</Text>
        ) : null}
        <View style={styles.orderFooter}>
          <Text style={styles.orderCity}>📍 {item.serviceCity}</Text>
          <Text style={styles.orderDate}>
            {new Date(item.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </TouchableOpacity>
    )
  }, [user, navigation])

  const sections = [
    ...(activeOrder ? [{ type: 'active', data: activeOrder }] : []),
    ...(dispatchedOrders.length > 0 ? [{ type: 'header', title: `📡 Para você (${dispatchedOrders.length})` }] : []),
    ...dispatchedOrders.map((o) => ({ type: 'order', data: o })),
    ...(openOrders.length > 0 ? [{ type: 'header', title: `🔓 Chamados disponíveis (${openOrders.length})` }] : []),
    ...openOrders.map((o) => ({ type: 'order', data: o })),
    ...(dispatchedOrders.length === 0 && openOrders.length === 0 ? [{ type: 'empty' }] : []),
  ]

  return (
    <FlatList
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1E40AF" />}
      ListHeaderComponent={
        <View>
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Olá, {user?.name?.split(' ')[0]}! 👋</Text>
              <Text style={styles.headerSub}>
                {user?.technician?.specialties?.map((s: string) => CATEGORY_LABELS[s] || s).join(' · ')}
              </Text>
            </View>
            <View style={styles.availRow}>
              <Text style={[styles.availLabel, isAvailable && styles.availLabelOn]}>
                {availabilityLoading ? '...' : isAvailable ? 'Disponível' : 'Offline'}
              </Text>
              <Switch
                value={isAvailable}
                onValueChange={toggleAvailability}
                disabled={availabilityLoading}
                trackColor={{ false: '#ccc', true: '#93C5FD' }}
                thumbColor={isAvailable ? '#1E40AF' : '#9CA3AF'}
              />
            </View>
          </View>

          {user?.technician && (
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{user.technician.jobsToday ?? 0}</Text>
                <Text style={styles.statLabel}>Hoje</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{user.technician.jobsTotal ?? 0}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>⭐ {user.technician.rating?.toFixed(1) ?? '—'}</Text>
                <Text style={styles.statLabel}>Avaliação</Text>
              </View>
            </View>
          )}
        </View>
      }
      data={sections}
      keyExtractor={(item, index) => index.toString()}
      renderItem={({ item }: any) => {
        if (item.type === 'active') {
          return (
            <TouchableOpacity
              style={styles.activeOrderCard}
              onPress={() => navigation.navigate('ActiveOrder', { orderId: item.data.id })}
            >
              <View style={styles.activeOrderHeader}>
                <Text style={styles.activeOrderBadge}>🔧 CHAMADO ATIVO</Text>
                <Text style={styles.activeOrderCode}>{item.data.problemCode}</Text>
              </View>
              <Text style={styles.activeOrderStatus}>Status: {item.data.status}</Text>
              <Text style={styles.activeOrderCta}>Toque para gerenciar →</Text>
            </TouchableOpacity>
          )
        }
        if (item.type === 'header') {
          return <Text style={styles.sectionHeader}>{item.title}</Text>
        }
        if (item.type === 'empty') {
          return (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>{isAvailable ? '🎉' : '😴'}</Text>
              <Text style={styles.emptyText}>
                {isAvailable ? 'Nenhum chamado disponível no momento' : 'Você está offline'}
              </Text>
              <Text style={styles.emptySubtext}>
                {isAvailable ? 'Novos chamados aparecerão aqui' : 'Ligue para receber chamados'}
              </Text>
            </View>
          )
        }
        if (item.type === 'order') {
          return renderOrderCard({ item: item.data })
        }
        return null
      }}
      contentContainerStyle={{ paddingBottom: 32 }}
    />
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4ff' },
  header: {
    backgroundColor: '#1E40AF', padding: 20, paddingTop: 16, paddingBottom: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  greeting: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  availRow: { alignItems: 'center', gap: 4 },
  availLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  availLabelOn: { color: '#86EFAC' },
  statsRow: {
    flexDirection: 'row', backgroundColor: '#1E3A8A',
    paddingHorizontal: 16, paddingBottom: 16, gap: 8,
  },
  statCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10, padding: 12, alignItems: 'center',
  },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  activeOrderCard: {
    backgroundColor: '#1E40AF', margin: 16, borderRadius: 14,
    padding: 16, shadowColor: '#1E40AF', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, elevation: 6,
  },
  activeOrderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  activeOrderBadge: { fontSize: 11, color: '#93C5FD', fontWeight: '700' },
  activeOrderCode: { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: 'monospace' },
  activeOrderStatus: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  activeOrderCta: { fontSize: 12, color: '#93C5FD', marginTop: 8, fontWeight: '600' },
  sectionHeader: {
    fontSize: 13, fontWeight: '700', color: '#374151',
    marginHorizontal: 16, marginTop: 16, marginBottom: 8,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  orderCard: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10,
    borderRadius: 12, padding: 14, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, elevation: 2,
  },
  orderCardDispatched: {
    borderWidth: 2, borderColor: '#1E40AF', backgroundColor: '#EFF6FF',
  },
  dispatchBadge: {
    backgroundColor: '#DBEAFE', borderRadius: 6, paddingHorizontal: 8,
    paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 8,
  },
  dispatchBadgeText: { fontSize: 10, fontWeight: '700', color: '#1D4ED8' },
  orderCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  orderCode: { fontSize: 13, fontWeight: '700', color: '#1a1a1a', fontFamily: 'monospace' },
  priorityBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  priorityText: { fontSize: 11, fontWeight: '700' },
  orderCategory: { fontSize: 14, color: '#374151', marginBottom: 4 },
  orderDesc: { fontSize: 13, color: '#6B7280', marginBottom: 6, lineHeight: 18 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  orderCity: { fontSize: 12, color: '#9CA3AF' },
  orderDate: { fontSize: 11, color: '#9CA3AF' },
  empty: { alignItems: 'center', padding: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 6 },
  emptySubtext: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
})
