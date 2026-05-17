import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { authClient } from '../../lib/auth-client';
import { useAuth } from '../../context/AuthContext';

export default function HamburgerMenuModal({ isVisible, onClose }: { isVisible: boolean, onClose: () => void }) {
  const { refetch } = useAuth();

  const handleSignOut = async () => {
    try {
      await GoogleSignin.signOut();
      await authClient.signOut();
      onClose();
      await refetch();
    } catch (error: any) {
      Alert.alert("Sign Out Error", error.message || "Failed to sign out.");
    }
  };

  return (
    <Modal animationType="fade" transparent={true} visible={isVisible} onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.menuBox}>
          <Text style={styles.menuHeader}>Menu</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="settings-outline" size={22} color="#fff" />
            <Text style={styles.menuItemText}>Settings</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="help-circle-outline" size={22} color="#fff" />
            <Text style={styles.menuItemText}>Support</Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={22} color="#ef4444" />
            <Text style={[styles.menuItemText, { color: '#ef4444' }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'flex-start', alignItems: 'flex-start' },
  menuBox: { backgroundColor: '#18181b', width: 250, marginTop: 60, marginLeft: 20, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#27272a', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 },
  menuHeader: { color: '#71717a', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, paddingLeft: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8, gap: 12 },
  menuItemText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  menuDivider: { height: 1, backgroundColor: '#27272a', marginVertical: 8 },
});
