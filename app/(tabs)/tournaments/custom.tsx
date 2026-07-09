import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function CustomTournamentsScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Custom Tournaments</Text>
      <Text style={styles.desc}>Create and manage your own private brackets.</Text>
      <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/create-tournament')}>
        <Ionicons name="add-circle" size={24} color="#000" />
        <Text style={styles.createBtnText}>Create New</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f13', justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { color: '#fff', fontSize: 24, fontWeight: '900', marginBottom: 12 },
  desc: { color: '#a1a1aa', fontSize: 15, marginBottom: 32, textAlign: 'center' },
  createBtn: { flexDirection: 'row', backgroundColor: '#38bdf8', paddingHorizontal: 24, paddingVertical: 16, borderRadius: 12, gap: 8 },
  createBtnText: { color: '#000', fontWeight: 'bold', fontSize: 16 }
});
