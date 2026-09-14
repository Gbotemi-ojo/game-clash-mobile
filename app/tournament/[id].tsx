// app/tournament/[id].tsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { authClient, BACKEND_URL } from '../../src/lib/auth-client';
import { useAuth } from '../../src/context/AuthContext';
import { useSocket } from '../../src/context/SocketContext';
import FixtureCard from '../../src/components/arena/FixtureCard';

// Helper Functions for Bracket Rendering
const groupBracketRounds = (matches: any[]) => {
  const rounds = matches.reduce((acc: any, match: any) => {
    const r = match.tournamentRound || 1;
    if (!acc[r]) acc[r] = [];
    acc[r].push(match);
    return acc;
  }, {});
  const maxRound = Math.max(...Object.keys(rounds).map(Number), 0);
  return { rounds, maxRound };
};

const getRoundName = (roundNum: number, maxRound: number) => {
  if (roundNum === maxRound && maxRound > 1) return "🏆 The Final";
  if (roundNum === maxRound - 1 && maxRound > 2) return "Semi-Finals";
  if (roundNum === maxRound - 2 && maxRound > 3) return "Quarter-Finals";
  return `Round ${roundNum}`;
};

export default function TournamentDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { socket } = useSocket();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tournament, setTournament] = useState<any>(null);
  const [roster, setRoster] = useState<any[]>([]);
  const [bracketMatches, setBracketMatches] = useState<any[]>([]);

  // Match Engine State
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const serverTimeOffsetRef = useRef(0);

  const fetchTournamentData = async (silent = false) => {
    try {
      const meRes = await authClient.$fetch<any>(`${BACKEND_URL}/api/v1/users/me`);
      if (meRes.data?.serverTime) {
        serverTimeOffsetRef.current = meRes.data.serverTime - Date.now();
        setCurrentTime(Date.now() + serverTimeOffsetRef.current);
      }

      const tRes = await authClient.$fetch<any>(`${BACKEND_URL}/api/v1/tournaments/${id}`);
      if (!tRes.error && tRes.data) {
        setTournament(tRes.data);
        
        if (tRes.data.status === 'pending') {
            const rRes = await authClient.$fetch<any[]>(`${BACKEND_URL}/api/v1/tournaments/${id}/roster`);
            if (rRes.data) setRoster(rRes.data);
        } else {
            const bRes = await authClient.$fetch<any>(`${BACKEND_URL}/api/v1/tournaments/${id}/bracket`);
            if (bRes.data?.matches) setBracketMatches(bRes.data.matches);
        }
      }
    } catch (error) {
      console.error("Error fetching tournament details:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { if (id) fetchTournamentData(); }, [id]));

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now() + serverTimeOffsetRef.current), 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchRef = useRef(fetchTournamentData);
  useEffect(() => { fetchRef.current = fetchTournamentData; }, [fetchTournamentData]);
  
  useEffect(() => {
    if (!socket) return;
    const handleAppUpdate = () => fetchRef.current(true);
    socket.on('app_update', handleAppUpdate);
    return () => { socket.off('app_update', handleAppUpdate); };
  }, [socket]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTournamentData();
  };

  const handleApiAction = async (matchId: number, endpoint: string, body?: any, successMessage?: string) => {
    setActionLoadingId(matchId);
    try {
      const { error } = await authClient.$fetch<any>(`${BACKEND_URL}/api/v1/matches/${matchId}/${endpoint}`, {
        method: 'POST', body
      });
      if (error) throw new Error((error as any).error || error.message || 'Action failed');
      if (successMessage) Alert.alert("Success", successMessage);
      fetchTournamentData(true);
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
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  const myUserId = session?.user?.id || null;
  const { rounds, maxRound } = groupBracketRounds(bracketMatches);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#93c5fd" />
        </TouchableOpacity>
        <Text style={styles.pageTitle} numberOfLines={1}>
          {tournament?.name?.toUpperCase() || 'CUP HUB'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#38bdf8" />}
      >
        {tournament?.status === 'pending' ? (
          // ===================================
          // PENDING VIEW: ROSTER & COUNTDOWN
          // ===================================
          <View style={styles.card}>
            <View style={styles.pregameBox}>
              <Text style={styles.pregameLabel}>BRACKET GENERATION DATE</Text>
              <Text style={styles.pregameTime}>
                {tournament.startTime ? new Date(tournament.startTime).toLocaleString() : 'TBD'}
              </Text>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={styles.sectionTitle}>Qualified Roster</Text>
                <Text style={{ color: '#a1a1aa', fontWeight: 'bold' }}>{roster.length} / {tournament.maxPlayers}</Text>
            </View>
            
            <View style={styles.tableWrapper}>
                <View style={styles.tableHeaderRow}>
                    <Text style={styles.tableHeaderText}>PLAYER / CLUB</Text>
                    {tournament.isOfficial && <Text style={[styles.tableHeaderText, { width: 60, textAlign: 'center' }]}>PTS</Text>}
                    {tournament.isOfficial && <Text style={[styles.tableHeaderText, { width: 40, textAlign: 'center' }]}>GD</Text>}
                </View>
                {roster.map((entry, idx) => {
                    const isMe = entry.userId === myUserId;
                    return (
                        <View key={idx} style={[styles.tableDataRow, isMe && styles.highlightRow]}>
                            <Text style={[styles.clubText, isMe && { color: '#fff', fontWeight: 'bold' }]} numberOfLines={1}>
                                {entry.teamName || entry.userName || "Independent FC"}
                            </Text>
                            {tournament.isOfficial && <Text style={[styles.statCell, { color: '#10b981', fontWeight: 'bold', width: 60 }]}>{entry.points}</Text>}
                            {tournament.isOfficial && <Text style={[styles.statCell, { width: 40 }]}>{entry.goalDifference > 0 ? `+${entry.goalDifference}` : entry.goalDifference}</Text>}
                        </View>
                    )
                })}
            </View>
          </View>
        ) : (
          // ===================================
          // ACTIVE VIEW: BRACKET MATCHES
          // ===================================
          <View style={{ gap: 24 }}>
            {Object.keys(rounds).sort((a, b) => Number(b) - Number(a)).map((roundNum) => (
              <View key={roundNum} style={styles.roundContainer}>
                <Text style={styles.roundTitle}>{getRoundName(Number(roundNum), maxRound)}</Text>
                
                {rounds[roundNum].map((match: any) => {
                  const isMyMatch = match.playerAId === myUserId || match.playerBId === myUserId;
                  
                  if (isMyMatch) {
                    // Full interactive card if it's the current user's match
                    const isPlayerA = match.playerAId === myUserId;
                    const amIReady = isPlayerA ? match.playerAReady : match.playerBReady;
                    const myScore = isPlayerA ? (match.playerAScore || 0) : (match.playerBScore || 0);
                    const oppScore = isPlayerA ? (match.playerBScore || 0) : (match.playerAScore || 0);
                    const oppTeam = isPlayerA ? (match.playerBName || 'TBD') : (match.playerAName || 'TBD');
                    const matchTime = new Date(match.scheduledAt).getTime();
                    const diffMins = (currentTime - matchTime) / 60000;
                    const minsSinceStart = match.startedAt ? (currentTime - new Date(match.startedAt).getTime()) / 60000 : 0;
                    const isWindowActive = diffMins >= 0 && diffMins <= 30 && match.status === 'pending';
                    
                    return (
                        <View key={match.id} style={[styles.fixtureWrapper, { borderColor: '#f59e0b', borderWidth: 2 }]}>
                            <FixtureCard
                                targetFixture={match}
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
                                proposedAdjournment={match.detailedStats?.proposedAdjournment}
                                amIProposer={match.detailedStats?.proposedAdjournment?.byUserId === myUserId}
                                handleApiAction={handleApiAction}
                                handleProposeTime={handleProposeTime}
                            />
                        </View>
                    )
                  } else {
                    // Simple read-only row for other players' matches
                    return (
                        <View key={match.id} style={styles.nonUserMatchCard}>
                            <Text style={styles.matchTimeRow}>{new Date(match.scheduledAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
                            <View style={styles.teamsRow}>
                                <Text style={[styles.teamNameText, match.winnerId === match.playerAId && { color: '#10b981' }]} numberOfLines={1}>{match.playerAName}</Text>
                                <View style={styles.scoreBadge}>
                                    <Text style={styles.scoreText}>
                                        {match.status === 'completed' ? `${match.playerAScore} - ${match.playerBScore}` : 'VS'}
                                    </Text>
                                </View>
                                <Text style={[styles.teamNameText, match.winnerId === match.playerBId && { color: '#10b981' }]} numberOfLines={1}>{match.playerBName}</Text>
                            </View>
                        </View>
                    );
                  }
                })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f13' },
  loaderContainer: { flex: 1, backgroundColor: '#0f0f13', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f1f25' },
  backBtn: { padding: 8 },
  pageTitle: { color: '#facc15', fontSize: 16, fontWeight: '900', letterSpacing: 1, flex: 1, textAlign: 'center' },
  
  card: { backgroundColor: '#18181b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#27272a' },
  pregameBox: { backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#f59e0b', marginBottom: 24, alignItems: 'center' },
  pregameLabel: { color: '#f59e0b', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, marginBottom: 4 },
  pregameTime: { color: '#fff', fontSize: 16, fontWeight: '900' },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  
  tableWrapper: { borderTopWidth: 1, borderTopColor: '#27272a', marginTop: 8 },
  tableHeaderRow: { flexDirection: 'row', alignItems: 'center', height: 40, borderBottomWidth: 1, borderBottomColor: '#27272a', backgroundColor: '#1f1f25', paddingHorizontal: 8 },
  tableHeaderText: { color: '#71717a', fontSize: 11, fontWeight: 'bold', flex: 1 },
  tableDataRow: { flexDirection: 'row', alignItems: 'center', height: 48, borderBottomWidth: 1, borderBottomColor: '#27272a', paddingHorizontal: 8 },
  highlightRow: { backgroundColor: 'rgba(245, 158, 11, 0.1)' },
  clubText: { color: '#d4d4d8', fontSize: 14, fontWeight: '500', flex: 1, paddingRight: 8 },
  statCell: { color: '#d4d4d8', fontSize: 13, textAlign: 'center' },

  roundContainer: { backgroundColor: '#18181b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#27272a' },
  roundTitle: { color: '#facc15', fontSize: 16, fontWeight: '900', textAlign: 'center', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
  fixtureWrapper: { backgroundColor: '#121215', borderRadius: 12, padding: 16, marginBottom: 12 },
  
  nonUserMatchCard: { backgroundColor: '#1f1f25', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#333' },
  matchTimeRow: { color: '#71717a', fontSize: 11, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  teamsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  teamNameText: { color: '#d4d4d8', fontSize: 14, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  scoreBadge: { backgroundColor: '#27272a', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6, marginHorizontal: 10 },
  scoreText: { color: '#fff', fontSize: 12, fontWeight: '900' }
});
