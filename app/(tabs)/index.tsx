import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Animated, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import ArenaHeader from '../../src/components/home/ArenaHeader';
import RegistrationCard from '../../src/components/home/RegistrationCard';
import RewardCard from '../../src/components/home/RewardCard';
import HamburgerMenuModal from '../../src/components/home/HamburgerMenuModal';
import { authClient, BACKEND_URL } from '../../src/lib/auth-client'; 

export default function DlsHubHomeScreen() {
  const router = useRouter();
  const [isMenuVisible, setMenuVisible] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeLeague, setActiveLeague] = useState<any>(null);

  const fadeAnim1 = useRef(new Animated.Value(0)).current;
  const translateY1 = useRef(new Animated.Value(30)).current;
  const fadeAnim2 = useRef(new Animated.Value(0)).current;
  const translateY2 = useRef(new Animated.Value(30)).current;
  
  // Animation refs for ecosystem links
  const fadeAnim3 = useRef(new Animated.Value(0)).current;
  const translateY3 = useRef(new Animated.Value(30)).current;

  // Animation refs for the Custom Tournament card
  const fadeAnim4 = useRef(new Animated.Value(0)).current;
  const translateY4 = useRef(new Animated.Value(30)).current;

  const scrollViewRef = useRef<ScrollView>(null);
  const registrationCardYRef = useRef(0);

  const fetchDashboardData = async () => {
    try {
      const { data: profileData, error: profileErr } = await authClient.$fetch<any>(`${BACKEND_URL}/api/v1/users/me`);
      if (!profileErr && profileData) {
        setUserProfile(profileData);
      }

      const { data: leagueData, error: leagueErr } = await authClient.$fetch<any>(`${BACKEND_URL}/api/v1/leagues/my-active`);
      if (!leagueErr && leagueData) {
        setActiveLeague(leagueData.message ? null : leagueData);
      }
    } catch (error) {
      console.log("Error fetching dashboard data", error);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    Animated.stagger(150, [
      Animated.parallel([
        Animated.timing(fadeAnim1, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(translateY1, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true })
      ]),
      Animated.parallel([
        Animated.timing(fadeAnim2, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(translateY2, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true })
      ]),
      Animated.parallel([
        Animated.timing(fadeAnim3, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(translateY3, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true })
      ]),
      Animated.parallel([
        Animated.timing(fadeAnim4, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(translateY4, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true })
      ])
    ]).start();
  }, []);

  const handleRequireScroll = (y: number) => {
    scrollViewRef.current?.scrollTo({ y: registrationCardYRef.current + y, animated: true });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      
      {/* Wrapper to guarantee the header sits completely above the scroll view */}
      <View style={{ zIndex: 10, elevation: 10 }}>
        <ArenaHeader 
          onOpenMenu={() => {
            console.log(" Hamburger Menu Clicked!");
            setMenuVisible(true);
          }} 
          ticketCount={userProfile?.wallet?.tickets ?? 0}
        />
      </View>

      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View 
          style={{ opacity: fadeAnim1, transform: [{ translateY: translateY1 }] }}
          onLayout={(e) => { registrationCardYRef.current = e.nativeEvent.layout.y; }}
        >
          <RegistrationCard activeLeague={activeLeague} onJoinSuccess={fetchDashboardData} onRequireScroll={handleRequireScroll} />
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim2, transform: [{ translateY: translateY2 }] }}>
          <RewardCard onClaimSuccess={fetchDashboardData} />
        </Animated.View>

        {/* Ecosystem Links */}
        <Animated.View style={{ opacity: fadeAnim3, transform: [{ translateY: translateY3 }] }}>
          <View style={styles.quickLinks}>
            <TouchableOpacity 
              style={styles.quickLinkCard}
              onPress={() => router.push('/leagues')}
              activeOpacity={0.82}
            >
              <View style={styles.quickLinkIconGold}>
                <Ionicons name="list" size={20} color="#fbbf24" />
              </View>
              <Text style={styles.quickLinkTitle}>All Leagues</Text>
              <Text style={styles.quickLinkCaption}>Browse competitions</Text>
              <Ionicons name="arrow-forward" size={15} color="#71717a" style={styles.quickLinkArrow} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickLinkCard}
              onPress={() => router.push('/tiers')}
              activeOpacity={0.82}
            >
              <View style={styles.quickLinkIconCyan}>
                <Ionicons name="trophy" size={20} color="#22d3ee" />
              </View>
              <Text style={styles.quickLinkTitle}>View Tiers</Text>
              <Text style={styles.quickLinkCaption}>Climb the ranks</Text>
              <Ionicons name="arrow-forward" size={15} color="#71717a" style={styles.quickLinkArrow} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Community Tournaments Card */}
        <Animated.View style={{ opacity: fadeAnim4, transform: [{ translateY: translateY4 }], marginTop: 24 }}>
          <View style={styles.communityCard}>
            <View style={styles.communityHeading}>
              <View style={styles.communityIcon}>
                <Ionicons name="people-outline" size={19} color="#34d399" />
              </View>
              <View style={styles.communityTitleBlock}>
                <Text style={styles.communityEyebrow}>PLAY YOUR WAY</Text>
                <Text style={styles.communityTitle}>Community Tournaments</Text>
              </View>
            </View>
            <Text style={styles.communityDescription}>
              Want to settle a debate? Host a private, unranked bracket for your friends. No tickets required.
            </Text>
            
            <TouchableOpacity 
              style={styles.createMatchButton}
              onPress={() => router.push('/create-tournament')}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={20} color="#22d3ee" />
              <Text style={styles.createMatchText}>Create Custom Match</Text>
              <Ionicons name="arrow-forward" size={17} color="#22d3ee" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* The Modal Component */}
      <HamburgerMenuModal isVisible={isMenuVisible} onClose={() => setMenuVisible(false)} />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  scrollContent: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 34, gap: 22, zIndex: 1 },
  quickLinks: { flexDirection: 'row', gap: 11 },
  quickLinkCard: {
    flex: 1,
    minHeight: 128,
    backgroundColor: '#14151b',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    borderRadius: 17,
    justifyContent: 'center',
  },
  quickLinkIconGold: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(245,158,11,0.11)', marginBottom: 11 },
  quickLinkIconCyan: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(34,211,238,0.10)', marginBottom: 11 },
  quickLinkTitle: { color: '#f4f4f5', fontSize: 14, fontWeight: '900', letterSpacing: 0.1 },
  quickLinkCaption: { color: '#71717a', fontSize: 10, fontWeight: '600', marginTop: 4 },
  quickLinkArrow: { position: 'absolute', right: 14, top: 15 },
  communityCard: { backgroundColor: '#14151b', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', borderRadius: 18, padding: 17 },
  communityHeading: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  communityIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(16,185,129,0.10)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)', alignItems: 'center', justifyContent: 'center' },
  communityTitleBlock: { flex: 1 },
  communityEyebrow: { color: '#34d399', fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginBottom: 3 },
  communityTitle: { color: '#f4f4f5', fontSize: 15, fontWeight: '900' },
  communityDescription: { color: '#a1a1aa', fontSize: 12, lineHeight: 19, marginTop: 12, marginBottom: 15 },
  createMatchButton: { backgroundColor: 'rgba(34,211,238,0.08)', borderWidth: 1, borderColor: 'rgba(34,211,238,0.22)', paddingHorizontal: 13, paddingVertical: 13, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  createMatchText: { color: '#e4e4e7', fontSize: 13, fontWeight: '800', flex: 1 },
});
