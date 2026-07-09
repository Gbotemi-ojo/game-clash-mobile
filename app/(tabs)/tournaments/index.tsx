import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Animated, 
  ActivityIndicator, 
  RefreshControl,
  Alert,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

// ✅ Logic & Context Imports
import { useSocket } from '../../../src/context/SocketContext';
import { authClient, BACKEND_URL } from '../../../src/lib/auth-client';

// ✅ Style Import
import { styles } from '../../../src/styles/tournaments.styles';

const HOURS_LIST = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES_LIST = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0')); 

export default function TournamentsScreen() {
  const router = useRouter();

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  
  const [adjournTime, setAdjournTime] = useState('12:00');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [modalHour, setModalHour] = useState('12');
  const [modalMinute, setModalMinute] = useState('00');
  
  const [currentTime, setCurrentTime] = useState(Date.now());
  const isFirstLoad = useRef(true);
  const serverTimeOffsetRef = useRef(0);

  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [leagueData, setLeagueData] = useState<any>(null);
  const [fixtures, setFixtures] = useState<any[]>([]);

  const fadeAnims = useRef([...Array(3)].map(() => new Animated.Value(0))).current;
  const slideAnims = useRef([...Array(3)].map(() => new Animated.Value(30))).current;
  const actionBtnScale = useRef(new Animated.Value(1)).current;

  const { socket } = useSocket();

  const triggerEntranceAnimation = useCallback(() => {
    const animations = fadeAnims.map((fadeAnim, index) => {
      return Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(slideAnims[index], { toValue: 0, friction: 8, tension: 40, useNativeDriver: true })
      ]);
    });
    Animated.stagger(120, animations).start();
  }, []);

  const fetchDashboardData = useCallback(async (silent = false) => {
    try {
      const [meRes, leagueRes] = await Promise.all([
        authClient.$fetch<any>(`${BACKEND_URL}/api/v1/users/me`),
        authClient.$fetch<any>(`${BACKEND_URL}/api/v1/leagues/my-active`)
      ]);

      if (meRes.data) {
        setMyUserId(meRes.data.id);
        if (meRes.data.serverTime) {
          serverTimeOffsetRef.current = meRes.data.serverTime - Date.now();
          setCurrentTime(Date.now() + serverTimeOffsetRef.current);
        }
      }
      
      if (leagueRes.data && leagueRes.data.id) {
        const activeLeague = leagueRes.data;
        const leagueId = activeLeague.id;
        
        const [ladderRes, fixturesRes] = await Promise.all([
          authClient.$fetch<any>(`${BACKEND_URL}/api/v1/leagues/${leagueId}/ladder`),
          authClient.$fetch<any>(`${BACKEND_URL}/api/v1/leagues/${leagueId}/fixtures`)
        ]);

        setLeagueData({
          league: activeLeague,
          ladder: ladderRes.data && Array.isArray(ladderRes.data) ? ladderRes.data : []
        });

        if (fixturesRes.data && Array.isArray(fixturesRes.data)) {
          setFixtures(fixturesRes.data);
        } else {
          setFixtures([]);
        }
      } else {
        setLeagueData(null);
        setFixtures([]);
      }
    } catch (error) {
      console.log("Error fetching tournaments data", error);
    } finally {
      setIsInitialLoading(false);
      setIsRefreshing(false);
      if (isFirstLoad.current && !silent) {
        triggerEntranceAnimation();
        isFirstLoad.current = false;
      }
    }
  }, [triggerEntranceAnimation]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now() + serverTimeOffsetRef.current);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardDataRef = useRef(fetchDashboardData);
  useEffect(() => {
    fetchDashboardDataRef.current = fetchDashboardData;
  });

  useEffect(() => {
    if (!socket) return;
    const handleAppUpdate = (data: any) => {
      fetchDashboardDataRef.current(true); 
    };
    socket.on('app_update', handleAppUpdate);
    return () => {
      socket.off('app_update', handleAppUpdate);
    };
  }, [socket]);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [fetchDashboardData])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchDashboardData();
  };

  const animatePressIn = () => Animated.spring(actionBtnScale, { toValue: 0.95, useNativeDriver: true }).start();
  const animatePressOut = () => Animated.spring(actionBtnScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();

  const handleApiAction = async (matchId: number, endpoint: string, body?: any, successMessage?: string) => {
    setActionLoadingId(matchId);
    try {
      const { error } = await authClient.$fetch<any>(`${BACKEND_URL}/api/v1/matches/${matchId}/${endpoint}`, {
        method: 'POST',
        body
      });
      if (error) throw new Error((error as any).error || error.message || 'Action failed');
      if (successMessage) Alert.alert("Success", successMessage);
      fetchDashboardData(); 
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleProposeTime = (matchId: number, scheduledAt: string) => {
    const newDate = new Date(scheduledAt);
    const [hours, minutes] = adjournTime.split(':');
    newDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    handleApiAction(matchId, 'propose-time', { newTime: newDate.toISOString() }, "Adjournment proposed!");
  };

  const openTimePicker = () => {
    const [h, m] = adjournTime.split(':');
    setModalHour(h);
    setModalMinute(m);
    setShowTimePicker(true);
  };

  const confirmTimeSelection = () => {
    setAdjournTime(`${modalHour}:${modalMinute}`);
    setShowTimePicker(false);
  };

  if (isInitialLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </SafeAreaView>
    );
  }

  const activeFixture = fixtures.find(f => f.status === 'pending' || f.status === 'in_progress');
  const lastCompleted = [...fixtures].reverse().find(f => f.status === 'completed');
  const targetFixture = activeFixture || lastCompleted;

  const leagueStatus = leagueData?.league?.status;
  const kickOffDate = leagueData?.league?.startDate || leagueData?.league?.registrationEndsAt;

  let isPlayerA, amIReady, isWindowActive, diffMins, minsSinceStart, proposedAdjournment, amIProposer;
  let myScore = 0, oppScore = 0, oppTeam = 'TBD';

  if (targetFixture && myUserId) {
    isPlayerA = targetFixture.playerAId === myUserId;
    amIReady = isPlayerA ? targetFixture.playerAReady : targetFixture.playerBReady;
    
    myScore = isPlayerA ? (targetFixture.playerAScore || 0) : (targetFixture.playerBScore || 0);
    oppScore = isPlayerA ? (targetFixture.playerBScore || 0) : (targetFixture.playerAScore || 0);
    oppTeam = isPlayerA ? (targetFixture.playerBTeam || 'TBD') : (targetFixture.playerATeam || 'TBD');

    const matchTime = new Date(targetFixture.scheduledAt).getTime();
    diffMins = (currentTime - matchTime) / 60000;
    minsSinceStart = targetFixture.startedAt ? (currentTime - new Date(targetFixture.startedAt).getTime()) / 60000 : 0;
    
    isWindowActive = diffMins >= 0 && diffMins <= 30 && targetFixture.status === 'pending';
    proposedAdjournment = targetFixture.detailedStats?.proposedAdjournment;
    amIProposer = proposedAdjournment?.byUserId === myUserId;
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#f59e0b" />}
      >
        
        <Animated.View style={[styles.headerSection, { opacity: fadeAnims[0], transform: [{ translateY: slideAnims[0] }] }]}>
          <Text style={styles.pageTitle}>ACTIVE TOURNAMENTS</Text>
          {leagueData?.league && (
            <View style={styles.leagueNameRow}>
              <Ionicons name="trophy" size={16} color="#f59e0b" />
              <Text style={styles.leagueName}>{leagueData.league.name}</Text>
            </View>
          )}
        </Animated.View>

        {!leagueData?.league && (
          <Animated.View style={[styles.blankStateCard, { opacity: fadeAnims[1], transform: [{ translateY: slideAnims[1] }] }]}>
            <Ionicons name="calendar-outline" size={48} color="#3f3f46" style={{ marginBottom: 16 }} />
            <Text style={styles.cardTitle}>No Active League</Text>
            <Text style={styles.cardDesc}>You are not currently enrolled in an active tournament. Head to the Home tab to configure your availability and register for the upcoming season.</Text>
          </Animated.View>
        )}

        {leagueStatus === 'pre_registration' && (
          <Animated.View style={[styles.preSeasonCard, { opacity: fadeAnims[1], transform: [{ translateY: slideAnims[1] }] }]}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="time-outline" size={20} color="#f59e0b" />
              <Text style={styles.cardTitle}>Pre-Registration Phase</Text>
            </View>
            <Text style={styles.startDateText}>
              Starts on {kickOffDate ? new Date(kickOffDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'TBD'}
            </Text>
            <Text style={styles.cardDesc}>Your league assignment is confirmed. Matchmaking will begin automatically when the season starts. Prepare your squad!</Text>
          </Animated.View>
        )}

        {(leagueStatus === 'active' || leagueStatus === 'completed') && (
          <Animated.View style={[styles.card, { opacity: fadeAnims[1], transform: [{ translateY: slideAnims[1] }] }]}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="football-outline" size={20} color={targetFixture?.status === 'completed' ? '#10b981' : '#38bdf8'} />
              <Text style={styles.cardTitle}>{targetFixture?.status === 'completed' ? 'Latest Result' : 'Next Fixture'}</Text>
            </View>

            {targetFixture ? (
              <>
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

                      {minsSinceStart! >= 15 ? (
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
                              <Text style={[styles.syncButtonText, { color: '#fff' }]}>▶ START MATCH</Text>
                            )}
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.waitingBox}>
                            <Text style={styles.waitingText}>⌛ Waiting for Opponent to start...</Text>
                          </View>
                        )
                      ) : diffMins! < 0 ? (
                        <View style={styles.adjournContainer}>
                          <Text style={styles.adjournHelp}>Match button opens exactly at scheduled time.</Text>
                          
                          {!proposedAdjournment ? (
                            <View style={styles.adjournRow}>
                              <TouchableOpacity style={styles.timeSelectBtn} onPress={openTimePicker}>
                                <Ionicons name="time-outline" size={20} color="#f59e0b" />
                                <Text style={styles.timeSelectText}>{adjournTime}</Text>
                              </TouchableOpacity>
                              <TouchableOpacity 
                                style={styles.proposeBtn}
                                onPress={() => handleProposeTime(targetFixture.id, targetFixture.scheduledAt)}
                                disabled={actionLoadingId === targetFixture.id}
                              >
                                {actionLoadingId === targetFixture.id ? <ActivityIndicator color="#fff" /> : <Text style={styles.proposeBtnText}>Propose</Text>}
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <View style={styles.proposedBox}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Ionicons name="time" size={20} color="#f59e0b" />
                                <Text style={styles.proposedText}>
                                  Proposed Time: <Text style={styles.proposedTimeHighlight}>{new Date(proposedAdjournment.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                </Text>
                              </View>
                              {amIProposer ? (
                                <View style={styles.waitingBadge}>
                                  <ActivityIndicator size="small" color="#f59e0b" />
                                  <Text style={styles.waitingOpponentText}>Waiting for opponent to accept</Text>
                                </View>
                              ) : (
                                <TouchableOpacity 
                                  style={styles.acceptBtn}
                                  onPress={() => handleApiAction(targetFixture.id, 'accept-time', undefined, "Time Accepted!")}
                                  disabled={actionLoadingId === targetFixture.id}
                                >
                                  {actionLoadingId === targetFixture.id ? <ActivityIndicator color="#fff" /> : <Text style={styles.acceptBtnText}>ACCEPT NEW TIME</Text>}
                                </TouchableOpacity>
                              )}
                            </View>
                          )}
                        </View>
                      ) : (
                        <View style={styles.waitingBox}>
                          <Text style={styles.waitingText}>Match window has expired.</Text>
                        </View>
                      )}
                    </>
                  ) : null}
                </Animated.View>
              </>
            ) : (
              <Text style={styles.cardDesc}>No pending fixtures. Awaiting matchmaking for your next round.</Text>
            )}
          </Animated.View>
        )}

        {(leagueStatus === 'active' || leagueStatus === 'pre_registration' || leagueStatus === 'completed') && (
          <Animated.View style={[styles.ladderContainer, { opacity: fadeAnims[2], transform: [{ translateY: slideAnims[2] }] }]}>
            
            {/* ✅ NEW: Modified Header to include the Tiers modal link */}
            <View style={[styles.cardHeaderRowPad, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="list-outline" size={20} color="#10b981" />
                <Text style={styles.cardTitle}>League Table</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/tiers')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="information-circle-outline" size={24} color="#a1a1aa" />
              </TouchableOpacity>
            </View>

            <View style={styles.tableWrapper}>
              <View style={styles.fixedLeftCol}>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.tableHeaderText, { width: 30, textAlign: 'center' }]}>#</Text>
                  <Text style={[styles.tableHeaderText, { flex: 1 }]}>CLUB</Text>
                </View>
                
                {leagueData.ladder?.map((row: any, idx: number) => {
                  const isMe = row.userId === myUserId;
                  return (
                    <TouchableOpacity 
                      key={`left-${idx}`} 
                      style={[styles.tableDataRow, isMe && styles.highlightRow]}
                      onPress={() => router.push({ pathname: '/player/[id]', params: { id: row.userId } })}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.rankText, isMe && { color: '#f59e0b' }]}>{idx + 1}</Text>
                      <Text style={[styles.clubText, isMe && { fontWeight: 'bold', color: '#fff' }]} numberOfLines={1}>
                        {row.gamerTag || row.clubName || 'Unknown Player'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollingRightCol}>
                <View>
                  <View style={styles.tableHeaderRow}>
                    <Text style={styles.statHeaderCell}>MP</Text>
                    <Text style={styles.statHeaderCell}>W</Text>
                    <Text style={styles.statHeaderCell}>L</Text>
                    <Text style={styles.statHeaderCell}>GF</Text>
                    <Text style={styles.statHeaderCell}>GA</Text>
                    <Text style={styles.statHeaderCell}>GD</Text>
                    <Text style={[styles.statHeaderCell, { color: '#22d3ee', fontWeight: '900' }]}>PTS</Text>
                  </View>

                  {leagueData.ladder?.map((row: any, idx: number) => {
                    const isMe = row.userId === myUserId;
                    return (
                      <View key={`right-${idx}`} style={[styles.tableDataRow, isMe && styles.highlightRow]}>
                        <Text style={styles.statCell}>{row.played || row.matchesPlayed || 0}</Text>
                        <Text style={styles.statCell}>{row.wins || 0}</Text>
                        <Text style={styles.statCell}>{row.losses || 0}</Text>
                        <Text style={styles.statCell}>{row.goalsFor || 0}</Text>
                        <Text style={styles.statCell}>{row.goalsAgainst || 0}</Text>
                        <Text style={styles.statCell}>{row.goalDifference > 0 ? `+${row.goalDifference}` : (row.goalDifference || 0)}</Text>
                        <Text style={[styles.statCell, { color: '#22d3ee', fontWeight: 'bold' }]}>{row.points || 0}</Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </Animated.View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Dual Column Picker */}
      <Modal visible={showTimePicker} transparent animationType="fade" onRequestClose={() => setShowTimePicker(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerBox}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Propose Match Time</Text>
            </View>
            <View style={styles.pickerColumnsContainer}>
              <ScrollView showsVerticalScrollIndicator={false} style={styles.pickerColumn}>
                <View style={{ paddingVertical: 100 }}> 
                  {HOURS_LIST.map((h) => (
                    <TouchableOpacity key={`h-${h}`} style={styles.timeOption} onPress={() => setModalHour(h)}>
                      <Text style={[styles.timeOptionText, modalHour === h && styles.activeTimeText]}>{h}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <View style={styles.pickerDivider}><Text style={styles.activeTimeText}>:</Text></View>
              <ScrollView showsVerticalScrollIndicator={false} style={styles.pickerColumn}>
                <View style={{ paddingVertical: 100 }}>
                  {MINUTES_LIST.map((m) => (
                    <TouchableOpacity key={`m-${m}`} style={styles.timeOption} onPress={() => setModalMinute(m)}>
                      <Text style={[styles.timeOptionText, modalMinute === m && styles.activeTimeText]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
            <View style={styles.pickerActions}>
              <TouchableOpacity style={styles.closePickerBtn} onPress={() => setShowTimePicker(false)}>
                <Text style={styles.closePickerText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmPickerBtn} onPress={confirmTimeSelection}>
                <Text style={styles.confirmPickerText}>Confirm Time</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
