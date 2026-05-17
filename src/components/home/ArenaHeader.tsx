import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';

export default function ArenaHeader({ onOpenMenu, ticketCount = 0 }: { onOpenMenu: () => void, ticketCount?: number }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onOpenMenu}>
        <Ionicons name="menu" size={28} color="#fff" />
      </TouchableOpacity>
      
      <Text style={styles.headerLogo}>DLS HUB</Text>
      
      <View style={styles.headerRight}>
        <View style={styles.ticketPill}>
          {/* ✅ Standardized Golden Ticket Icon */}
          <FontAwesome5 name="ticket-alt" size={14} color="#f59e0b" />
          <Text style={styles.ticketCount}>{ticketCount}</Text>
        </View>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1f1f25' },
  headerLogo: { fontSize: 22, fontWeight: '800', color: '#93c5fd', letterSpacing: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  ticketPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#272730', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 6 },
  ticketCount: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});
