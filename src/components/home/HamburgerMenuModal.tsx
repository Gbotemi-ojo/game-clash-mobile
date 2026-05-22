import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { authClient } from '../../lib/auth-client';

export default function HamburgerMenuModal({ isVisible, onClose }: { isVisible: boolean, onClose: () => void }) {
  
  // ✅ If not visible, render nothing. This acts as our pure JS modal.
  if (!isVisible) return null;

  const handleSignOut = async () => {
    try {
      await GoogleSignin.signOut();
      await authClient.signOut();
      onClose();
      // The global auth listener in your _layout will automatically detect the sign out and redirect to login!
    } catch (error: any) {
      Alert.alert("Sign Out Error", error.message || "Failed to sign out.");
    }
  };

  return (
    <View style={styles.absoluteWrapper}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        
        {/* ✅ activeOpacity={1} prevents clicks inside the menu from closing the overlay */}
        <TouchableOpacity activeOpacity={1} style={styles.menuBox}>
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
        </TouchableOpacity>

      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // ✅ This forces the wrapper to securely cover the entire screen no matter what
  absoluteWrapper: {
    position: 'absolute',
    top: 0, 
    bottom: 0, 
    left: 0, 
    right: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.6)', 
    justifyContent: 'flex-start', 
    alignItems: 'flex-start' 
  },
  menuBox: { 
    backgroundColor: '#18181b', 
    width: 250, 
    marginTop: 60, 
    marginLeft: 20, 
    borderRadius: 16, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: '#27272a', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 10 }, 
    shadowOpacity: 0.5, 
    shadowRadius: 20, 
    elevation: 10 
  },
  menuHeader: { 
    color: '#71717a', 
    fontSize: 12, 
    fontWeight: 'bold', 
    textTransform: 'uppercase', 
    marginBottom: 12, 
    marginLeft: 4, 
    letterSpacing: 1 
  },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 12, 
    paddingHorizontal: 4, 
    gap: 12 
  },
  menuItemText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '600' 
  },
  menuDivider: { 
    height: 1, 
    backgroundColor: '#27272a', 
    marginVertical: 8 
  }
});
