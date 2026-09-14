import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { authClient, BACKEND_URL } from '../../src/lib/auth-client';

export default function StatsScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  
  // Data States
  const [historyGrouped, setHistoryGrouped] = useState<Record<string, any[]>>({});
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  const fetchHistoricalLeagues = async () => {
    setIsLoading(true);
    try {
      // Fetch all leagues from the backend
      const { data, error } = await authClient.$fetch<any[]>(`${BACKEND_URL}/api/v1/leagues`);
      
      if (!error && data) {
        // Filter for Official Completed Leagues only
        const completedLeagues = data.filter(l => l.isOfficial && l.status === 'completed');
        
        // Group by Month & Year
        const grouped = completedLeagues.reduce((acc: Record<string, any[]>, league) => {
          // Fallback to current date if startDate is missing, though completed leagues should have one
          const date = new Date(league.startDate || league.registrationEndsAt || Date.now());
          const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' }); // e.g., "August 2026"
          
          if (!acc[monthYear]) acc[monthYear] = [];
          acc[monthYear].push(league);
          return acc;
        }, {});

        // Sort months descending (newest first)
        const sortedMonths = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        
        setHistoryGrouped(grouped);
        setAvailableMonths(sortedMonths);
        
        // Default to the most recent month if available
        if (sortedMonths.length > 0 && !selectedMonth) {
          setSelectedMonth(sortedMonths[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch historical leagues:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHistoricalLeagues();
    }, [])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>HALL OF FAME</Text>
      </View>

      {isLoading ? (
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="large" color="#38bdf8" />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Calendar Month Filter Row */}
          <View style={{ height: 70, borderBottomWidth: 1, borderBottomColor: '#1f1f25', justifyContent: 'center' }}>
            {availableMonths.length > 0 ? (
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={availableMonths}
                keyExtractor={(item) => item}
                contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center' }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.monthChip, selectedMonth === item && styles.monthChipActive]}
                    onPress={() => setSelectedMonth(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="calendar-outline" size={14} color={selectedMonth === item ? '#000' : '#a1a1aa'} />
                    <Text style={[styles.monthChipText, selectedMonth === item && styles.monthChipTextActive]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            ) : (
              <Text style={styles.noFilterText}>Awaiting Season Data</Text>
            )}
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.infoBanner}>
              <Ionicons name="trophy" size={20} color="#f59e0b" />
              <Text style={styles.infoText}>Browse historical snapshots of past official seasons. Tap a league to view final standings and player stats.</Text>
            </View>

            {availableMonths.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="archive-outline" size={48} color="#27272a" />
                <Text style={styles.emptyText}>No completed official leagues found.</Text>
                <Text style={styles.emptySubtext}>Historical snapshots will automatically populate here once a season concludes.</Text>
              </View>
            ) : (
              // Map over the selected month's historical batches
              historyGrouped[selectedMonth]?.map((batch: any) => (
                <TouchableOpacity 
                  key={batch.id} 
                  style={styles.batchCard}
                  activeOpacity={0.8}
                  // Pushes to your existing dynamic league screen, which will load the ladder!
                  onPress={() => router.push({ pathname: '/league/[id]', params: { id: batch.id } })}
                >
                  <View style={styles.batchHeader}>
                    <Text style={styles.batchName}>{batch.name}</Text>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>Completed</Text>
                    </View>
                  </View>
                  <View style={styles.batchStats}>
                    <View style={styles.statItem}>
                      <Ionicons name="podium-outline" size={16} color="#a1a1aa" />
                      <Text style={styles.statText}>Final Standings Snapshot</Text>
                    </View>
                  </View>
                  <View style={styles.viewSnapshotBtn}>
                    <Text style={styles.viewSnapshotText}>View League Table</Text>
                    <Ionicons name="arrow-forward" size={16} color="#38bdf8" />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f13' },
  loaderCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1f1f25' },
  pageTitle: { color: '#93c5fd', fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  
  scrollContent: { padding: 20, paddingBottom: 40 },
  infoBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#f59e0b', marginBottom: 24, gap: 12 },
  infoText: { color: '#fcd34d', fontSize: 13, fontWeight: '600', flex: 1, lineHeight: 20 },
  
  noFilterText: { color: '#71717a', fontSize: 13, fontWeight: 'bold', textAlign: 'center', fontStyle: 'italic' },
  monthChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', marginRight: 10 },
  monthChipActive: { backgroundColor: '#38bdf8', borderColor: '#38bdf8' },
  monthChipText: { color: '#a1a1aa', fontSize: 13, fontWeight: 'bold' },
  monthChipTextActive: { color: '#000' },

  batchCard: { backgroundColor: '#121215', borderWidth: 1, borderColor: '#1f1f25', borderRadius: 16, padding: 20, marginBottom: 16 },
  batchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  batchName: { color: '#d4d4d8', fontSize: 16, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: '#27272a' },
  statusText: { fontSize: 12, fontWeight: 'bold', color: '#a1a1aa' },
  
  batchStats: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { color: '#a1a1aa', fontSize: 14, fontWeight: '500' },
  
  viewSnapshotBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#27272a', paddingTop: 16, marginTop: 4 },
  viewSnapshotText: { color: '#38bdf8', fontSize: 14, fontWeight: 'bold' },

  emptyState: { alignItems: 'center', marginTop: 60, paddingHorizontal: 30 },
  emptyText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginTop: 16, textAlign: 'center' },
  emptySubtext: { color: '#71717a', fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 }
});
