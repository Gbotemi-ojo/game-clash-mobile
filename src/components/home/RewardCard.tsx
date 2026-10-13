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
  sectionTitle: { fontSize: 17, fontWeight: '900', color: '#f4f4f5', marginBottom: 11, letterSpacing: 0.2 },
  rewardCard: { backgroundColor: '#14151b', borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)' },
  rewardLeft: { gap: 6, flex: 1, marginRight: 12 },
  rewardTitle: { color: '#f4f4f5', fontSize: 15, fontWeight: '900' },
  watchAdRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  watchAdText: { color: '#a1a1aa', fontSize: 11, fontWeight: '600' },
  claimButton: { backgroundColor: '#22d3ee', minWidth: 86, alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 11, shadowColor: '#22d3ee', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  claimButtonText: { color: '#071115', fontWeight: '900', fontSize: 13, letterSpacing: 0.2 },
});
