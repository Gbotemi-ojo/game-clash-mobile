import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { styles } from '../../styles/tournaments.styles';
import AdjournmentSystem from './AdjournmentSystem';

interface FixtureCardProps {
  targetFixture: any;
  myUserId: string | null;
  actionLoadingId: number | null;
  isPlayerA: boolean;
  amIReady: boolean;
  myScore: number;
  oppScore: number;
  oppTeam: string;
  diffMins: number;
  minsSinceStart: number;
  isWindowActive: boolean;
  proposedAdjournment: any;
  amIProposer: boolean;
  handleApiAction: (matchId: number, endpoint: string, body?: any, successMessage?: string) => void;
  handleProposeTime: (matchId: number, scheduledAt: string, adjournTime: string) => void;
}

export default function FixtureCard({
  targetFixture,
  myUserId,
  actionLoadingId,
  isPlayerA,
  amIReady,
  myScore,
  oppScore,
  oppTeam,
  diffMins,
  minsSinceStart,
  isWindowActive,
  proposedAdjournment,
  amIProposer,
  handleApiAction,
  handleProposeTime
}: FixtureCardProps) {
  const router = useRouter();
  const actionBtnScale = useRef(new Animated.Value(1)).current;

  const animatePressIn = () => Animated.spring(actionBtnScale, { toValue: 0.95, useNativeDriver: true }).start();
  const animatePressOut = () => Animated.spring(actionBtnScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();

  if (!targetFixture) {
    return (
      <Text style={styles.cardDesc}>No pending fixtures. Awaiting matchmaking for your next round.</Text>
    );
  }

  return (
    <View>
      <View style={styles.cardHeaderRow}>
        <Ionicons 
          name="football-outline" 
          size={20} 
          color={targetFixture.status === 'completed' ? '#10b981' : '#38bdf8'} 
        />
        <Text style={styles.cardTitle}>
          {targetFixture.status === 'completed' ? 'Latest Result' : 'Next Fixture'}
        </Text>
      </View>

      {targetFixture.status === 'completed' ? (
        <View style={styles.completedScoreContainer}>
          <View style={styles.teamCol}>
            <Text style={styles.teamNameText}>YOU</Text>
            <Text style={[styles.scoreBigText, { color: myScore > oppScore ? '#10b981' : (myScore < oppScore ? '#ef4444' : '#fff') }]}>
              {myScore}
            </Text>
          </View>
          <View style={styles.ftCol}>
            <Text style={styles.ftBadge}>FT</Text>
          </View>
          <View style={styles.teamCol}>
            <Text style={styles.teamNameText}>{oppTeam}</Text>
            <Text style={[styles.scoreBigText, { color: oppScore > myScore ? '#10b981' : (oppScore < myScore ? '#ef4444' : '#fff') }]}>
              {oppScore}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.versusContainer}>
          <Text style={styles.teamText}>YOU</Text>
          <Text style={styles.vsText}>VS</Text>
          <Text style={styles.teamText}>{oppTeam}</Text>
        </View>
      )}

      {targetFixture.status !== 'completed' && (
        <Text style={styles.deadlineText}>
          Scheduled: {new Date(targetFixture.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      )}

      <Animated.View style={{ transform: [{ scale: actionBtnScale }] }}>
        {targetFixture.status === 'completed' ? (
          <View style={styles.completedBadgeBox}>
            <Ionicons name="checkmark-done-circle" size={24} color="#10b981" />
            <Text style={styles.completedBadgeText}>Match officially verified & recorded.</Text>
          </View>
        ) : targetFixture.status === 'in_progress' ? (
          <>
            {targetFixture.dlsInviteCode && (
              <View style={styles.gameCodeBox}>
                <Text style={styles.gameCodeLabel}>GAME GENERATED - CODE:</Text>
                <Text style={styles.gameCodeVal}>{targetFixture.dlsInviteCode}</Text>
              </View>
            )}
            
            {minsSinceStart >= 15 ? (
              <TouchableOpacity
                style={styles.syncButton}
                activeOpacity={0.9}
                onPressIn={animatePressIn}
                onPressOut={animatePressOut}
                onPress={() => handleApiAction(targetFixture.id, 'force-fetch', undefined, "Result Synced!")}
                disabled={actionLoadingId === targetFixture.id}
              >
                {actionLoadingId === targetFixture.id ? <ActivityIndicator color="#000" /> : (
                  <>
                    <Ionicons name="sync-outline" size={18} color="#000" />
                    <Text style={styles.syncButtonText}>Sync Match Result</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.waitingBox}>
                <Text style={styles.waitingText}>Results verifiable after 15 mins of gameplay.</Text>
              </View>
            )}
          </>
        ) : targetFixture.status === 'pending' ? (
          <>
            {isWindowActive ? (
              !amIReady ? (
                <TouchableOpacity
                  style={[styles.syncButton, { backgroundColor: '#10b981' }]}
                  activeOpacity={0.9}
                  onPressIn={animatePressIn}
                  onPressOut={animatePressOut}
                  onPress={() => handleApiAction(targetFixture.id, 'ready')}
                  disabled={actionLoadingId === targetFixture.id}
                >
                  {actionLoadingId === targetFixture.id ? <ActivityIndicator color="#fff" /> : (
                    <Text style={[styles.syncButtonText, { color: '#fff' }]}>START MATCH</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={styles.waitingBox}>
                  <Text style={styles.waitingText}>Waiting for Opponent to start...</Text>
                </View>
              )
            ) : diffMins < 0 ? (
              <AdjournmentSystem 
                matchId={targetFixture.id}
                scheduledAt={targetFixture.scheduledAt}
                actionLoadingId={actionLoadingId}
                proposedAdjournment={proposedAdjournment}
                amIProposer={amIProposer}
                onProposeTime={handleProposeTime}
                onAcceptTime={(id) => handleApiAction(id, 'accept-time', undefined, "Time Accepted!")}
              />
            ) : (
              <View style={styles.waitingBox}>
                <Text style={styles.waitingText}>Match window has expired.</Text>
              </View>
            )}
          </>
        ) : null}

        {/* Dedicated Match Chat Integration */}
        {targetFixture.status !== 'completed' && (
          <TouchableOpacity
            style={[styles.syncButton, { marginTop: 12, backgroundColor: '#38bdf8' }]}
            activeOpacity={0.9}
            onPressIn={animatePressIn}
            onPressOut={animatePressOut}
            onPress={() => router.push(`/chat/${targetFixture.id}` as any)}
          >
            <Ionicons name="chatbubbles-outline" size={18} color="#000" />
            <Text style={styles.syncButtonText}>Open Match Room</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}
