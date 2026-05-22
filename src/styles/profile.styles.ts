import { StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const styles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: '#0f0f13', justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#0f0f13' },
  scrollContent: { padding: 20, gap: 20 },
  
  headerSection: { marginBottom: 8 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  pageTitle: { color: '#93c5fd', fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  ticketPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#272730', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 6 },
  ticketText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  
  userInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#18181b', borderWidth: 2, borderColor: '#22d3ee', justifyContent: 'center', alignItems: 'center' },
  userInfoText: { flex: 1 },
  userName: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 2 },
  userEmail: { color: '#a1a1aa', fontSize: 14 },

  card: { backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 16, padding: 20 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  cardDesc: { color: '#a1a1aa', fontSize: 14, lineHeight: 20, marginBottom: 16 },
  
  input: { backgroundColor: '#1f1f25', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 16, color: '#fff', fontSize: 16, marginBottom: 16, textAlign: 'center', letterSpacing: 2, fontWeight: '600' },
  primaryButton: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
  helpLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, paddingVertical: 8 },
  helpText: { color: '#38bdf8', fontSize: 13, fontWeight: '600' },
  
  verifiedBox: { backgroundColor: '#111827', padding: 20, borderRadius: 12, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: '#1f2937' },
  teamName: { color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 4 },
  verifiedSub: { color: '#10b981', fontSize: 13, fontWeight: '500' },

  badgeScroll: { paddingTop: 10, gap: 12 },
  badgeBox: { backgroundColor: '#222225', padding: 16, borderRadius: 12, alignItems: 'center', width: 110, borderWidth: 1, borderColor: '#333' },
  badgeName: { color: '#fff', fontSize: 11, fontWeight: 'bold', marginTop: 8, textAlign: 'center' },
  badgeCount: { color: '#f59e0b', fontSize: 12, fontWeight: '900', marginTop: 4 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', paddingTop: 50 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  closeBtn: { padding: 4 },
  slideContainer: { width: SCREEN_WIDTH, alignItems: 'center', paddingHorizontal: 20 },
  slideImage: { width: '100%', height: '65%', borderRadius: 12, marginBottom: 24 },
  slideText: { color: '#d4d4d8', fontSize: 15, lineHeight: 24, textAlign: 'center', paddingHorizontal: 10 },
  paginationRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingBottom: 40 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#52525b' },
  activeDot: { width: 20, backgroundColor: '#f59e0b' }
});
