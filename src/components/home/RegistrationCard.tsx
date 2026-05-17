import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { authClient, BACKEND_URL } from '../../lib/auth-client';

const HOURS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

interface RegistrationCardProps {
  activeLeague: any;
  onJoinSuccess: () => void;
}

export default function RegistrationCard({ activeLeague, onJoinSuccess }: RegistrationCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [isLoading, setIsLoading] = useState(false);
  
  const [uiLocation, setUiLocation] = useState('Detecting location...');
  const [ianaTimezone, setIanaTimezone] = useState('UTC');

  // ✅ NEW: State is now an Array of time slots to support multiple windows!
  const [timeSlots, setTimeSlots] = useState([
    { id: '1', start: '18:00', end: '20:00' }
  ]);
  
  // Time Picker Context: Knows exactly WHICH slot and WHICH field ('start' or 'end') is being edited
  const [pickerContext, setPickerContext] = useState<{id: string, field: 'start' | 'end'} | null>(null);

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

  // --- MULTI-SLOT LOGIC ---
  const addTimeSlot = () => {
    if (timeSlots.length >= 3) {
      Alert.alert("Limit Reached", "You can add a maximum of 3 time windows.");
      return;
    }
    const newId = Math.random().toString(36).substring(2, 9);
    setTimeSlots([...timeSlots, { id: newId, start: '18:00', end: '20:00' }]);
  };

  const removeTimeSlot = (id: string) => {
    if (timeSlots.length === 1) return;
    setTimeSlots(timeSlots.filter(s => s.id !== id));
  };

  // --- SMART PICKER LOGIC ---
  const getAvailableHours = () => {
    if (!pickerContext) return [];
    const slot = timeSlots.find(s => s.id === pickerContext.id);
    if (!slot) return HOURS;

    if (pickerContext.field === 'start') {
      return HOURS; // Can pick any start time
    } else {
      // ✅ SMART FILTER: Only show end times that are AT LEAST 1 hour after the start time!
      const startHour = parseInt(slot.start);
      let validEndHours = HOURS.filter(h => parseInt(h) > startHour);
      
      // Allow ending at midnight if they select 23:00
      if (startHour === 23 || !validEndHours.includes('23:59')) {
        validEndHours.push('23:59');
      }
      return validEndHours;
    }
  };

  const selectTime = (time: string) => {
    if (!pickerContext) return;
    
    setTimeSlots(prev => prev.map(slot => {
      if (slot.id === pickerContext.id) {
        if (pickerContext.field === 'start') {
          const newStartHour = parseInt(time);
          let newEnd = slot.end;
          
          // Auto-bump the End time if they pick a Start time that makes the current End time invalid
          if (parseInt(newEnd) <= newStartHour) {
            newEnd = (newStartHour + 1 < 24) ? `${(newStartHour + 1).toString().padStart(2, '0')}:00` : '23:59';
          }
          return { ...slot, start: time, end: newEnd };
        } else {
          return { ...slot, end: time };
        }
      }
      return slot;
    }));
    
    setPickerContext(null); // Close modal
  };

  const handleJoinLeague = async () => {
    setIsLoading(true);
    try {
      // Clean out the local IDs and map to exact payload backend expects
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
    } catch (error: any) {
      Alert.alert("Registration Denied", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (activeLeague) {
    return (
      <View style={styles.mainCard}>
        <View style={[styles.dateBadge, { backgroundColor: '#10b981' }]}>
          <Ionicons name="checkmark-circle" size={14} color="#000" />
          <Text style={styles.dateBadgeText}>League Active</Text>
        </View>
        <Text style={styles.sectionTitle}>You are currently competing in {activeLeague.league?.name || 'an Official League'}.</Text>
        <Text style={styles.cardDescription}>Check the Tournaments tab to view your upcoming fixtures and current ladder ranking.</Text>
      </View>
    );
  }

  // Pre-calculate array for picker to avoid re-rendering issues
  const pickerOptions = getAvailableHours();
  const activeSlot = pickerContext ? timeSlots.find(s => s.id === pickerContext.id) : null;

  return (
    <View>
      <Text style={styles.sectionTitle}>Next Season Registration</Text>
      <View style={styles.mainCard}>
        
        <View style={styles.dateBadge}>
          <Ionicons name="calendar-outline" size={14} color="#000" />
          <Text style={styles.dateBadgeText}>Next League Starts: June 1st</Text>
        </View>

        <Text style={styles.cardDescription}>Configure your availability for automated league matchmaking.</Text>

        <Animated.View style={{ transform: [{ scale: scaleAnim }], marginBottom: 24 }}>
          <TouchableOpacity 
            style={styles.ctaButton} 
            activeOpacity={0.9}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handleJoinLeague}
            disabled={isLoading}
          >
            {isLoading ? <ActivityIndicator color="#000" /> : <Text style={styles.ctaText}>Join Official League</Text>}
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.tagRow}>
          <View style={styles.tag}>
            <Ionicons name="people" size={16} color="#3b82f6" />
            <Text style={styles.tagText}>20-Player League</Text>
          </View>
          <View style={styles.tag}>
            <Ionicons name="football" size={16} color="#fff" />
            <Text style={styles.tagText}>1 Match per day</Text>
          </View>
        </View>

        <Text style={styles.subHeading}>PRIZE & QUALIFICATION TIERS</Text>

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

        <Text style={styles.inputLabel}>Location Setup</Text>
        <View style={styles.dropdownInput}>
          <Text style={styles.inputText}>{uiLocation}</Text>
          <Ionicons name="location-outline" size={20} color="#888" />
        </View>

        <Text style={styles.inputLabel}>Available Hours</Text>
        
        {/* ✅ Dynamic Multi-Slot Rendering */}
        {timeSlots.map((slot, index) => (
          <View key={slot.id} style={styles.timeSlotWrapper}>
            <View style={styles.timeRow}>
              <TouchableOpacity style={styles.timeInputBox} onPress={() => setPickerContext({ id: slot.id, field: 'start' })}>
                <Text style={styles.timeLabel}>From</Text>
                <View style={styles.timeValueRow}>
                  <Ionicons name="time-outline" size={16} color="#888" />
                  <Text style={styles.timeText}>{slot.start}</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.timeInputBox} onPress={() => setPickerContext({ id: slot.id, field: 'end' })}>
                <Text style={styles.timeLabel}>To</Text>
                <View style={styles.timeValueRow}>
                  <Ionicons name="time-outline" size={16} color="#888" />
                  <Text style={styles.timeText}>{slot.end}</Text>
                </View>
              </TouchableOpacity>

              {/* Only show delete button if there's more than 1 slot */}
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
            <Ionicons name="add-circle-outline" size={16} color="#3b82f6" />
            <Text style={styles.addSlotText}>Add another time window</Text>
          </TouchableOpacity>
        )}

      </View>

      {/* ✅ Smart Time Picker Modal */}
      <Modal visible={!!pickerContext} transparent animationType="fade" onRequestClose={() => setPickerContext(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerBox}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select {pickerContext?.field === 'start' ? 'Start' : 'End'} Time</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {pickerOptions.map((time) => (
                <TouchableOpacity 
                  key={time} 
                  style={styles.timeOption} 
                  onPress={() => selectTime(time)}
                >
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
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 12, marginTop: 8 },
  mainCard: { backgroundColor: '#18181b', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#27272a' },
  dateBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: '#f59e0b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 6, marginBottom: 16 },
  dateBadgeText: { color: '#000', fontWeight: '700', fontSize: 12 },
  cardDescription: { color: '#a1a1aa', fontSize: 15, lineHeight: 22, marginBottom: 16 },
  
  // Tags & Tiers
  tagRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  tag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#27272a', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 8 },
  tagText: { color: '#d4d4d8', fontSize: 13, fontWeight: '500' },
  subHeading: { color: '#71717a', fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
  tierContainer: { gap: 12, marginBottom: 24 },
  tierRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#222225', padding: 16, borderRadius: 12, position: 'relative', overflow: 'hidden' },
  tierAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  tierIcon: { marginRight: 12, marginLeft: 4 },
  tierText: { color: '#fff', fontSize: 14, fontWeight: '500', flex: 1 },
  prizeBadge: { backgroundColor: '#064e3b', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#059669' },
  prizeText: { color: '#34d399', fontWeight: 'bold', fontSize: 12 },
  
  // Inputs
  inputLabel: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  dropdownInput: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1f1f25', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 16, marginBottom: 20 },
  inputText: { color: '#fff', fontSize: 15 },
  
  // Dynamic Time Slots
  timeSlotWrapper: { marginBottom: 12 },
  timeRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  timeInputBox: { flex: 1, backgroundColor: '#1f1f25', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 12 },
  timeLabel: { color: '#71717a', fontSize: 11, marginBottom: 4 },
  timeValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeText: { color: '#fff', fontSize: 15 },
  removeBtn: { padding: 10, backgroundColor: '#27272a', borderRadius: 8, borderWidth: 1, borderColor: '#333' },
  
  addSlotBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, marginBottom: 8 },
  addSlotText: { color: '#3b82f6', fontSize: 13, fontWeight: '600' },
  
  // Button
  ctaButton: { backgroundColor: '#f59e0b', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  ctaText: { color: '#000', fontSize: 16, fontWeight: 'bold' },

  // Modal Styles
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  pickerBox: { backgroundColor: '#18181b', width: 280, height: 400, borderRadius: 16, borderWidth: 1, borderColor: '#27272a', overflow: 'hidden' },
  pickerHeader: { backgroundColor: '#27272a', padding: 16, alignItems: 'center' },
  pickerTitle: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  timeOption: { padding: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#27272a' },
  timeOptionText: { color: '#d4d4d8', fontSize: 18 },
  activeTimeText: { color: '#f59e0b', fontWeight: 'bold', fontSize: 20 },
  closePickerBtn: { backgroundColor: '#222225', padding: 16, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#333' },
  closePickerText: { color: '#ef4444', fontWeight: 'bold', fontSize: 16 }
});
