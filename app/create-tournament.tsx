import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function CreateTournamentScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [format, setFormat] = useState<'knockout' | 'league'>('knockout');
  const [size, setSize] = useState(8);
  const [isPrivate, setIsPrivate] = useState(true);
  const [allowExtraTime, setAllowExtraTime] = useState(true);
  const [allowPenalties, setAllowPenalties] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#93c5fd" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>CREATE CUSTOM</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Tournament Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Weekend Clash"
            placeholderTextColor="#71717a"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Format</Text>
          <View style={styles.formatRow}>
            <TouchableOpacity 
              style={[styles.formatBtn, format === 'knockout' && styles.formatBtnActive]}
              onPress={() => setFormat('knockout')}
              activeOpacity={0.8}
            >
              <Ionicons name="git-network-outline" size={24} color={format === 'knockout' ? '#000' : '#a1a1aa'} />
              <Text style={[styles.formatText, format === 'knockout' && styles.formatTextActive]}>Knockout</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.formatBtn, format === 'league' && styles.formatBtnActive]}
              onPress={() => setFormat('league')}
              activeOpacity={0.8}
            >
              <Ionicons name="list-outline" size={24} color={format === 'league' ? '#000' : '#a1a1aa'} />
              <Text style={[styles.formatText, format === 'league' && styles.formatTextActive]}>League</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Participants</Text>
          <View style={styles.sizeRow}>
            {[4, 8, 16, 32].map((num) => (
              <TouchableOpacity
                key={num}
                style={[styles.sizeBtn, size === num && styles.sizeBtnActive]}
                onPress={() => setSize(num)}
              >
                <Text style={[styles.sizeText, size === num && styles.sizeTextActive]}>{num}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Rules & Settings</Text>
          
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingTitle}>Extra Time</Text>
              <Text style={styles.settingDesc}>Play extra time if drawn</Text>
            </View>
            <Switch 
              value={allowExtraTime} 
              onValueChange={setAllowExtraTime} 
              trackColor={{ false: '#27272a', true: '#3b82f6' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingTitle}>Penalties</Text>
              <Text style={styles.settingDesc}>Go to penalties after ET</Text>
            </View>
            <Switch 
              value={allowPenalties} 
              onValueChange={setAllowPenalties} 
              trackColor={{ false: '#27272a', true: '#3b82f6' }}
              thumbColor="#fff"
            />
          </View>

          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View>
              <Text style={styles.settingTitle}>Private Tournament</Text>
              <Text style={styles.settingDesc}>Only players with the link can join</Text>
            </View>
            <Switch 
              value={isPrivate} 
              onValueChange={setIsPrivate} 
              trackColor={{ false: '#27272a', true: '#f59e0b' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <View style={styles.stakesCard}>
          <View style={styles.stakesHeader}>
            <Ionicons name="game-controller-outline" size={24} color="#10b981" />
            <Text style={styles.stakesTitle}>Friendly Mode</Text>
          </View>
          <Text style={styles.stakesDesc}>This is a custom community tournament. No entry tickets are required and no official prize pool will be distributed.</Text>
        </View>

        <TouchableOpacity style={styles.submitBtn} activeOpacity={0.8}>
          <Text style={styles.submitBtnText}>Generate Tournament</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f13' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f1f25' },
  backBtn: { padding: 8 },
  pageTitle: { color: '#93c5fd', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  card: { backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 16, padding: 20, marginBottom: 16 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 16 },
  input: { backgroundColor: '#1f1f25', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 16, color: '#fff', fontSize: 16 },
  formatRow: { flexDirection: 'row', gap: 12 },
  formatBtn: { flex: 1, backgroundColor: '#1f1f25', borderWidth: 1, borderColor: '#333', borderRadius: 12, padding: 16, alignItems: 'center', gap: 8 },
  formatBtnActive: { backgroundColor: '#38bdf8', borderColor: '#38bdf8' },
  formatText: { color: '#a1a1aa', fontSize: 14, fontWeight: '600' },
  formatTextActive: { color: '#000', fontWeight: 'bold' },
  sizeRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  sizeBtn: { flex: 1, backgroundColor: '#1f1f25', borderWidth: 1, borderColor: '#333', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  sizeBtnActive: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
  sizeText: { color: '#a1a1aa', fontSize: 16, fontWeight: 'bold' },
  sizeTextActive: { color: '#000' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#27272a' },
  settingTitle: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 4 },
  settingDesc: { color: '#a1a1aa', fontSize: 12 },
  stakesCard: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 1, borderColor: '#10b981', borderRadius: 16, padding: 20, marginBottom: 24 },
  stakesHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  stakesTitle: { color: '#10b981', fontSize: 16, fontWeight: 'bold' },
  stakesDesc: { color: '#a1a1aa', fontSize: 13, lineHeight: 20 },
  submitBtn: { backgroundColor: '#38bdf8', paddingVertical: 18, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: '#000', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 }
});
