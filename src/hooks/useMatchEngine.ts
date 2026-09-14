import { useState } from 'react';
import { Alert } from 'react-native';
import { authClient, BACKEND_URL } from '../lib/auth-client';

interface UseMatchEngineProps {
  fixtures: any[];
  myUserId: string | null;
  currentTime: number;
  onRefreshData: () => void;
}

export function useMatchEngine({ fixtures, myUserId, currentTime, onRefreshData }: UseMatchEngineProps) {
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const handleApiAction = async (matchId: number, endpoint: string, body?: any, successMessage?: string) => {
    setActionLoadingId(matchId);
    try {
      const { error } = await authClient.$fetch<any>(`${BACKEND_URL}/api/v1/matches/${matchId}/${endpoint}`, {
        method: 'POST',
        body
      });

      if (error) {
        throw new Error((error as any).error || error.message || 'Action failed');
      }

      if (successMessage) {
        Alert.alert("Success", successMessage);
      }

      onRefreshData();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleProposeTime = (matchId: number, scheduledAt: string, adjournTime: string) => {
    const newDate = new Date(scheduledAt);
    const [hours, minutes] = adjournTime.split(':');
    newDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    handleApiAction(matchId, 'propose-time', { newTime: newDate.toISOString() }, "Adjournment proposed!");
  };

  const activeFixture = fixtures.find(f => f.status === 'pending' || f.status === 'in_progress');
  const lastCompleted = [...fixtures].reverse().find(f => f.status === 'completed');
  const targetFixture = activeFixture || lastCompleted;

  let isPlayerA = false;
  let amIReady = false;
  let isWindowActive = false;
  let diffMins = 0;
  let minsSinceStart = 0;
  let proposedAdjournment = null;
  let amIProposer = false;
  let myScore = 0;
  let oppScore = 0;
  let oppTeam = 'TBD';

  if (targetFixture && myUserId) {
    isPlayerA = targetFixture.playerAId === myUserId;
    amIReady = isPlayerA ? targetFixture.playerAReady : targetFixture.playerBReady;

    myScore = isPlayerA ? (targetFixture.playerAScore || 0) : (targetFixture.playerBScore || 0);
    oppScore = isPlayerA ? (targetFixture.playerBScore || 0) : (targetFixture.playerAScore || 0);
    oppTeam = isPlayerA ? (targetFixture.playerBTeam || 'TBD') : (targetFixture.playerATeam || 'TBD');

    const matchTime = new Date(targetFixture.scheduledAt).getTime();
    diffMins = (currentTime - matchTime) / 60000;
    
    if (targetFixture.startedAt) {
      minsSinceStart = (currentTime - new Date(targetFixture.startedAt).getTime()) / 60000;
    }

    isWindowActive = diffMins >= 0 && diffMins <= 30 && targetFixture.status === 'pending';
    proposedAdjournment = targetFixture.detailedStats?.proposedAdjournment;
    amIProposer = proposedAdjournment?.byUserId === myUserId;
  }

  return {
    actionLoadingId,
    targetFixture,
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
  };
}
