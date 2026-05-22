import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: '#0f0f13', justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#0f0f13' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  pageTitle: { color: '#93c5fd', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  markAllText: { color: '#a1a1aa', fontSize: 13, fontWeight: 'bold' },

  filterScroll: { paddingHorizontal: 20, marginBottom: 15, maxHeight: 40 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', marginRight: 10, justifyContent: 'center' },
  filterChipActive: { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderColor: '#38bdf8' },
  filterText: { color: '#a1a1aa', fontSize: 13, fontWeight: 'bold' },
  filterTextActive: { color: '#38bdf8' },

  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  
  notificationCard: { flexDirection: 'row', backgroundColor: '#18181b', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#27272a', alignItems: 'center' },
  notificationCardUnread: { backgroundColor: '#1f1f25', borderColor: '#38bdf8' },
  
  iconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  
  textContainer: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  title: { color: '#fff', fontSize: 15, fontWeight: 'bold', flex: 1, marginRight: 8 },
  time: { color: '#71717a', fontSize: 11, fontWeight: '600', marginTop: 2 },
  message: { color: '#a1a1aa', fontSize: 13, lineHeight: 18 },

  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#38bdf8', marginLeft: 12 },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyStateText: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 16 },
  emptyStateSub: { color: '#71717a', fontSize: 14, marginTop: 8 }
});
