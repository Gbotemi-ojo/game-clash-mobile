import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// ✅ ADDED: AdEventType is now imported here!
import { RewardedAd, RewardedAdEventType, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import { authClient, BACKEND_URL } from '../../lib/auth-client'; 

interface RewardCardProps {
  onClaimSuccess: () => void;
}

// Use Google's Test ID for development to prevent account bans!
const adUnitId = __DEV__ ? TestIds.REWARDED : 'ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy';

const rewarded = RewardedAd.createForAdRequest(adUnitId, {
  requestNonPersonalizedAdsOnly: true,
});

export default function RewardCard({ onClaimSuccess }: RewardCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const [isAdLoaded, setIsAdLoaded] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    const unsubscribeLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      setIsAdLoaded(true);
    });

    const unsubscribeEarned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      async reward => {
        // The user finished the ad! Now we safely call your backend.
        await grantTicketToUser();
      },
    );

    // ✅ FIXED: Changed to AdEventType.CLOSED
    const unsubscribeClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
      setIsClaiming(false);
      // Preload the next ad so they don't have to wait if they click claim again later
      rewarded.load();
    });

    rewarded.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeEarned();
      unsubscribeClosed();
    };
  }, []);

  const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.90, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }).start();

  const handleClaimPress = async () => {
    setIsClaiming(true);
    if (isAdLoaded) {
      rewarded.show();
    } else {
      Alert.alert("Ad Loading", "Please wait a moment for the ad to load and try again.");
      setIsClaiming(false);
    }
  };

  const grantTicketToUser = async () => {
    try {
      const { data, error } = await authClient.$fetch<any>(`${BACKEND_URL}/api/v1/users/me/claim-ad-reward`, {
        method: 'POST'
      });
      
      if (error) {
        const backendMessage = (error as any).error || error.message || 'Failed to claim reward';
        throw new Error(backendMessage);
      }

      Alert.alert("Ticket Claimed!", "A free ticket has been added to your inventory.");
      onClaimSuccess(); 
    } catch (error: any) {
      Alert.alert("Claim Error", error.message);
    }
  };

  return (
    <View>
      <Text style={styles.sectionTitle}>Daily Rewards</Text>
      <View style={styles.rewardCard}>
        <View style={styles.rewardLeft}>
          <Text style={styles.rewardTitle}>Claim Free Ticket</Text>
          <View style={styles.watchAdRow}>
            <Ionicons name="play-circle-outline" size={16} color="#ccc" />
            <Text style={styles.watchAdText}>Watch Ad to Claim</Text>
          </View>
        </View>

        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity 
            style={[styles.claimButton, !isAdLoaded && { backgroundColor: '#334155' }]}
            activeOpacity={0.8}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handleClaimPress}
            disabled={isClaiming || !isAdLoaded}
          >
            {isClaiming ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.claimButtonText}>Claim</Text>}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 12 },
  rewardCard: { backgroundColor: '#18181b', borderRadius: 16, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#27272a' },
  rewardLeft: { gap: 4 },
  rewardTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  watchAdRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  watchAdText: { color: '#a1a1aa', fontSize: 13 },
  claimButton: { backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  claimButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
