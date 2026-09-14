import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../styles/tournaments.styles';

const HOURS_LIST = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES_LIST = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

interface AdjournmentSystemProps {
  matchId: number;
  scheduledAt: string;
  actionLoadingId: number | null;
  proposedAdjournment: any;
  amIProposer: boolean;
  onProposeTime: (matchId: number, scheduledAt: string, adjournTime: string) => void;
  onAcceptTime: (matchId: number) => void;
}

export default function AdjournmentSystem({
  matchId,
  scheduledAt,
  actionLoadingId,
  proposedAdjournment,
  amIProposer,
  onProposeTime,
  onAcceptTime
}: AdjournmentSystemProps) {
  const [adjournTime, setAdjournTime] = useState('12:00');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [modalHour, setModalHour] = useState('12');
  const [modalMinute, setModalMinute] = useState('00');

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

  return (
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
            onPress={() => onProposeTime(matchId, scheduledAt, adjournTime)}
            disabled={actionLoadingId === matchId}
          >
            {actionLoadingId === matchId ? <ActivityIndicator color="#fff" /> : <Text style={styles.proposeBtnText}>Propose</Text>}
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
              onPress={() => onAcceptTime(matchId)}
              disabled={actionLoadingId === matchId}
            >
              {actionLoadingId === matchId ? <ActivityIndicator color="#fff" /> : <Text style={styles.acceptBtnText}>ACCEPT NEW TIME</Text>}
            </TouchableOpacity>
          )}
        </View>
      )}

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
    </View>
  );
}
