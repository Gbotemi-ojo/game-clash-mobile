import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function LeagueBrowserScreen() {
  const router = useRouter();

  const batches = [
    { id: 1, name: 'July League - Batch 01', players: '20/20', status: 'Full', entryFee: '1 Ticket' },
    { id: 2, name: 'July League - Batch 02', players: '14/20', status: 'Open', entryFee: '1 Ticket' },
    { id: 3, name: 'July League - Batch 03', players: '0/20', status: 'Open', entryFee: '1 Ticket' }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#93c5fd" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>BROWSE LEAGUES</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={20} color="#38bdf8" />
          <Text style={styles.infoText}>Leagues run from the 1st to the 19th of every month.</Text>
        </View>

        {batches.map((batch) => (
          <View key={batch.id} style={styles.batchCard}>
            <View style={styles.batchHeader}>
              <Text style={styles.batchName}>{batch.name}</Text>
              <View style={[styles.statusBadge, batch.status === 'Full' ? styles.statusFull : styles.statusOpen]}>
                <Text style={[styles.statusText, batch.status === 'Full' ? styles.statusTextFull : styles.statusTextOpen]}>
                  {batch.status}
                </Text>
              </View>
            </View>

            <View style={styles.batchStats}>
              <View style={styles.statItem}>
                <Ionicons name="people" size={16} color="#a1a1aa" />
                <Text style={styles.statText}>{batch.players} Players</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="ticket" size={16} color="#f59e0b" />
                <Text style={[styles.statText, { color: '#f59e0b' }]}>{batch.entryFee}</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.joinBtn, batch.status === 'Full' && styles.joinBtnDisabled]}
              disabled={batch.status === 'Full'}
            >
              <Text style={styles.joinBtnText}>{batch.status === 'Full' ? 'Registration Closed' : 'Join League'}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f13' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f1f25' },
  backBtn: { padding: 8 },
  pageTitle: { color: '#93c5fd', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  infoBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(56, 189, 248, 0.1)', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#38bdf8', marginBottom: 24, gap: 12 },
  infoText: { color: '#38bdf8', fontSize: 13, fontWeight: '600', flex: 1 },
  batchCard: { backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 16, padding: 20, marginBottom: 16 },
  batchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  batchName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusOpen: { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
  statusFull: { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  statusTextOpen: { color: '#10b981' },
  statusTextFull: { color: '#ef4444' },
  batchStats: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { color: '#a1a1aa', fontSize: 14, fontWeight: '500' },
  joinBtn: { backgroundColor: '#f59e0b', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  joinBtnDisabled: { backgroundColor: '#3f3f46' },
  joinBtnText: { color: '#000', fontSize: 15, fontWeight: 'bold' }
});
