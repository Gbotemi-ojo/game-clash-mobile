import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  Animated, 
  Alert, 
  ActivityIndicator, 
  Modal, 
  Image, 
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router'; // ✅ Imported useFocusEffect
import { authClient, BACKEND_URL } from '../../src/lib/auth-client';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ProfileScreen() {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  const [dlsInput, setDlsInput] = useState('');
  const [gamerTagInput, setGamerTagInput] = useState('');
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [isUpdatingTag, setIsUpdatingTag] = useState(false);
  
  const [isGuideVisible, setIsGuideVisible] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  const fadeAnims = useRef([...Array(4)].map(() => new Animated.Value(0))).current;
  const slideAnims = useRef([...Array(4)].map(() => new Animated.Value(30))).current;
  
  const verifyBtnScale = useRef(new Animated.Value(1)).current;
  const updateBtnScale = useRef(new Animated.Value(1)).current;

  // 1. Initial Load (runs ONCE when app opens)
  const fetchProfileData = async () => {
    try {
      const { data, error } = await authClient.$fetch<any>(`${BACKEND_URL}/api/v1/users/me`);
      if (!error && data) {
        setUserProfile(data);
        if (data.profile?.gamerTag) {
          setGamerTagInput(data.profile.gamerTag);
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

  // ✅ 2. Focus Refresh (runs silently EVERY TIME you tap the Profile tab)
  useFocusEffect(
    useCallback(() => {
      if (!isInitialLoading) {
        const silentRefresh = async () => {
          try {
            const { data, error } = await authClient.$fetch<any>(`${BACKEND_URL}/api/v1/users/me`);
            if (!error && data) {
              setUserProfile(data); // Instantly updates the ticket count UI!
            }
          } catch (e) {
            // Ignore background errors
          }
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
      Alert.alert("Invalid ID", "Your Dream League Soccer ID must be exactly 8 characters.");
      return;
    }

    setIsVerifying(true);
    try {
      const { data, error } = await authClient.$fetch<any>(`${BACKEND_URL}/api/v1/users/me/verify-dls`, {
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

  const handleUpdateTag = async () => {
    if (gamerTagInput.trim().length < 3) {
      Alert.alert("Invalid Tag", "Gamer Tag must be at least 3 characters.");
      return;
    }

    setIsUpdatingTag(true);
    try {
      const { data, error } = await authClient.$fetch<any>(`${BACKEND_URL}/api/v1/users/me/profile`, {
        method: 'PATCH',
        body: { gamerTag: gamerTagInput.trim() }
      });

      if (error) {
        const backendMessage = (error as any).error || error.message || 'Update failed';
        throw new Error(backendMessage);
      }

      Alert.alert("Tag Updated", "Your Gamer Tag has been successfully changed.");
      fetchProfileData();
    } catch (err: any) {
      Alert.alert("Update Failed", err.message);
    } finally {
      setIsUpdatingTag(false);
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveSlide(slide);
  };

  const guideSteps = [
    { image: require('../../assets/images/dls1.jpg'), text: "1. From the DLS home screen, tap the Settings (gear) icon in the top left corner." },
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
              <Text style={styles.userName}>{userProfile?.name || 'Contender'}</Text>
              <Text style={styles.userEmail}>{userProfile?.email || ''}</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View style={[styles.card, { opacity: fadeAnims[1], transform: [{ translateY: slideAnims[1] }] }]}>
          {!profileData.dlsPlayerId ? (
            <>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#a1a1aa" />
                <Text style={styles.cardTitle}>Account Verification</Text>
              </View>
              <Text style={styles.cardDesc}>Link your unique 8-character game ID to unlock tournament entry.</Text>
              
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
                <Text style={styles.verifiedSub}>Your account is linked and ready for matchmaking.</Text>
              </View>
            </>
          )}
        </Animated.View>

        <Animated.View style={[styles.card, { opacity: fadeAnims[2], transform: [{ translateY: slideAnims[2] }] }]}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="id-card-outline" size={20} color="#a1a1aa" />
            <Text style={styles.cardTitle}>Customize Identity</Text>
          </View>
          <Text style={styles.cardDesc}>Update your public Gamer Tag seen on leaderboards.</Text>
          
          <TextInput 
            style={styles.input}
            placeholder="Gamer Tag"
            placeholderTextColor="#666"
            value={gamerTagInput}
            onChangeText={setGamerTagInput}
            editable={!isUpdatingTag}
          />

          <Animated.View style={{ transform: [{ scale: updateBtnScale }] }}>
            <TouchableOpacity 
              style={[styles.primaryButton, { backgroundColor: '#3b82f6' }]}
              activeOpacity={0.9}
              onPressIn={() => animatePressIn(updateBtnScale)}
              onPressOut={() => animatePressOut(updateBtnScale)}
              onPress={handleUpdateTag}
              disabled={isUpdatingTag}
            >
              {isUpdatingTag ? <ActivityIndicator color="#fff" /> : <Text style={[styles.primaryButtonText, { color: '#fff' }]}>Update Tag</Text>}
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>

        <Animated.View style={[styles.card, { opacity: fadeAnims[3], transform: [{ translateY: slideAnims[3] }] }]}>
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

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: '#0f0f13', justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#0f0f13' },
  scrollContent: { padding: 20, gap: 20 },
  
  headerSection: { marginBottom: 8 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  pageTitle: { color: '#93c5fd', fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  ticketPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#272730', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 6 },
  ticketText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  
  userInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#18181b', borderWidth: 2, borderColor: '#22d3ee', justifyContent: 'center', alignItems: 'center' },
  userInfoText: { flex: 1 },
  userName: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 2 },
  userEmail: { color: '#a1a1aa', fontSize: 14 },

  card: { backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 16, padding: 20 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  cardDesc: { color: '#a1a1aa', fontSize: 14, lineHeight: 20, marginBottom: 16 },
  
  input: { backgroundColor: '#1f1f25', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 16, color: '#fff', fontSize: 16, marginBottom: 16, textAlign: 'center', letterSpacing: 2, fontWeight: '600' },
  primaryButton: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
  helpLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, paddingVertical: 8 },
  helpText: { color: '#38bdf8', fontSize: 13, fontWeight: '600' },
  
  verifiedBox: { backgroundColor: '#111827', padding: 20, borderRadius: 12, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: '#1f2937' },
  teamName: { color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 4 },
  verifiedSub: { color: '#10b981', fontSize: 13, fontWeight: '500' },

  badgeScroll: { paddingTop: 10, gap: 12 },
  badgeBox: { backgroundColor: '#222225', padding: 16, borderRadius: 12, alignItems: 'center', width: 110, borderWidth: 1, borderColor: '#333' },
  badgeName: { color: '#fff', fontSize: 11, fontWeight: 'bold', marginTop: 8, textAlign: 'center' },
  badgeCount: { color: '#f59e0b', fontSize: 12, fontWeight: '900', marginTop: 4 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', paddingTop: 50 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  closeBtn: { padding: 4 },
  slideContainer: { width: SCREEN_WIDTH, alignItems: 'center', paddingHorizontal: 20 },
  slideImage: { width: '100%', height: '65%', borderRadius: 12, marginBottom: 24 },
  slideText: { color: '#d4d4d8', fontSize: 15, lineHeight: 24, textAlign: 'center', paddingHorizontal: 10 },
  paginationRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingBottom: 40 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#52525b' },
  activeDot: { width: 20, backgroundColor: '#f59e0b' }
});
