import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BACKEND_URL } from '../../../src/lib/auth-client'; // ✅ FIXED IMPORT

export default function CupsScreen() {
  const router = useRouter();
  const [cups, setCups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCups = async () => {
    try {
      // ✅ FIXED API CALL
      const response = await fetch(`${BACKEND_URL}/api/v1/tournaments?isOfficial=true`);
      const data = await response.json();
      if (response.ok) {
        setCups(data);
      }
    } catch (error) {
      console.error("Failed to fetch cups:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCups();
    }, [])
  );

  const renderCup = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.cupCard}
      onPress={() => router.push(`/tiers?tournamentId=${item.id}`)}
    >
      <View style={styles.cardHeader}>
        <Ionicons name="trophy" size={24} color="#facc15" />
        <Text style={styles.cupName}>{item.name}</Text>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.statusText}>
          {item.status === 'pending' ? 'Registrations Open' : 'In Progress'}
        </Text>
        <View style={styles.playerCount}>
          <Ionicons name="people" size={16} color="#71717a" />
          <Text style={styles.playerCountText}>{item.currentPlayers}/{item.maxPlayers}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={styles.loader}><ActivityIndicator color="#38bdf8" /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={cups}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderCup}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCups(); }} tintColor="#38bdf8" />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#27272a" />
            <Text style={styles.emptyText}>No official cups are currently active.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loader: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, gap: 16 },
  cupCard: { backgroundColor: '#18181b', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#27272a' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  cupName: { color: '#fff', fontSize: 18, fontWeight: '800', flex: 1 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#27272a', paddingTop: 16 },
  statusText: { color: '#34d399', fontSize: 13, fontWeight: '600', textTransform: 'uppercase' },
  playerCount: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  playerCountText: { color: '#71717a', fontSize: 14, fontWeight: '500' },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#71717a', marginTop: 16, fontSize: 15 }
});
