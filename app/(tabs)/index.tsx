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
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity 
              style={{ flex: 1, backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', padding: 16, borderRadius: 16, alignItems: 'center' }}
              onPress={() => router.push('/leagues')}
            >
              <Ionicons name="list" size={24} color="#f59e0b" style={{ marginBottom: 8 }} />
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>All Leagues</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={{ flex: 1, backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', padding: 16, borderRadius: 16, alignItems: 'center' }}
              onPress={() => router.push('/tiers')}
            >
              <Ionicons name="trophy" size={24} color="#38bdf8" style={{ marginBottom: 8 }} />
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>View Tiers</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Community Tournaments Card */}
        <Animated.View style={{ opacity: fadeAnim4, transform: [{ translateY: translateY4 }], marginTop: 24 }}>
          <View style={{ backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 16, padding: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Ionicons name="people-outline" size={20} color="#10b981" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Community Tournaments</Text>
            </View>
            <Text style={{ color: '#a1a1aa', fontSize: 14, lineHeight: 22, marginBottom: 16 }}>
              Want to settle a debate? Host a private, unranked bracket for your friends. No tickets required.
            </Text>
            
            <TouchableOpacity 
              style={{ backgroundColor: '#1f1f25', borderWidth: 1, borderColor: '#334155', paddingVertical: 14, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
              onPress={() => router.push('/create-tournament')}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: 'bold' }}>Create Custom Match</Text>
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
  container: { flex: 1, backgroundColor: '#0f0f13' },
  scrollContent: { padding: 20, gap: 24, zIndex: 1 }, 
});
