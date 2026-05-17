import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign, FontAwesome5 } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { authClient } from '../../src/lib/auth-client';
import { COLORS } from '../../src/lib/theme';
import { useAuth } from '../../src/context/AuthContext';

GoogleSignin.configure({
  webClientId: '256697627531-9juh3gitime8f2jpnd88d0hm1p0nvv22.apps.googleusercontent.com',
});

export default function SignInScreen() {
  const { refetch } = useAuth();

  const handleAuthLogin = async (provider: 'Apple' | 'Google') => {
    if (provider === 'Apple') {
      Alert.alert("Coming Soon", "Apple Auth will be enabled when we do the iOS cloud build!");
      return;
    }

    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      if (response.type === 'success') {
        if (response.data.idToken) {
          const { data, error } = await authClient.signIn.social({
            provider: "google",
            idToken: {
              token: response.data.idToken, 
            },
          });

          if (error) {
            Alert.alert("Backend Error", error.message);
          } else {
            console.log("[SIGN IN] Backend accepted token. Forcing refetch...");
            
            const refetchResult = await refetch();
            
            console.log("[SIGN IN] Refetch complete. Result:", refetchResult);

            Alert.alert(
              "Debug Monitor", 
              `Session Data: ${refetchResult?.data ? 'EXISTS' : 'NULL'}\nCheck VS Code terminal for full logs.`
            );
          }

        } else {
          Alert.alert("Error", "Google did not return an ID token.");
        }
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert("Login Failed", "Could not complete native Google sign in.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.mainStack}>
          <View style={styles.headerContainer}>
            <View style={styles.iconCircle}>
              <View style={styles.iconGlow} />
              <FontAwesome5 name="gamepad" size={40} color={COLORS.text} style={styles.controllerIcon} />
            </View>
            <Text style={styles.title}>GAME CLASH</Text>
            <Text style={styles.subtitle}>Secure your competitive edge.</Text>
          </View>

          <View style={styles.buttonStack}>
            <TouchableOpacity 
              style={styles.authButton} 
              activeOpacity={0.7}
              onPress={() => handleAuthLogin('Apple')}
            >
              <AntDesign name="apple" size={20} color={COLORS.text} style={styles.buttonIcon} />
              <Text style={styles.authButtonText}>Sign in with Apple</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.authButton} 
              activeOpacity={0.7}
              onPress={() => handleAuthLogin('Google')}
            >
              <FontAwesome5 name="google" size={18} color="#ffffff" style={styles.buttonIcon} />
              <Text style={styles.authButtonText}>Sign in with Google</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.termsText}>Terms of Service</Text>
          <Text style={styles.footerDot}>•</Text>
          <Text style={styles.termsText}>Privacy Policy</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, justifyContent: 'center', padding: 32, position: 'relative' },
  mainStack: { alignItems: 'center', gap: 60 },
  headerContainer: { alignItems: 'center' },
  iconCircle: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', position: 'relative', marginBottom: 24 },
  iconGlow: { ...StyleSheet.absoluteFillObject, borderRadius: 50, borderWidth: 1.5, borderColor: COLORS.primary, opacity: 0.6 },
  controllerIcon: { opacity: 0.9 },
  title: { fontSize: 48, fontWeight: '900', color: COLORS.text, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: COLORS.textMuted, fontWeight: '500', textAlign: 'center' },
  buttonStack: { width: '100%', gap: 16 },
  authButton: { flexDirection: 'row', backgroundColor: COLORS.buttonBackground, paddingVertical: 18, paddingHorizontal: 24, borderRadius: 16, alignItems: 'center', justifyContent: 'center', position: 'relative', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  buttonIcon: { position: 'absolute', left: 24 },
  authButtonText: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  footer: { position: 'absolute', bottom: 30, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  termsText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
  footerDot: { fontSize: 12, color: COLORS.textMuted, marginTop: -2 },
});
