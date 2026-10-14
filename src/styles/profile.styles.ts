import { StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const styles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: '#09090b', justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#09090b' },
  scrollContent: { padding: 18, paddingBottom: 36, gap: 17 },
  
  headerSection: { marginBottom: 8 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  pageTitle: { color: '#f4f4f5', fontSize: 18, fontWeight: '900', letterSpacing: 1.3 },
  ticketPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245,158,11,0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 13, gap: 7, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)' },
  ticketText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  
  userInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 15, backgroundColor: '#14151b', padding: 15, borderRadius: 19, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  avatarFrame: { width: 70, height: 70, borderRadius: 24, backgroundColor: 'rgba(34,211,238,0.1)', borderWidth: 2, borderColor: '#22d3ee', alignItems: 'center', justifyContent: 'center', shadowColor: '#22d3ee', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 9, elevation: 5, position: 'relative' },
  avatarCircle: { width: 58, height: 58, borderRadius: 19, backgroundColor: '#0d1118', justifyContent: 'center', alignItems: 'center' },
  rankPlate: { position: 'absolute', bottom: -9, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#22d3ee', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, borderWidth: 2, borderColor: '#14151b' },
  rankPlateText: { color: '#071115', fontSize: 7, fontWeight: '900', letterSpacing: 0.4 },
  profileMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  userInfoText: { flex: 1 },
  userName: { color: '#fafafa', fontSize: 18, fontWeight: '900', marginBottom: 1, letterSpacing: 0.1 },
  userEmail: { color: '#a1a1aa', fontSize: 11, flexShrink: 1 },

  card: { backgroundColor: '#14151b', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 17, padding: 17 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  cardDesc: { color: '#a1a1aa', fontSize: 14, lineHeight: 20, marginBottom: 16 },
  
  input: { backgroundColor: '#1a1b22', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16, marginBottom: 16, textAlign: 'center', letterSpacing: 2, fontWeight: '700' },
  primaryButton: { paddingVertical: 16, borderRadius: 13, alignItems: 'center', justifyContent: 'center', shadowColor: '#22d3ee', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  primaryButtonText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
  helpLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, paddingVertical: 8 },
  helpText: { color: '#38bdf8', fontSize: 13, fontWeight: '600' },
  
  verifiedBox: { backgroundColor: 'rgba(16,185,129,0.07)', padding: 18, borderRadius: 13, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: 'rgba(16,185,129,0.18)' },
  teamName: { color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 4 },
  verifiedSub: { color: '#10b981', fontSize: 13, fontWeight: '500' },

  badgeScroll: { paddingTop: 10, gap: 12 },
  badgeBox: { backgroundColor: '#1a1b22', padding: 16, borderRadius: 14, alignItems: 'center', width: 110, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)' },
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
  activeDot: { width: 20, backgroundColor: '#f59e0b' },
  // Add these inside your existing StyleSheet.create({ ... })
  statsGrid: {
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 10,
    justifyContent: 'space-between', 
    marginTop: 16 
  },
  statSquare: {
    width: '48%',
    minHeight: 112,
    backgroundColor: '#1a1b22',
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 15,
    padding: 13,
    alignItems: 'flex-start',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: { marginBottom: 9 },
  statLabel: {
    color: '#a1a1aa',
    fontSize: 9,
    fontWeight: '900',
    marginBottom: 5,
    textTransform: 'uppercase', 
    letterSpacing: 1 
  },
  statValue: {
    color: '#fff',
    fontSize: 27,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
});

