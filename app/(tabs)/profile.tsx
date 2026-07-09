// app/(tabs)/profile.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, Text, TouchableOpacity, ScrollView, TextInput, 
  Animated, Alert, ActivityIndicator, Modal, Image, 
  Dimensions, NativeSyntheticEvent, NativeScrollEvent 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { authClient, BACKEND_URL } from '../../src/lib/auth-client';
import { styles } from '../../src/styles/profile.styles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ProfileScreen() {
  const router = useRouter();
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  const [dlsInput, setDlsInput] = useState('');
  const [teamNameInput, setTeamNameInput] = useState('');
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isGuideVisible, setIsGuideVisible] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  // Increased to 6 to account for the new Wallet & Payout card
  const fadeAnims = useRef([...Array(6)].map(() => new Animated.Value(0))).current;
  const slideAnims = useRef([...Array(6)].map(() => new Animated.Value(30))).current;
  const verifyBtnScale = useRef(new Animated.Value(1)).current;
  const updateBtnScale = useRef(new Animated.Value(1)).current;

  const fetchProfileData = async () => {
    try {
      const { data, error } = await authClient.$fetch<any>(`${BACKEND_URL}/api/v1/users/me`);
      if (!error && data) {
        setUserProfile(data);
        if (data.profile?.teamName) {
          setTeamNameInput(data.profile.teamName);
        }
      }
    } catch (err) {
      console.log("Failed to fetch profile:", err);
    } finally {
      setIsInitialLoading(false);
      triggerEntranceAnimation();
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isInitialLoading) {
        const silentRefresh = async () => {
          try {
            const { data, error } = await authClient.$fetch<any>(`${BACKEND_URL}/api/v1/users/me`);
            if (!error && data) {
              setUserProfile(data);
            }
          } catch (e) {}
        };
        silentRefresh();
      }
    }, [isInitialLoading])
  );

  const triggerEntranceAnimation = () => {
    const animations = fadeAnims.map((fadeAnim, index) => {
      return Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(slideAnims[index], { toValue: 0, friction: 8, tension: 40, useNativeDriver: true })
      ]);
    });
    Animated.stagger(120, animations).start();
  };

  const animatePressIn = (anim: Animated.Value) => Animated.spring(anim, { toValue: 0.95, useNativeDriver: true }).start();
  const animatePressOut = (anim: Animated.Value) => Animated.spring(anim, { toValue: 1, friction: 4, useNativeDriver: true }).start();

  const handleVerifyId = async () => {
    if (dlsInput.length !== 8) {
      Alert.alert("Invalid ID", "Your Game ID must be exactly 8 characters.");
      return;
    }
    setIsVerifying(true);
    try {
      const { error } = await authClient.$fetch<any>(`${BACKEND_URL}/api/v1/users/me/verify-dls`, {
        method: 'POST',
        body: { dlsPlayerId: dlsInput }
      });

      if (error) {
        const backendMessage = (error as any).error || error.message || 'Verification failed';
        throw new Error(backendMessage);
      }
      
      Alert.alert("Success!", "Game ID linked and stats imported successfully.");
      fetchProfileData(); 
    } catch (err: any) {
      Alert.alert("Verification Failed", err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleUpdateTeamName = async () => {
    if (teamNameInput.trim().length < 3) {
      Alert.alert("Invalid Name", "Team Name must be at least 3 characters.");
      return;
    }
    setIsUpdatingName(true);
    try {
      const { error } = await authClient.$fetch<any>(`${BACKEND_URL}/api/v1/users/me/profile`, {
        method: 'PATCH',
        body: { teamName: teamNameInput.trim() }
      });

      if (error) {
        const backendMessage = (error as any).error || error.message || 'Update failed';
        throw new Error(backendMessage);
      }
      
      Alert.alert("Team Name Updated", "Your Team Name has been successfully changed.");
      fetchProfileData();
    } catch (err: any) {
      Alert.alert("Update Failed", err.message);
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveSlide(slide);
  };

  const guideSteps = [
    { image: require('../../assets/images/dls1.jpg'), text: "1. From the home screen, tap the Settings (gear) icon in the top left corner." },
    { image: require('../../assets/images/dls2.jpg'), text: "2. Navigate to Advanced Settings and tap 'System Info'." },
    { image: require('../../assets/images/dls3.jpg'), text: "3. Your Game ID is the unique 8-character code shown. Enter it exactly." }
  ];

  if (isInitialLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </SafeAreaView>
    );
  }

  const profileData = userProfile?.profile || {};
  const badges = userProfile?.badges || [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* HEADER */}
        <Animated.View style={[styles.headerSection, { opacity: fadeAnims[0], transform: [{ translateY: slideAnims[0] }] }]}>
          <View style={styles.headerTop}>
            <Text style={styles.pageTitle}>PLAYER PROFILE</Text>
            <View style={styles.ticketPill}>
              <FontAwesome5 name="ticket-alt" size={14} color="#f59e0b" />
              <Text style={styles.ticketText}>{userProfile?.wallet?.tickets ?? 0}</Text>
            </View>
          </View>
          <View style={styles.userInfoRow}>
            <View style={styles.avatarCircle}>
              <FontAwesome5 name="user-astronaut" size={32} color="#22d3ee" />
            </View>
            <View style={styles.userInfoText}>
              <Text style={styles.userName}>{profileData.teamName || userProfile?.name || 'Contender'}</Text>
              <Text style={styles.userEmail}>{userProfile?.email || ''}</Text>
            </View>
          </View>
        </Animated.View>

        {/* WALLET & PAYOUTS CARD (NEW) */}
        <Animated.View style={[styles.card, { opacity: fadeAnims[5], transform: [{ translateY: slideAnims[5] }] }]}>
          <TouchableOpacity 
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            onPress={() => router.push('/withdrawal')}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(59, 130, 246, 0.1)', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="wallet" size={20} color="#3b82f6" />
              </View>
              <View>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Wallet & Payouts</Text>
                <Text style={{ color: '#a1a1aa', fontSize: 13, marginTop: 2 }}>Withdraw your tournament winnings</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#71717a" />
          </TouchableOpacity>
        </Animated.View>

        {/* VERIFICATION CARD */}
        <Animated.View style={[styles.card, { opacity: fadeAnims[1], transform: [{ translateY: slideAnims[1] }] }]}>
          {!profileData.dlsPlayerId ? (
            <>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#a1a1aa" />
                <Text style={styles.cardTitle}>Account Verification</Text>
              </View>
              <Text style={styles.cardDesc}>Link your unique 8-character game ID to import your stats.</Text>
              
              <TextInput 
                style={styles.input}
                placeholder="ENTER 8-CHAR ID"
                placeholderTextColor="#666"
                maxLength={8}
                autoCapitalize="characters"
                value={dlsInput}
                onChangeText={setDlsInput}
                editable={!isVerifying}
              />
              
              <Animated.View style={{ transform: [{ scale: verifyBtnScale }] }}>
                <TouchableOpacity 
                  style={[styles.primaryButton, { backgroundColor: '#f59e0b' }]}
                  activeOpacity={0.9}
                  onPressIn={() => animatePressIn(verifyBtnScale)}
                  onPressOut={() => animatePressOut(verifyBtnScale)}
                  onPress={handleVerifyId}
                  disabled={isVerifying}
                >
                  {isVerifying ? <ActivityIndicator color="#000" /> : <Text style={styles.primaryButtonText}>Verify Account</Text>}
                </TouchableOpacity>
              </Animated.View>

              <TouchableOpacity style={styles.helpLink} onPress={() => setIsGuideVisible(true)}>
                <Ionicons name="help-circle-outline" size={16} color="#38bdf8" />
                <Text style={styles.helpText}>How to find my Game ID?</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                <Text style={[styles.cardTitle, { color: '#10b981' }]}>Account Verified</Text>
              </View>
              <View style={styles.verifiedBox}>
                <Text style={styles.teamName}>{profileData.teamName || profileData.dlsPlayerId}</Text>
                <Text style={styles.verifiedSub}>Your account is successfully linked to the arena.</Text>
              </View>
            </>
          )}
        </Animated.View>

        {/* CAREER STATISTICS CARD */}
        {profileData.dlsPlayerId && (
          <Animated.View style={[styles.card, { opacity: fadeAnims[2], transform: [{ translateY: slideAnims[2] }] }]}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="stats-chart" size={20} color="#38bdf8" />
              <Text style={styles.cardTitle}>Career Statistics</Text>
            </View>
            <View style={styles.statsGrid}>
              <View style={styles.statSquare}>
                <Text style={styles.statLabel}>PLAYED</Text>
                <Text style={[styles.statValue, { color: '#fff' }]}>{profileData.matchesPlayed || 0}</Text>
              </View>
              <View style={styles.statSquare}>
                <Text style={styles.statLabel}>WON</Text>
                <Text style={[styles.statValue, { color: '#10b981' }]}>{profileData.matchesWon || 0}</Text>
              </View>
              <View style={styles.statSquare}>
                <Text style={styles.statLabel}>LOST</Text>
                <Text style={[styles.statValue, { color: '#ef4444' }]}>{profileData.matchesLost || 0}</Text>
              </View>
              <View style={styles.statSquare}>
                <Text style={styles.statLabel}>WIN %</Text>
                <Text style={[styles.statValue, { color: '#f59e0b' }]}>{profileData.winPercent || '0%'}</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* TEAM NAME CUSTOMIZATION */}
        {profileData.dlsPlayerId && (
          <Animated.View style={[styles.card, { opacity: fadeAnims[3], transform: [{ translateY: slideAnims[3] }] }]}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="id-card-outline" size={20} color="#a1a1aa" />
              <Text style={styles.cardTitle}>Customize Identity</Text>
            </View>
            <Text style={styles.cardDesc}>Update your Team Name seen on leaderboards and brackets.</Text>
            
            <TextInput 
              style={styles.input}
              placeholder="Team Name"
              placeholderTextColor="#666"
              value={teamNameInput}
              onChangeText={setTeamNameInput}
              editable={!isUpdatingName}
            />

            <Animated.View style={{ transform: [{ scale: updateBtnScale }] }}>
              <TouchableOpacity 
                style={[styles.primaryButton, { backgroundColor: '#3b82f6' }]}
                activeOpacity={0.9}
                onPressIn={() => animatePressIn(updateBtnScale)}
                onPressOut={() => animatePressOut(updateBtnScale)}
                onPress={handleUpdateTeamName}
                disabled={isUpdatingName}
              >
                {isUpdatingName ? <ActivityIndicator color="#fff" /> : <Text style={[styles.primaryButtonText, { color: '#fff' }]}>Update Name</Text>}
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        )}

        {/* TROPHY CABINET */}
        <Animated.View style={[styles.card, { opacity: fadeAnims[4], transform: [{ translateY: slideAnims[4] }] }]}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="trophy-outline" size={20} color="#f59e0b" />
            <Text style={styles.cardTitle}>Trophy Cabinet</Text>
          </View>
          
          {badges.length === 0 ? (
            <Text style={[styles.cardDesc, { marginTop: 10 }]}>No badges earned yet. Compete in tournaments to build your legacy.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgeScroll}>
              {badges.map((b: any, index: number) => (
                <View key={index} style={styles.badgeBox}>
                  <Ionicons name="medal" size={28} color="#eab308" />
                  <Text style={styles.badgeName}>{b.badgeType.replace('_', ' ')}</Text>
                  <Text style={styles.badgeCount}>x{b.count}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* INSTRUCTION MODAL */}
      <Modal visible={isGuideVisible} transparent animationType="fade" onRequestClose={() => setIsGuideVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Finding Your ID</Text>
            <TouchableOpacity onPress={() => setIsGuideVisible(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {guideSteps.map((step, index) => (
              <View key={index} style={styles.slideContainer}>
                <Image source={step.image} style={styles.slideImage} />
                <Text style={styles.slideText}>{step.text}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.paginationRow}>
            {guideSteps.map((_, index) => (
              <View key={index} style={[styles.dot, activeSlide === index && styles.activeDot]} />
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
