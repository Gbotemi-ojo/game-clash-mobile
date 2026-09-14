import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import mobileAds, { useRewardedAd, TestIds } from 'react-native-google-mobile-ads';
import { authClient, BACKEND_URL } from '../../lib/auth-client';

// 1. Initialize the Google Mobile Ads SDK (Required before fetching any ads)
mobileAds().initialize();

interface RewardCardProps {
  onClaimSuccess: () => void;
}

// Use Google's Test ID for development to prevent account bans!
const adUnitId = __DEV__ ? TestIds.REWARDED : 'ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy';

export default function RewardCard({ onClaimSuccess }: RewardCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [isClaiming, setIsClaiming] = useState(false);

  // 2. Use the official hook to perfectly manage the ad lifecycle
  const { isLoaded, isClosed, isEarnedReward, load, show, error } = useRewardedAd(adUnitId, {
    requestNonPersonalizedAdsOnly: true,
  });

  // Load the ad as soon as the component mounts
  useEffect(() => {
    load();
  }, [load]);

  // Log any network errors if the ad fails to fetch
  useEffect(() => {
    if (error) {
      console.error('Failed to load Google Ad:', error);
    }
  }, [error]);

  // 3. Handle the payout when the user finishes and closes the video
  useEffect(() => {
    if (isClosed) {
      setIsClaiming(false);
      
      if (isEarnedReward) {
        grantTicketToUser();
      }
      
      // Immediately preload the next ad for the future
      load();
    }
  }, [isClosed, isEarnedReward, load]);

  const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.90, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }).start();

  const handleClaimPress = async () => {
    if (isLoaded) {
      setIsClaiming(true);
      show(); // Triggers the full-screen video ad
    } else {
      Alert.alert("Ad Loading", "Please wait a moment for the ad to buffer and try again.");
      load(); // Force a retry if it got stuck
    }
  };

  const grantTicketToUser = async () => {
    try {
      const { error } = await authClient.$fetch<any>(`${BACKEND_URL}/api/v1/users/me/claim-ad-reward`, {
        method: 'POST'
      });
      
      if (error) {
        throw new Error((error as any).error || (error as any).message || 'Failed to claim reward');
      }

      Alert.alert("Ticket Claimed!", "A free ticket has been added to your inventory.");
      onClaimSuccess(); 
    } catch (err: any) {
      Alert.alert("Claim Error", err.message);
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
            style={[styles.claimButton, !isLoaded && { backgroundColor: '#334155' }]}
            activeOpacity={0.8}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handleClaimPress}
            disabled={isClaiming || !isLoaded}
          >
            {isClaiming ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.claimButtonText}>Claim</Text>
            )}
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
