import React, { useEffect, useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, Alert, RefreshControl, Platform, Linking,
} from 'react-native'
import { useAuth } from '../hooks/useAuth'
import api from '../services/api'

const ORANGE = '#FF5A1F'
const NAVY = '#0F172A'

const CATEGORIES = [
  { key: 'HID', label: 'Hidráulica',  icon: '💧', iconBg: '#3B82F6', desc: 'Vazamentos e instalações' },
  { key: 'CIV', label: 'Civil',       icon: '🏗️', iconBg: '#F59E0B', desc: 'Reformas e reparos' },
  { key: 'SER', label: 'Serralheria', icon: '🔩', iconBg: '#6B7280', desc: 'Grades e portões' },
  { key: 'ELE', label: 'Elétrica',  icon: '⚡', iconBg: '#EAB308', desc: 'Fiação e tomadas' },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  OPEN:              { label: 'Aguardando técnico',  color: '#D97706', bg: '#FFFBEB' },
  DISPATCHED:        { label: 'Técnico notificado',  color: '#2563EB', bg: '#EFF6FF' },
  ACCEPTED:          { label: 'Técnico confirmado',  color: '#2563EB', bg: '#EFF6FF' },
  EN_ROUTE:          { label: 'A caminho',           color: '#7C3AED', bg: '#F5F3FF' },
  IN_PROGRESS:       { label: 'Em execução',         color: ORANGE,    bg: '#FFF7ED' },
  AWAITING_APPROVAL: { label: 'Aguard. aprovação',   color: '#D97706', bg: '#FFFBEB' },
  COMPLETED:         { label: 'Concluído',           color: '#059669', bg: '#ECFDF5' },
  CANCELLED:         { label: 'Cancelado',           color: '#DC2626', bg: '#FEF2F2' },
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

  function handleAvatarPress() {
    Alert.alert(
      user?.name?.split(' ')[0] || 'Conta',
      'O que deseja fazer?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair da conta', style: 'destructive', onPress: signOut },
      ]
    )
  }

  const firstName = user?.name?.split(' ')[0] || 'você'

  return (
    <FlatList
      style={s.root}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ORANGE} />
      }
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View>
          {/* ─── HEADER ─── */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <Text style={s.greeting}>Olá, {firstName}! 👋</Text>
              <Text style={s.greetingSub}>O que precisa ser resolvido hoje?</Text>
            </View>
            <TouchableOpacity style={s.avatarBtn} onPress={handleAvatarPress} activeOpacity={0.7}>
              <Text style={s.avatarText}>{firstName.charAt(0).toUpperCase()}</Text>
            </TouchableOpacity>
          </View>

          {/* ─── TRUST BAR ─── */}
          <View style={s.trustBar}>
            <View style={s.trustItem}>
              <Text style={s.trustIcon}>✅</Text>
              <Text style={s.trustLabel}>Verificados</Text>
            </View>
            <View style={s.trustSep} />
            <View style={s.trustItem}>
              <Text style={s.trustIcon}>⚡</Text>
              <Text style={s.trustLabel}>Rápido</Text>
            </View>
            <View style={s.trustSep} />
            <View style={s.trustItem}>
              <Text style={s.trustIcon}>🛡️</Text>
              <Text style={s.trustLabel}>Garantido</Text>
            </View>
            <View style={s.trustSep} />
            <TouchableOpacity
              style={s.trustItem}
              onPress={() => Linking.openURL('https://wa.me/5531993398344')}
            >
              <Text style={s.trustIcon}>💬</Text>
              <Text style={s.trustLabel}>Suporte</Text>
            </TouchableOpacity>
          </View>

          {/* ─── CATEGORIES ─── */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Abrir novo chamado</Text>
            <Text style={s.sectionSub}>Selecione o tipo de serviço</Text>
          </View>

          <View style={s.grid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={s.catCard}
                onPress={() => navigation.navigate('NewOrder', { category: cat })}
                activeOpacity={0.8}
              >
                <View style={[s.catIconWrap, { backgroundColor: cat.iconBg }]}>
                  <Text style={s.catIcon}>{cat.icon}</Text>
                </View>
                <Text style={s.catLabel}>{cat.label}</Text>
                <Text style={s.catDesc}>{cat.desc}</Text>
                <Text style={s.catArrow}>Chamar →</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ─── RECENT ORDERS ─── */}
          <View style={s.recentHeader}>
            <Text style={s.sectionTitle}>Meus chamados</Text>
            <TouchableOpacity onPress={() => navigation.navigate('OrderHistory')}>
              <Text style={s.seeAll}>Ver todos →</Text>
            </TouchableOpacity>
          </View>
        </View>
      }
      data={orders}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => {
        const st = STATUS_CONFIG[item.status] || { label: item.status, color: '#666', bg: '#f5f5f5' }
        return (
          <TouchableOpacity
            style={s.orderCard}
            onPress={() => navigation.navigate('OrderStatus', { orderId: item.id })}
            activeOpacity={0.8}
          >
            <View style={[s.orderBar, { backgroundColor: st.color }]} />
            <View style={s.orderBody}>
              <View style={s.orderTop}>
                <Text style={s.orderCode}>{item.problemCode}</Text>
                <View style={[s.statusPill, { backgroundColor: st.bg }]}>
                  <Text style={[s.statusText, { color: st.color }]}>{st.label}</Text>
                </View>
              </View>
              {item.description ? (
                <Text style={s.orderDesc} numberOfLines={1}>{item.description}</Text>
              ) : null}
              <Text style={s.orderDate}>
                {new Date(item.createdAt).toLocaleDateString('pt-BR', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
              </Text>
            </View>
          </TouchableOpacity>
        )
      }}
      ListEmptyComponent={
        <View style={s.empty}>
          <Text style={s.emptyEmoji}>🔧</Text>
          <Text style={s.emptyTitle}>Nenhum chamado ainda</Text>
          <Text style={s.emptySub}>
            Selecione uma categoria acima para abrir{'\n'}seu primeiro chamado
          </Text>
        </View>
      }
      contentContainerStyle={{ paddingBottom: 40 }}
    />
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },

  /* Header */
  header: {
    backgroundColor: ORANGE,
    paddingTop: Platform.OS === 'ios' ? 56 : 32,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: { flex: 1 },
  greeting: { fontSize: 22, fontWeight: '800', color: '#fff' },
  greetingSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  avatarBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
    marginLeft: 12,
  },
  avatarText: { fontSize: 18, fontWeight: '900', color: '#fff' },

  /* Trust bar */
  trustBar: {
    backgroundColor: NAVY,
    paddingVertical: 11,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trustIcon: { fontSize: 12 },
  trustLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  trustSep: { width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.15)' },

  /* Section */
  sectionHeader: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: NAVY },
  sectionSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },

  /* Grid */
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 14, paddingTop: 12, gap: 10,
  },
  catCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  catIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 10,
  },
  catIcon: { fontSize: 22 },
  catLabel: { fontSize: 14, fontWeight: '800', color: NAVY, marginBottom: 2 },
  catDesc: { fontSize: 11, color: '#94A3B8', marginBottom: 10 },
  catArrow: { fontSize: 12, color: ORANGE, fontWeight: '700' },

  /* Recent header */
  recentHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20,
    paddingTop: 28, paddingBottom: 12,
  },
  seeAll: { fontSize: 13, color: ORANGE, fontWeight: '700' },

  /* Order card */
  orderCard: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: '#fff', borderRadius: 14,
    flexDirection: 'row', overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  orderBar: { width: 4 },
  orderBody: { flex: 1, padding: 14 },
  orderTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 6,
  },
  orderCode: { fontSize: 13, fontWeight: '700', color: NAVY, fontFamily: 'monospace' },
  statusPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  orderDesc: { fontSize: 13, color: '#64748B', marginBottom: 4 },
  orderDate: { fontSize: 11, color: '#94A3B8' },

  /* Empty */
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 52, marginBottom: 14 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: NAVY, marginBottom: 8 },
  emptySub: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 20 },
})
