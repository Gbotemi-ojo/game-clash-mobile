import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function LeagueTiersScreen() {
  const router = useRouter();

  const tiers = [
    { id: 'ucl', name: 'Champions League', desc: 'Top 25% of League Finishers', prize: '$100 Pool', color: '#eab308', icon: 'trophy' },
    { id: 'uel', name: 'Europa League', desc: 'Next 25% of League Finishers', prize: '$50 Pool', color: '#9ca3af', icon: 'medal' },
    { id: 'uecl', name: 'Conference League', desc: 'Next 25% of League Finishers', prize: '$25 Pool', color: '#b45309', icon: 'shield-checkmark' }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#93c5fd" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>TOURNAMENT STAKES</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.introText}>Battle through the monthly league phase to secure your spot in the knockout brackets.</Text>

        {tiers.map((tier) => (
          <View key={tier.id} style={[styles.tierCard, { borderColor: tier.color }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: `${tier.color}20` }]}>
                <Ionicons name={tier.icon as any} size={28} color={tier.color} />
              </View>
              <View style={styles.prizeBadge}>
                <Text style={styles.prizeText}>{tier.prize}</Text>
              </View>
            </View>
            <Text style={styles.tierName}>{tier.name}</Text>
            <Text style={styles.tierDesc}>{tier.desc}</Text>
          </View>
        ))}
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
  introText: { color: '#a1a1aa', fontSize: 15, lineHeight: 22, marginBottom: 24, textAlign: 'center' },
  tierCard: { backgroundColor: '#18181b', borderWidth: 1, borderRadius: 16, padding: 24, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  iconBox: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  prizeBadge: { backgroundColor: '#064e3b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#059669' },
  prizeText: { color: '#34d399', fontSize: 14, fontWeight: 'bold' },
  tierName: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
  tierDesc: { color: '#a1a1aa', fontSize: 14, fontWeight: '500' }
});
