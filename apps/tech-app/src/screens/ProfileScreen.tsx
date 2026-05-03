import React, { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ScrollView, Switch,
} from 'react-native'
import { useAuth } from '../hooks/useAuth'
import api from '../services/api'

const CATEGORY_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  HID: { label: 'Hidráulica',  icon: '💧', color: '#3B82F6' },
  CIV: { label: 'Civil',       icon: '🏗️', color: '#F59E0B' },
  SER: { label: 'Serralheria', icon: '🔩', color: '#6B7280' },
  VID: { label: 'Vidraçaria',  icon: '🪟', color: '#06B6D4' },
}

export default function ProfileScreen() {
  const { user, signOut, refreshUser } = useAuth()
  const tech = user?.technician
  const [availLoading, setAvailLoading] = useState(false)
  const isAvailable = tech?.status === 'AVAILABLE'

  async function toggleAvailability(value: boolean) {
    if (!tech?.id) return
    setAvailLoading(true)
    try {
      await api.patch(`/technicians/${tech.id}/availability`, { available: value })
      await refreshUser()
    } catch {
      Alert.alert('Erro', 'Não foi possível alterar disponibilidade')
    } finally {
      setAvailLoading(false)
    }
  }

  async function handleSignOut() {
    Alert.alert('Sair', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: signOut },
    ])
  }

  if (!user) return null

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Avatar / Nome */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.role}>Técnico Credenciado</Text>
        {tech?.city && <Text style={styles.city}>📍 {tech.city}</Text>}
      </View>

      {/* Disponibilidade */}
      <View style={styles.section}>
        <View style={styles.availRow}>
          <View>
            <Text style={styles.availTitle}>Disponibilidade</Text>
            <Text style={styles.availSubtitle}>
              {isAvailable ? 'Você está recebendo chamados' : 'Você está offline'}
            </Text>
          </View>
          <Switch
            value={isAvailable}
            onValueChange={toggleAvailability}
            disabled={availLoading}
            trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
            thumbColor={isAvailable ? '#1E40AF' : '#9CA3AF'}
          />
        </View>
        <View style={[styles.statusDot, { backgroundColor: isAvailable ? '#D1FAE5' : '#FEE2E2' }]}>
          <Text style={{ fontSize: 12, color: isAvailable ? '#065F46' : '#991B1B', fontWeight: '600' }}>
            {isAvailable ? '● Disponível' : '● Offline'}
          </Text>
        </View>
      </View>

      {/* Estatísticas */}
      {tech && (
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Estatísticas</Text>
          <View style={styles.statsGrid}>
            <StatCard value={tech.rating?.toFixed(1) ?? '—'} label="Avaliação" icon="⭐" />
            <StatCard value={String(tech.jobsTotal ?? 0)} label="Total de jobs" icon="🔧" />
            <StatCard value={String(tech.jobsToday ?? 0)} label="Jobs hoje" icon="📅" />
          </View>
        </View>
      )}

      {/* Especialidades */}
      {tech?.specialties?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Especialidades</Text>
          <View style={styles.specialtiesRow}>
            {tech.specialties.map((sp: string) => {
              const cat = CATEGORY_LABELS[sp]
              if (!cat) return null
              return (
                <View key={sp} style={[styles.specialtyChip, { borderColor: cat.color, backgroundColor: cat.color + '15' }]}>
                  <Text style={styles.specialtyIcon}>{cat.icon}</Text>
                  <Text style={[styles.specialtyLabel, { color: cat.color }]}>{cat.label}</Text>
                </View>
              )
            })}
          </View>
        </View>
      )}

      {/* Sair */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sair do aplicativo</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Repara Lá Técnico v1.0</Text>
    </ScrollView>
  )
}

function StatCard({ value, label, icon }: { value: string; label: string; icon: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4ff' },
  header: {
    backgroundColor: '#1E40AF', paddingTop: 24, paddingBottom: 32,
    alignItems: 'center',
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center',
    justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 36, fontWeight: 'bold', color: '#fff' },
  name: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  role: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  city: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  section: {
    backgroundColor: '#fff', margin: 16, marginBottom: 0,
    borderRadius: 12, padding: 16,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 12 },
  availRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  availTitle: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  availSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  statusDot: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginTop: 10 },
  statsSection: { margin: 16, marginBottom: 0 },
  statsGrid: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12,
    padding: 14, alignItems: 'center',
  },
  statIcon: { fontSize: 22, marginBottom: 6 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a' },
  statLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2, textAlign: 'center' },
  specialtiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  specialtyChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  specialtyIcon: { fontSize: 16 },
  specialtyLabel: { fontSize: 13, fontWeight: '600' },
  signOutBtn: {
    margin: 16, marginTop: 24, borderWidth: 1.5, borderColor: '#EF4444',
    borderRadius: 10, padding: 14, alignItems: 'center',
  },
  signOutText: { fontSize: 15, color: '#EF4444', fontWeight: '600' },
  version: { textAlign: 'center', fontSize: 11, color: '#D1D5DB', marginBottom: 16 },
})
