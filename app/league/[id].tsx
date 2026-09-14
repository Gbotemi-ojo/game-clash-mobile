import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { authClient, BACKEND_URL } from '../../src/lib/auth-client';
import { useAuth } from '../../src/context/AuthContext';
import { useSocket } from '../../src/context/SocketContext';

// Abstracted Components
import LeagueLadderTable from '../../src/components/arena/LeagueLadderTable';
import FixtureCard from '../../src/components/arena/FixtureCard';

export default function LeagueDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { socket } = useSocket();

  const [activeTab, setActiveTab] = useState<'table' | 'fixtures'>('table');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ladder, setLadder] = useState<any[]>([]);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [leagueName, setLeagueName] = useState('League Hub');
  
  // Match Engine State
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const serverTimeOffsetRef = useRef(0);

  const fetchLeagueData = async (silent = false) => {
    try {
      // Fetch authenticated data
      const [ladderRes, fixturesRes, meRes] = await Promise.all([
        authClient.$fetch<any[]>(`${BACKEND_URL}/api/v1/leagues/${id}/ladder`),
        authClient.$fetch<any[]>(`${BACKEND_URL}/api/v1/leagues/${id}/fixtures`),
        authClient.$fetch<any>(`${BACKEND_URL}/api/v1/users/me`)
      ]);

      if (meRes.data?.serverTime) {
        serverTimeOffsetRef.current = meRes.data.serverTime - Date.now();
        setCurrentTime(Date.now() + serverTimeOffsetRef.current);
      }

      if (!ladderRes.error && ladderRes.data) {
        setLadder(ladderRes.data);
        if (ladderRes.data[0]?.leagueName) {
          setLeagueName(ladderRes.data[0].leagueName);
        }
      }

      if (!fixturesRes.error && fixturesRes.data) {
        setFixtures(fixturesRes.data);
      }
    } catch (error) {
      console.error("Error fetching league details:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (id) fetchLeagueData();
    }, [id])
  );

  // Time Sync Interval for Match Engine Buttons
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now() + serverTimeOffsetRef.current);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Real-Time Socket Listener
  const fetchRef = useRef(fetchLeagueData);
  useEffect(() => {
    fetchRef.current = fetchLeagueData;
  }, [fetchLeagueData]);

  useEffect(() => {
    if (!socket) return;
    const handleAppUpdate = () => fetchRef.current(true);
    socket.on('app_update', handleAppUpdate);
    return () => {
      socket.off('app_update', handleAppUpdate);
    };
  }, [socket]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLeagueData();
  };

  // Shared Match Actions
  const handleApiAction = async (matchId: number, endpoint: string, body?: any, successMessage?: string) => {
    setActionLoadingId(matchId);
    try {
      const { error } = await authClient.$fetch<any>(`${BACKEND_URL}/api/v1/matches/${matchId}/${endpoint}`, {
        method: 'POST',
        body
      });
      if (error) throw new Error((error as any).error || error.message || 'Action failed');
      if (successMessage) Alert.alert("Success", successMessage);
      fetchLeagueData(true);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleProposeTime = (matchId: number, scheduledAt: string, adjournTime: string) => {
    const newDate = new Date(scheduledAt);
    const [hours, minutes] = adjournTime.split(':');
    newDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    handleApiAction(matchId, 'propose-time', { newTime: newDate.toISOString() }, "Adjournment proposed!");
  };

  if (loading) {
    return (
      <View style={localStyles.loaderContainer}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  const myUserId = session?.user?.id || null;

  return (
    <SafeAreaView style={localStyles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={localStyles.header}>
        <TouchableOpacity onPress={() => router.back()} style={localStyles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#93c5fd" />
        </TouchableOpacity>
        <Text style={localStyles.pageTitle} numberOfLines={1}>
          {leagueName.toUpperCase()}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Segmented Tab Bar */}
      <View style={localStyles.tabContainer}>
        <TouchableOpacity 
          style={[localStyles.tabButton, activeTab === 'table' && localStyles.tabButtonActive]} 
          onPress={() => setActiveTab('table')}
          activeOpacity={0.8}
        >
          <FontAwesome5 name="table" size={16} color={activeTab === 'table' ? '#38bdf8' : '#a1a1aa'} />
          <Text style={[localStyles.tabText, activeTab === 'table' && localStyles.tabTextActive]}>Standings</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[localStyles.tabButton, activeTab === 'fixtures' && localStyles.tabButtonActive]} 
          onPress={() => setActiveTab('fixtures')}
          activeOpacity={0.8}
        >
          <Ionicons name="calendar-sharp" size={18} color={activeTab === 'fixtures' ? '#38bdf8' : '#a1a1aa'} />
          <Text style={[localStyles.tabText, activeTab === 'fixtures' && localStyles.tabTextActive]}>My Fixtures</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      {activeTab === 'table' ? (
        <ScrollView 
          style={{ flex: 1, padding: 16 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#38bdf8" />}
        >
          <LeagueLadderTable ladder={ladder} myUserId={myUserId} />
          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        <FlatList
          data={fixtures}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#38bdf8" />}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          renderItem={({ item }) => {
            // Dynamically calculate the match state for every fixture in the list
            const isPlayerA = item.playerAId === myUserId;
            const amIReady = isPlayerA ? item.playerAReady : item.playerBReady;
            const myScore = isPlayerA ? (item.playerAScore || 0) : (item.playerBScore || 0);
            const oppScore = isPlayerA ? (item.playerBScore || 0) : (item.playerAScore || 0);
            const oppTeam = isPlayerA ? (item.playerBTeam || 'TBD') : (item.playerATeam || 'TBD');

            const matchTime = new Date(item.scheduledAt).getTime();
            const diffMins = (currentTime - matchTime) / 60000;
            const minsSinceStart = item.startedAt ? (currentTime - new Date(item.startedAt).getTime()) / 60000 : 0;

            const isWindowActive = diffMins >= 0 && diffMins <= 30 && item.status === 'pending';
            const proposedAdjournment = item.detailedStats?.proposedAdjournment;
            const amIProposer = proposedAdjournment?.byUserId === myUserId;

            return (
              <View style={localStyles.fixtureWrapper}>
                <FixtureCard
                  targetFixture={item}
                  myUserId={myUserId}
                  actionLoadingId={actionLoadingId}
                  isPlayerA={isPlayerA}
                  amIReady={amIReady}
                  myScore={myScore}
                  oppScore={oppScore}
                  oppTeam={oppTeam}
                  diffMins={diffMins}
                  minsSinceStart={minsSinceStart}
                  isWindowActive={isWindowActive}
                  proposedAdjournment={proposedAdjournment}
                  amIProposer={amIProposer}
                  handleApiAction={handleApiAction}
                  handleProposeTime={handleProposeTime}
                />
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={localStyles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#27272a" />
              <Text style={localStyles.emptyText}>No fixtures generated yet.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f13' },
  loaderContainer: { flex: 1, backgroundColor: '#0f0f13', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f1f25' },
  backBtn: { padding: 8 },
  pageTitle: { color: '#93c5fd', fontSize: 16, fontWeight: '900', letterSpacing: 1, flex: 1, textAlign: 'center' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#18181b', margin: 16, padding: 4, borderRadius: 10, borderWidth: 1, borderColor: '#27272a' },
  tabButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 8 },
  tabButtonActive: { backgroundColor: '#1f1f25', borderWidth: 1, borderColor: '#333' },
  tabText: { color: '#a1a1aa', fontSize: 14, fontWeight: '700' },
  tabTextActive: { color: '#38bdf8' },
  fixtureWrapper: { backgroundColor: '#18181b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#27272a', marginBottom: 16 },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#71717a', fontSize: 14, textAlign: 'center', marginTop: 12 }
});
