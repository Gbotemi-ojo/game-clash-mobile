import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  Animated 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { authClient, BACKEND_URL } from '../../src/lib/auth-client';

export default function PlayerProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [playerData, setPlayerData] = useState<any>(null);
  const [errorState, setErrorState] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const fetchPlayerData = async () => {
      try {
        const { data, error } = await authClient.$fetch<any>(`${BACKEND_URL}/api/v1/users/${id}/profile`);
        if (error || !data) {
          setErrorState(true);
        } else {
          setPlayerData(data);
        }
      } catch (err) {
        setErrorState(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlayerData();
  }, [id]);

  useEffect(() => {
    if (!isLoading && !errorState && playerData) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true })
      ]).start();
    }
  }, [isLoading, errorState, playerData]);

  const handleDirectMessage = () => {
    // ✅ Properly navigates to the new Chat Screen, passing the user's ID
    router.push({ 
      pathname: '/chat/[id]', 
      params: { id: id as string } 
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  if (errorState || !playerData) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ef4444" style={{ marginBottom: 16 }} />
        <Text style={styles.errorTitle}>Player Not Found</Text>
        <TouchableOpacity style={styles.goBackBtn} onPress={() => router.back()}>
          <Text style={styles.goBackText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const pData = playerData.profile || {};
  const lStats = playerData.leagueStats || {};
  const badges = playerData.badges || [];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}>
          <Ionicons name="chevron-back" size={28} color="#93c5fd" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PLAYER CARD</Text>
        <View style={{ width: 40 }}></View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          
          <View style={styles.heroCard}>
            <View style={styles.heroAvatar}>
              <FontAwesome5 name="user-astronaut" size={40} color="#38bdf8" />
            </View>
            <Text style={styles.heroGamerTag}>{pData.gamerTag || pData.teamName || 'Unknown Player'}</Text>
            <Text style={styles.heroName}>{playerData.name || ''}</Text>
            
            <View style={styles.leaguePill}>
              <Text style={styles.leaguePillText}>{lStats.leagueName || 'Unranked / No Active League'}</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statSquare}>
              <Text style={styles.statLabel}>POINTS</Text>
              <Text style={[styles.statValue, { color: '#f59e0b' }]}>{lStats.points || 0}</Text>
            </View>
            <View style={styles.statSquare}>
              <Text style={styles.statLabel}>WIN RATE</Text>
              <Text style={[styles.statValue, { color: '#10b981' }]}>{pData.winPercent || '0%'}</Text>
            </View>
            <View style={styles.statSquare}>
              <Text style={styles.statLabel}>GOAL DIFF</Text>
              <Text style={[styles.statValue, { color: '#38bdf8' }]}>
                {lStats.goalDifference > 0 ? `+${lStats.goalDifference}` : (lStats.goalDifference || 0)}
              </Text>
            </View>
            <View style={styles.statSquare}>
              <Text style={styles.statLabel}>FORM</Text>
              {lStats.form ? (
                <View style={styles.formRow}>
                  {lStats.form.split('').map((f: string, i: number) => (
                    <View key={i} style={[styles.formBox, f === 'W' ? styles.formW : f === 'L' ? styles.formL : styles.formD]}>
                      <Text style={styles.formText}>{f}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.statValue}>---</Text>
              )}
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="trophy-outline" size={20} color="#f59e0b" />
              <Text style={styles.cardTitle}>Earned Badges</Text>
            </View>
            
            {badges.length === 0 ? (
              <Text style={styles.emptyCabinetText}>This player has not earned any hardware yet.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgeScroll}>
                {badges.map((b: any, index: number) => (
                  <View key={index} style={styles.badgeBox}>
                    <Ionicons name="medal" size={28} color="#eab308" />
                    <Text style={styles.badgeName}>{b.badgeType?.replace('_', ' ') || 'BADGE'}</Text>
                    <Text style={styles.badgeCount}>x{b.count || 1}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

        </Animated.View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.messageBtn} activeOpacity={0.8} onPress={handleDirectMessage}>
          <Ionicons name="chatbubbles" size={22} color="#fff" />
          <Text style={styles.messageBtnText}>DIRECT MESSAGE</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: '#0f0f13', justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#0f0f13' },
  
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f1f25' },
  backBtn: { padding: 8 },
  headerTitle: { color: '#93c5fd', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100, gap: 20 },

  heroCard: { alignItems: 'center', backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 16, padding: 30 },
  heroAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1f1f25', borderWidth: 2, borderColor: '#38bdf8', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  heroGamerTag: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: 1, marginBottom: 4, textAlign: 'center' },
  heroName: { color: '#a1a1aa', fontSize: 15, fontWeight: '600', marginBottom: 16 },
  leaguePill: { backgroundColor: 'rgba(245, 158, 11, 0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#f59e0b' },
  leaguePillText: { color: '#f59e0b', fontSize: 13, fontWeight: 'bold' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  statSquare: { width: '48%', backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 16, padding: 16, alignItems: 'center' },
  statLabel: { color: '#71717a', fontSize: 11, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  statValue: { color: '#fff', fontSize: 24, fontWeight: '900' },
  formRow: { flexDirection: 'row', gap: 4 },
  formBox: { width: 20, height: 20, borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
  formW: { backgroundColor: '#10b981' },
  formL: { backgroundColor: '#ef4444' },
  formD: { backgroundColor: '#52525b' },
  formText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  card: { backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 16, padding: 20 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  emptyCabinetText: { color: '#a1a1aa', fontSize: 14, fontStyle: 'italic', paddingVertical: 10 },
  badgeScroll: { paddingTop: 10, gap: 12 },
  badgeBox: { backgroundColor: '#222225', padding: 16, borderRadius: 12, alignItems: 'center', width: 110, borderWidth: 1, borderColor: '#333' },
  badgeName: { color: '#fff', fontSize: 11, fontWeight: 'bold', marginTop: 8, textAlign: 'center' },
  badgeCount: { color: '#f59e0b', fontSize: 12, fontWeight: '900', marginTop: 4 },

  errorTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  goBackBtn: { backgroundColor: '#334155', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  goBackText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(15, 15, 19, 0.95)', paddingHorizontal: 20, paddingVertical: 20, borderTopWidth: 1, borderTopColor: '#27272a' },
  messageBtn: { flexDirection: 'row', backgroundColor: '#3b82f6', paddingVertical: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 10 },
  messageBtnText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
});
