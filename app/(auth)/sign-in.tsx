// app/(auth)/sign-in.tsx
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { COLORS } from '../../src/lib/theme';

export default function SignInScreen() {
  
  // This is a placeholder function for now. 
  // Next, we will add the Better Auth logic here!
  const handleGoogleLogin = () => {
    Alert.alert("Connecting...", "We will wire this up to Better Auth next!");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        
        {/* Header Section */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>DLS HUB</Text>
          <Text style={styles.subtitle}>Secure your competitive edge.</Text>
        </View>

        {/* Login Section */}
        <View style={styles.loginContainer}>
          <TouchableOpacity 
            style={styles.googleButton} 
            activeOpacity={0.8}
            onPress={handleGoogleLogin}
          >
            <FontAwesome5 name="google" size={20} color="#000" />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          <Text style={styles.termsText}>
            By continuing, you agree to the DLS Hub Terms of Service and Privacy Policy.
          </Text>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between', // Spreads header to top, button to bottom
    padding: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  headerContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  loginContainer: {
    width: '100%',
    gap: 16, // Adds space between button and terms text
  },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.text, // White button for Google
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  googleButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  termsText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },
});
