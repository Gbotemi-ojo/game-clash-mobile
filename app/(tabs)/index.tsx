import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ArenaHeader from '../../src/components/home/ArenaHeader';
import RegistrationCard from '../../src/components/home/RegistrationCard';
import RewardCard from '../../src/components/home/RewardCard';
import HamburgerMenuModal from '../../src/components/home/HamburgerMenuModal';
import { authClient, BACKEND_URL } from '../../src/lib/auth-client'; 

export default function DlsHubHomeScreen() {
  const [isMenuVisible, setMenuVisible] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeLeague, setActiveLeague] = useState<any>(null);

  const fadeAnim1 = useRef(new Animated.Value(0)).current;
  const translateY1 = useRef(new Animated.Value(30)).current;
  const fadeAnim2 = useRef(new Animated.Value(0)).current;
  const translateY2 = useRef(new Animated.Value(30)).current;

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
      ])
    ]).start();
  }, []);

  const handleRequireScroll = (y: number) => {
    scrollViewRef.current?.scrollTo({ y: registrationCardYRef.current + y, animated: true });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      
      {/* ✅ Wrapper to guarantee the header sits completely above the scroll view */}
      <View style={{ zIndex: 10, elevation: 10 }}>
        <ArenaHeader 
          onOpenMenu={() => {
            console.log("🍔 Hamburger Menu Clicked!");
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

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ✅ The Modal Component */}
      <HamburgerMenuModal isVisible={isMenuVisible} onClose={() => setMenuVisible(false)} />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f13' },
  scrollContent: { padding: 20, gap: 24, zIndex: 1 }, 
});
