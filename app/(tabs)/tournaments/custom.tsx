import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView, Share } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { authClient, BACKEND_URL } from '../../../src/lib/auth-client';
import { useAuth } from '../../../src/context/AuthContext';

export default function CustomTournamentsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  
  // Deep Link Catcher! (gameclashmobile://custom?code=XYZ)
  const { code } = useLocalSearchParams<{ code?: string }>();
  
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  
  const [myTournaments, setMyTournaments] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Auto-fill code if opened via a shared link
  useEffect(() => {
    if (code) setJoinCode(code.toUpperCase());
  }, [code]);

  const fetchMyHosted = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/tournaments?isOfficial=false&hostId=${session?.user?.id}`);
      const data = await response.json();
      if (response.ok) setMyTournaments(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMyHosted();
    }, [])
  );

  const handleJoinByCode = async () => {
    if (joinCode.trim().length !== 6) {
      return Alert.alert('Invalid Code', 'Invite codes are exactly 6 characters long.');
    }

    setIsJoining(true);
    try {
      let response = await authClient.$fetch<any>(`${BACKEND_URL}/api/v1/tournaments/custom/join`, {
        method: 'POST', body: { joinCode: joinCode.trim() }
      });

      if (response.error && (response.error as any).message?.includes('not found')) {
        response = await authClient.$fetch<any>(`${BACKEND_URL}/api/v1/leagues/custom/join`, {
          method: 'POST', body: { joinCode: joinCode.trim() }
        });
      }

      if (response.error) throw new Error((response.error as any).error || (response.error as any).message || 'Failed to join');

      Alert.alert('Success!', 'You have successfully joined the private competition.');
      setJoinCode('');
      // ✅ FIX: Cast as any to bypass strict typing
      router.push('/(tabs)/tournaments' as any);
    } catch (err: any) {
      if (err.message.includes('Insufficient tickets')) {
        Alert.alert('Not Enough Tickets', 'You need 1 ticket to join a custom competition.');
      } else {
        Alert.alert('Join Failed', err.message);
      }
    } finally {
      setIsJoining(false);
    }
  };

  const sharePastInvite = async (code: string, name: string) => {
    const message = `🏆 Join my custom competition "${name}" on Game Clash!\n\nInvite Code: ${code}\n\nOpen the app to join instantly:\ngameclashmobile://custom?code=${code}`;
    await Share.share({ message });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      
      <View style={styles.headerBox}>
        <View style={styles.iconCircle}>
          <FontAwesome5 name="users" size={24} color="#f59e0b" />
        </View>
        <Text style={styles.title}>Private Hub</Text>
        <Text style={styles.desc}>Host your own leagues or join custom knockout brackets with your friends.</Text>
      </View>

      {/* Join via Code Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Got an Invite Code?</Text>
        <Text style={styles.cardDesc}>Enter the 6-character code provided by the host to enter the lobby.</Text>
        
        <View style={styles.inputWrapper}>
          <Ionicons name="keypad" size={20} color="#71717a" />
          <TextInput
            style={styles.input}
            placeholder="e.g. X7Y9Z2"
            placeholderTextColor="#71717a"
            autoCapitalize="characters"
            maxLength={6}
            value={joinCode}
            onChangeText={setJoinCode}
          />
        </View>

        <TouchableOpacity style={[styles.joinBtn, (!joinCode || isJoining) && { opacity: 0.7 }]} disabled={!joinCode || isJoining} onPress={handleJoinByCode} activeOpacity={0.8}>
          {isJoining ? <ActivityIndicator color="#fff" /> : <Text style={styles.joinBtnText}>Join Lobby</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* ✅ FIX: Cast as any */}
      <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/create-tournament' as any)} activeOpacity={0.8}>
        <View style={styles.createBtnContent}>
          <Ionicons name="add-circle" size={24} color="#000" />
          <Text style={styles.createBtnText}>Host a Competition</Text>
        </View>
      </TouchableOpacity>

      {/* Hosted Tournaments History Panel */}
      <View style={styles.historySection}>
        <Text style={styles.historyTitle}>My Hosted Lobbies</Text>
        
        {loadingHistory ? (
          <ActivityIndicator color="#38bdf8" style={{ marginTop: 20 }} />
        ) : myTournaments.length === 0 ? (
          <Text style={styles.emptyText}>You haven't hosted any custom competitions yet.</Text>
        ) : (
          myTournaments.map((t) => (
             <TouchableOpacity 
              key={t.id} 
              style={styles.historyItem}
              activeOpacity={0.7}
              onPress={() => router.push({ pathname: '/tournament/[id]', params: { id: t.id } } as any)}
             >
              <View style={styles.historyInfo}>
                <Text style={styles.historyName}>{t.name}</Text>
                <View style={styles.historyMetaRow}>
                  <Text style={[styles.historyStatus, t.status === 'completed' && { color: '#a1a1aa' }]}>
                    {t.status.replace('_', ' ').toUpperCase()}
                  </Text>
                  <Text style={styles.historyMetaDot}>•</Text>
                  <Text style={styles.historyPlayers}>{t.currentPlayers}/{t.maxPlayers} Players</Text>
                </View>
              </View>

              {t.joinCode && t.status === 'pending' && (
                <TouchableOpacity 
                  style={styles.historyShareBtn} 
                  onPress={(e) => {
                    e.stopPropagation(); // Prevents click from bubbling to layout row navigation
                    sharePastInvite(t.joinCode, t.name);
                  }}
                >
                  <Ionicons name="share-social" size={20} color="#000" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))
        )}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f13' },
  headerBox: { alignItems: 'center', marginBottom: 32, marginTop: 10 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(245, 158, 11, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#f59e0b' },
  title: { color: '#fff', fontSize: 24, fontWeight: '900', marginBottom: 8, letterSpacing: 1 },
  desc: { color: '#a1a1aa', fontSize: 14, textAlign: 'center', paddingHorizontal: 20, lineHeight: 22 },
  card: { backgroundColor: '#18181b', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#27272a' },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  cardDesc: { color: '#71717a', fontSize: 13, marginBottom: 20, lineHeight: 18 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1f1f25', borderWidth: 1, borderColor: '#333', borderRadius: 12, paddingHorizontal: 16, marginBottom: 16 },
  input: { flex: 1, color: '#fff', fontSize: 20, fontWeight: '900', paddingVertical: 16, marginLeft: 12, letterSpacing: 4 },
  joinBtn: { backgroundColor: '#3b82f6', paddingVertical: 16, borderRadius: 10, alignItems: 'center' },
  joinBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15, letterSpacing: 1 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 32 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#27272a' },
  dividerText: { color: '#71717a', marginHorizontal: 16, fontWeight: 'bold', fontSize: 12 },
  createBtn: { backgroundColor: '#38bdf8', paddingVertical: 18, borderRadius: 12, alignItems: 'center' },
  createBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  createBtnText: { color: '#000', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  historySection: { marginTop: 40 },
  historyTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 16 },
  emptyText: { color: '#71717a', fontSize: 14, fontStyle: 'italic' },
  historyItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#18181b', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#27272a', marginBottom: 12 },
  historyInfo: { flex: 1 },
  historyName: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  historyMetaRow: { flexDirection: 'row', alignItems: 'center' },
  historyStatus: { color: '#34d399', fontSize: 12, fontWeight: '700' },
  historyMetaDot: { color: '#71717a', marginHorizontal: 8, fontSize: 12 },
  historyPlayers: { color: '#a1a1aa', fontSize: 12, fontWeight: '500' },
  historyShareBtn: { backgroundColor: '#93c5fd', padding: 10, borderRadius: 8, marginLeft: 12 }
});
