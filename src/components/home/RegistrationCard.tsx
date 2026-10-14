// src/components/home/RegistrationCard.tsx
import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { authClient, BACKEND_URL } from '../../lib/auth-client';

const HOURS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

interface RegistrationCardProps {
  activeLeague: any;
  onJoinSuccess: () => void;
  onRequireScroll?: (y: number) => void; // 🔴 NEW: Recieves the scroll commander
}

export default function RegistrationCard({ activeLeague, onJoinSuccess, onRequireScroll }: RegistrationCardProps) {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const wizardScrollRef = useRef<ScrollView>(null);
  const [isWizardVisible, setWizardVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [uiLocation, setUiLocation] = useState('Detecting location...');
  const [ianaTimezone, setIanaTimezone] = useState('UTC');

  // 🔴 THE FIX: Default state is now blank to force a decision
  const [timeSlots, setTimeSlots] = useState([
    { id: '1', start: '--:--', end: '--:--' }
  ]);
  
  const [pickerContext, setPickerContext] = useState<{id: string, field: 'start' | 'end'} | null>(null);
  
  // 🔴 NEW STATES for Error Handling & Scroll Tracking
  const [hasTimeError, setHasTimeError] = useState(false);
  const [timeSectionY, setTimeSectionY] = useState(0); 

  useEffect(() => {
    (async () => {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      setIanaTimezone(tz);

      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setUiLocation(tz.replace('_', ' ').split('/').reverse().join(', '));
          return;
        }

        let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        let geocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });

        if (geocode.length > 0) {
          const place = geocode[0];
          setUiLocation(`${place.city || place.region}, ${place.country}`);
        } else {
          setUiLocation(tz.replace('_', ' ').split('/').reverse().join(', '));
        }
      } catch (error) {
        setUiLocation(tz.replace('_', ' ').split('/').reverse().join(', '));
      }
    })();
  }, []);

  const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }).start();

  const addTimeSlot = () => {
    if (timeSlots.length >= 3) {
      Alert.alert("Limit Reached", "You can add a maximum of 3 time windows.");
      return;
    }
    const newId = Math.random().toString(36).substring(2, 9);
    setTimeSlots([...timeSlots, { id: newId, start: '--:--', end: '--:--' }]);
  };

  const removeTimeSlot = (id: string) => {
    if (timeSlots.length === 1) return;
    setTimeSlots(timeSlots.filter(s => s.id !== id));
  };

  const getAvailableHours = () => {
    if (!pickerContext) return [];
    const slot = timeSlots.find(s => s.id === pickerContext.id);
    if (!slot) return HOURS;

    if (pickerContext.field === 'start') {
      return HOURS; 
    } else {
      // Allow anything if start isn't picked yet
      if (slot.start === '--:--') return HOURS; 

      const startHour = parseInt(slot.start);
      let validEndHours = HOURS.filter(h => parseInt(h) > startHour);
      if (startHour === 23 || !validEndHours.includes('23:59')) {
        validEndHours.push('23:59');
      }
      return validEndHours;
    }
  };

  const selectTime = (time: string) => {
    if (!pickerContext) return;
    
    setHasTimeError(false); // Clear error on interaction

    setTimeSlots(prev => prev.map(slot => {
      if (slot.id === pickerContext.id) {
        if (pickerContext.field === 'start') {
          const newStartHour = parseInt(time);
          let newEnd = slot.end;
          
          if (newEnd !== '--:--' && parseInt(newEnd) <= newStartHour) {
            newEnd = (newStartHour + 1 < 24) ? `${(newStartHour + 1).toString().padStart(2, '0')}:00` : '23:59';
          }
          return { ...slot, start: time, end: newEnd };
        } else {
          return { ...slot, end: time };
        }
      }
      return slot;
    }));
    
    setPickerContext(null); 
  };

  const handleJoinLeague = async () => {
    // 🔴 THE FIX: Validate before firing the API
    const hasEmptySlot = timeSlots.some(s => s.start === '--:--' || s.end === '--:--');
    
    if (hasEmptySlot) {
      setHasTimeError(true);
      Alert.alert("Action Required", "Please select your available playing hours before joining.");
      if (onRequireScroll && timeSectionY > 0) {
        onRequireScroll(timeSectionY + 200); // Scrolls directly to the time input!
      }
      wizardScrollRef.current?.scrollToEnd({ animated: true });
      return;
    }

    setIsLoading(true);
    try {
      const formattedTimeSlots = timeSlots.map(s => ({ start: s.start, end: s.end }));

      const { data, error } = await authClient.$fetch<any>(`${BACKEND_URL}/api/v1/leagues/join`, {
        method: 'POST',
        body: { 
          timezone: ianaTimezone, 
          timeSlots: formattedTimeSlots 
        }
      });
      
      if (error) {
        const backendMessage = (error as any).error || error.message || 'Failed to join league';
        throw new Error(backendMessage);
      }

      Alert.alert("Success!", "You have secured your spot in the next league.");
      onJoinSuccess(); 
      setWizardVisible(false);
    } catch (error: any) {
      const errMsg = error.message || '';
      const isMissingDls = /dls|game.?[Ii][Dd]|player.?[Ii][Dd]/i.test(errMsg) || errMsg.includes('dlsPlayerId');

      if (isMissingDls) {
        Alert.alert("Registration Denied", errMsg, [
          { text: 'OK' },
          { text: 'Go to Profile', onPress: () => router.push('/(tabs)/profile') },
        ]);
      } else {
        Alert.alert("Registration Denied", errMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (activeLeague) {
    return (
      <View style={styles.activeLeagueCard}>
        <View style={styles.activeLeagueTop}>
          <View style={styles.activeBadge}>
            <Ionicons name="checkmark-circle" size={15} color="#10b981" />
            <Text style={styles.activeBadgeText}>LEAGUE ACTIVE</Text>
          </View>
          <Ionicons name="trophy" size={25} color="#fbbf24" />
        </View>
        <Text style={styles.activeLeagueName}>{activeLeague.league?.name || 'Official League'}</Text>
        <Text style={styles.cardDescription}>Your season is underway. Your fixtures and standings are waiting in the Arena.</Text>
        <TouchableOpacity style={styles.arenaLink} onPress={() => router.push('/(tabs)/tournaments')} activeOpacity={0.8}>
          <Text style={styles.arenaLinkText}>OPEN MATCH ARENA</Text>
          <Ionicons name="arrow-forward" size={16} color="#22d3ee" />
        </TouchableOpacity>
      </View>
    );
  }

  const pickerOptions = getAvailableHours();
  const activeSlot = pickerContext ? timeSlots.find(s => s.id === pickerContext.id) : null;

  return (
    <View>
      <View style={styles.joinHero}>
        <View style={styles.heroOrb}>
          <Ionicons name="trophy" size={24} color="#fbbf24" />
        </View>
        <View style={styles.joinHeroCopy}>
          <View style={styles.heroEyebrowRow}>
            <View style={styles.openDot} />
            <Text style={styles.openText}>SEASON REGISTRATION OPEN</Text>
          </View>
          <Text style={styles.heroTitle}>Ready to compete?</Text>
          <Text style={styles.heroSubtitle}>Build your schedule. Enter the league.</Text>
        </View>
        <TouchableOpacity
          style={styles.registerNowButton}
          onPress={() => setWizardVisible(true)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Register for the next season"
        >
          <Text style={styles.registerNowText}>REGISTER NOW</Text>
          <Ionicons name="arrow-forward" size={17} color="#071115" />
        </TouchableOpacity>
        <View style={styles.heroMeta}>
          <View style={styles.heroMetaItem}>
            <Ionicons name="people" size={14} color="#22d3ee" />
            <Text style={styles.heroMetaText}>20 players</Text>
          </View>
          <View style={styles.heroMetaDivider} />
          <View style={styles.heroMetaItem}>
            <Ionicons name="calendar-outline" size={14} color="#fbbf24" />
            <Text style={styles.heroMetaText}>Season starts June 1</Text>
          </View>
        </View>
      </View>

      <Modal
        visible={isWizardVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setWizardVisible(false)}
      >
        <View style={styles.wizardContainer}>
          <View style={styles.wizardHeader}>
            <View>
              <Text style={styles.wizardEyebrow}>OFFICIAL LEAGUE</Text>
              <Text style={styles.wizardTitle}>Set up your season</Text>
            </View>
            <TouchableOpacity style={styles.wizardClose} onPress={() => setWizardVisible(false)} accessibilityRole="button" accessibilityLabel="Close registration">
              <Ionicons name="close" size={22} color="#e4e4e7" />
            </TouchableOpacity>
          </View>
          <View style={styles.wizardStep}>
            <View style={styles.wizardStepNumber}><Text style={styles.wizardStepNumberText}>01</Text></View>
            <View>
              <Text style={styles.wizardStepTitle}>Your availability</Text>
              <Text style={styles.wizardStepCaption}>Choose when opponents can reach you</Text>
            </View>
          </View>
          <ScrollView ref={wizardScrollRef} contentContainerStyle={styles.wizardScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.mainCard}>

        <Text style={styles.leagueHeadline}>Your next challenge starts <Text style={styles.headlineAccent}>June 1st</Text></Text>
        <Text style={styles.cardDescription}>Choose your location and available match times. Your schedule helps us find fair matchups.</Text>

        <View style={styles.tagRow}>
          <View style={styles.tag}>
            <Ionicons name="people" size={16} color="#22d3ee" />
            <Text style={styles.tagText}>20-Player League</Text>
          </View>
          <View style={styles.tag}>
            <Ionicons name="football" size={16} color="#a1a1aa" />
            <Text style={styles.tagText}>1 Match per day</Text>
          </View>
        </View>

        <View style={styles.subHeadingRow}>
          <Ionicons name="medal-outline" size={15} color="#f59e0b" />
          <Text style={styles.subHeading}>PRIZE & QUALIFICATION TIERS</Text>
        </View>

        <View style={styles.tierContainer}>
          <View style={styles.tierRow}>
            <View style={[styles.tierAccent, { backgroundColor: '#eab308' }]} />
            <Ionicons name="trophy-outline" size={20} color="#eab308" style={styles.tierIcon} />
            <Text style={styles.tierText}>Top 25% (Champions League)</Text>
            <View style={styles.prizeBadge}><Text style={styles.prizeText}>$100 Prize</Text></View>
          </View>
          <View style={styles.tierRow}>
            <View style={[styles.tierAccent, { backgroundColor: '#9ca3af' }]} />
            <Ionicons name="trophy-outline" size={20} color="#9ca3af" style={styles.tierIcon} />
            <Text style={styles.tierText}>Top 50% (Europa League)</Text>
            <View style={styles.prizeBadge}><Text style={styles.prizeText}>$50 Prize</Text></View>
          </View>
        </View>

        <View style={styles.selectionHeading}>
          <View style={styles.selectionIcon}>
            <Ionicons name="location" size={16} color="#22d3ee" />
          </View>
          <View>
            <Text style={styles.inputLabel}>Location Setup</Text>
            <Text style={styles.selectionHint}>Used to coordinate fair match times</Text>
          </View>
        </View>
        <View style={styles.dropdownInput}>
          <Text style={styles.inputText}>{uiLocation}</Text>
          <View style={styles.detectedPill}>
            <Ionicons name="navigate" size={12} color="#22d3ee" />
            <Text style={styles.detectedText}>DETECTED</Text>
          </View>
        </View>

        {/* 🔴 THE FIX: onLayout captures the exact pixel coordinate so we know where to scroll */}
        <View testID="available-hours-section" onLayout={(e) => setTimeSectionY(e.nativeEvent.layout.y)}>
          <View style={styles.selectionHeading}>
            <View style={styles.selectionIcon}>
              <Ionicons name="time" size={16} color="#22d3ee" />
            </View>
            <View>
              <Text style={styles.inputLabel}>Available Hours</Text>
              <Text style={styles.selectionHint}>Choose when you can play each day</Text>
            </View>
          </View>
          
          {timeSlots.map((slot, index) => (
            <View key={slot.id} style={styles.timeSlotWrapper}>
              <View style={styles.timeRow}>
                
                {/* 🔴 Glows red if hasTimeError is triggered and start is empty */}
                <TouchableOpacity 
                  style={[styles.timeInputBox, hasTimeError && slot.start === '--:--' && { borderColor: '#ef4444', borderWidth: 1 }]} 
                  onPress={() => setPickerContext({ id: slot.id, field: 'start' })}
                  testID={`time-start-${slot.id}`}
                >
                  <Text style={styles.timeLabel}>From</Text>
                  <View style={styles.timeValueRow}>
                    <Ionicons name="time-outline" size={16} color={hasTimeError && slot.start === '--:--' ? '#ef4444' : '#22d3ee'} />
                    <Text style={[styles.timeText, hasTimeError && slot.start === '--:--' && { color: '#ef4444' }]}>{slot.start}</Text>
                  </View>
                </TouchableOpacity>

                <Ionicons name="arrow-forward" size={15} color="#52525b" />
                
                {/* 🔴 Glows red if hasTimeError is triggered and end is empty */}
                <TouchableOpacity 
                  style={[styles.timeInputBox, hasTimeError && slot.end === '--:--' && { borderColor: '#ef4444', borderWidth: 1 }]} 
                  onPress={() => setPickerContext({ id: slot.id, field: 'end' })}
                  testID={`time-end-${slot.id}`}
                >
                  <Text style={styles.timeLabel}>To</Text>
                  <View style={styles.timeValueRow}>
                    <Ionicons name="time-outline" size={16} color={hasTimeError && slot.end === '--:--' ? '#ef4444' : '#22d3ee'} />
                    <Text style={[styles.timeText, hasTimeError && slot.end === '--:--' && { color: '#ef4444' }]}>{slot.end}</Text>
                  </View>
                </TouchableOpacity>

                {timeSlots.length > 1 && (
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removeTimeSlot(slot.id)}>
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}

          {timeSlots.length < 3 && (
            <TouchableOpacity style={styles.addSlotBtn} onPress={addTimeSlot}>
              <Ionicons name="add-circle-outline" size={17} color="#22d3ee" />
              <Text style={styles.addSlotText}>Add another time window</Text>
            </TouchableOpacity>
          )}
        </View>

        <Animated.View style={{ transform: [{ scale: scaleAnim }], marginTop: 18 }}>
          <TouchableOpacity
            style={styles.ctaButton}
            activeOpacity={0.9}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handleJoinLeague}
            disabled={isLoading}
            testID="join-league-button"
            accessibilityRole="button"
          >
            {isLoading ? (
              <ActivityIndicator color="#071115" />
            ) : (
              <>
                <Ionicons name="flash" size={18} color="#071115" />
                <Text style={styles.ctaText}>Confirm Registration</Text>
                <Ionicons name="arrow-forward" size={18} color="#071115" />
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={!!pickerContext} transparent animationType="fade" onRequestClose={() => setPickerContext(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerBox}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select {pickerContext?.field === 'start' ? 'Start' : 'End'} Time</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {pickerOptions.map((time) => (
                <TouchableOpacity key={time} style={styles.timeOption} onPress={() => selectTime(time)} testID={`time-option-${time}`}>
                  <Text style={[
                    styles.timeOptionText, 
                    (pickerContext?.field === 'start' ? activeSlot?.start : activeSlot?.end) === time && styles.activeTimeText
                  ]}>
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.closePickerBtn} onPress={() => setPickerContext(null)}>
              <Text style={styles.closePickerText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  joinHero: { backgroundColor: '#14151b', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: 'rgba(34,211,238,0.22)', shadowColor: '#22d3ee', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 14, elevation: 4 },
  heroOrb: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(245,158,11,0.11)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', marginBottom: 15 },
  joinHeroCopy: { marginBottom: 16 },
  heroEyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 7 },
  heroTitle: { color: '#fafafa', fontSize: 22, fontWeight: '900', letterSpacing: -0.3 },
  heroSubtitle: { color: '#a1a1aa', fontSize: 12, marginTop: 5 },
  registerNowButton: { minHeight: 49, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 13, backgroundColor: '#22d3ee', shadowColor: '#22d3ee', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  registerNowText: { color: '#071115', fontSize: 13, fontWeight: '900', letterSpacing: 0.8 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 15 },
  heroMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroMetaText: { color: '#a1a1aa', fontSize: 10, fontWeight: '700' },
  heroMetaDivider: { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.12)' },
  wizardContainer: { flex: 1, backgroundColor: '#09090b', paddingTop: 18 },
  wizardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 17 },
  wizardEyebrow: { color: '#22d3ee', fontSize: 9, fontWeight: '900', letterSpacing: 1.4, marginBottom: 4 },
  wizardTitle: { color: '#fafafa', fontSize: 21, fontWeight: '900' },
  wizardClose: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#1a1b22', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  wizardStep: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: 'rgba(34,211,238,0.06)', padding: 13, marginHorizontal: 20, marginBottom: 16, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(34,211,238,0.14)' },
  wizardStepNumber: { width: 33, height: 33, borderRadius: 11, backgroundColor: '#22d3ee', alignItems: 'center', justifyContent: 'center' },
  wizardStepNumberText: { color: '#071115', fontSize: 11, fontWeight: '900' },
  wizardStepTitle: { color: '#f4f4f5', fontSize: 13, fontWeight: '900' },
  wizardStepCaption: { color: '#a1a1aa', fontSize: 10, marginTop: 3 },
  wizardScroll: { paddingHorizontal: 18, paddingBottom: 32 },
  activeLeagueCard: { backgroundColor: '#14151b', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' },
  activeLeagueTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  arenaLink: { marginTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)', paddingTop: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arenaLinkText: { color: '#22d3ee', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 13, marginTop: 4 },
  sectionHeadingAccent: { width: 4, height: 35, borderRadius: 2, backgroundColor: '#22d3ee' },
  sectionEyebrow: { color: '#22d3ee', fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginBottom: 3 },
  sectionTitle: { fontSize: 19, fontWeight: '900', color: '#fafafa', letterSpacing: 0.2 },
  mainCard: {
    backgroundColor: '#14151b',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 5,
  },
  cardTopline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dateBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245,158,11,0.12)', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, gap: 7, borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)' },
  dateBadgeText: { color: '#fbbf24', fontWeight: '900', fontSize: 10, letterSpacing: 0.8 },
  openPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16,185,129,0.10)', paddingHorizontal: 9, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' },
  openDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' },
  openText: { color: '#34d399', fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  leagueHeadline: { color: '#f4f4f5', fontSize: 20, lineHeight: 27, fontWeight: '900', letterSpacing: -0.3, marginBottom: 7 },
  headlineAccent: { color: '#22d3ee' },
  cardDescription: { color: '#a1a1aa', fontSize: 13, lineHeight: 20, marginBottom: 18 },
  activeBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16,185,129,0.12)', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20, gap: 7, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(16,185,129,0.22)' },
  activeBadgeText: { color: '#34d399', fontWeight: '900', fontSize: 10, letterSpacing: 0.8 },
  activeLeagueName: { color: '#fafafa', fontSize: 21, fontWeight: '900', letterSpacing: 0.2, marginBottom: 8 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 23 },
  tag: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.045)', paddingHorizontal: 11, paddingVertical: 8, borderRadius: 20, gap: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  tagText: { color: '#d4d4d8', fontSize: 12, fontWeight: '700' },
  subHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  subHeading: { color: '#a1a1aa', fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  tierContainer: { gap: 9, marginBottom: 22 },
  tierRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1b1c23', paddingVertical: 13, paddingHorizontal: 12, borderRadius: 12, position: 'relative', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.055)' },
  tierAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  tierIcon: { marginRight: 9, marginLeft: 4 },
  tierText: { color: '#e4e4e7', fontSize: 12, fontWeight: '700', flex: 1 },
  prizeBadge: { backgroundColor: 'rgba(16,185,129,0.10)', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)' },
  prizeText: { color: '#34d399', fontWeight: '900', fontSize: 10 },
  selectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 11 },
  selectionIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(34,211,238,0.10)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(34,211,238,0.16)' },
  inputLabel: { color: '#f4f4f5', fontSize: 13, fontWeight: '800', marginBottom: 2 },
  selectionHint: { color: '#71717a', fontSize: 10, fontWeight: '500' },
  dropdownInput: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1a1b22', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 20 },
  inputText: { color: '#e4e4e7', fontSize: 13, fontWeight: '600', flexShrink: 1, marginRight: 8 },
  detectedPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(34,211,238,0.08)', paddingHorizontal: 7, paddingVertical: 5, borderRadius: 8 },
  detectedText: { color: '#22d3ee', fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  timeSlotWrapper: { marginBottom: 10 },
  timeRow: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  timeInputBox: { flex: 1, backgroundColor: '#1a1b22', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 11 },
  timeLabel: { color: '#71717a', fontSize: 9, fontWeight: '800', letterSpacing: 0.8, marginBottom: 5, textTransform: 'uppercase' },
  timeValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeText: { color: '#f4f4f5', fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  removeBtn: { padding: 9, backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 9, borderWidth: 1, borderColor: 'rgba(239,68,68,0.18)' },
  addSlotBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 9, marginBottom: 5 },
  addSlotText: { color: '#22d3ee', fontSize: 12, fontWeight: '800' },
  ctaButton: {
    backgroundColor: '#22d3ee',
    minHeight: 56,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 7,
  },
  ctaText: { color: '#071115', fontSize: 15, fontWeight: '900', letterSpacing: 0.2 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  pickerBox: { backgroundColor: '#15161c', width: '100%', maxWidth: 320, height: 400, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  pickerHeader: { backgroundColor: '#1e2028', padding: 17, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  pickerTitle: { color: '#f4f4f5', fontWeight: '900', fontSize: 15, letterSpacing: 0.2 },
  timeOption: { padding: 15, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.055)' },
  timeOptionText: { color: '#d4d4d8', fontSize: 17, fontVariant: ['tabular-nums'] },
  activeTimeText: { color: '#22d3ee', fontWeight: '900', fontSize: 19 },
  closePickerBtn: { backgroundColor: '#1b1c23', padding: 15, alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)' },
  closePickerText: { color: '#f87171', fontWeight: '800', fontSize: 14 }
});
