import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { BACKEND_URL } from '../src/lib/auth-client';
import { useAuth } from '../src/context/AuthContext';

export default function WithdrawalScreen() {
  const router = useRouter();
  const { session } = useAuth();
  
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'USDT' | 'GIFTCARD'>('USDT');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleWithdraw = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) < 5) {
      return Alert.alert('Invalid Amount', 'Minimum withdrawal is $5');
    }
    if (!address.trim()) {
      return Alert.alert('Missing Info', method === 'USDT' ? 'Enter your USDT wallet address' : 'Enter your delivery email');
    }

    setIsSubmitting(true);
    try {
      const payload = {
        amount: Number(amount),
        method,
        ...(method === 'USDT' ? { walletAddress: address } : { deliveryEmail: address })
      };
      
      const response = await fetch(`${BACKEND_URL}/api/v1/withdrawals/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process request');
      }

      Alert.alert('Success', 'Your withdrawal request has been submitted and is pending review.');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        
        {/* Custom Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color="#93c5fd" />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>WITHDRAW FUNDS</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceAmount}>${session?.user?.wallet?.tokens || 0}</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.sectionTitle}>Withdrawal Amount ($)</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor="#71717a"
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
              />
            </View>

            <Text style={styles.sectionTitle}>Payout Method</Text>
            <View style={styles.methodContainer}>
              <TouchableOpacity 
                style={[styles.methodCard, method === 'USDT' && styles.methodCardActive]}
                onPress={() => setMethod('USDT')}
              >
                <FontAwesome5 name="bitcoin" size={24} color={method === 'USDT' ? '#f59e0b' : '#a1a1aa'} />
                <Text style={[styles.methodText, method === 'USDT' && styles.methodTextActive]}>Crypto (USDT)</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.methodCard, method === 'GIFTCARD' && styles.methodCardActive]}
                onPress={() => setMethod('GIFTCARD')}
              >
                <Ionicons name="card-outline" size={28} color={method === 'GIFTCARD' ? '#f59e0b' : '#a1a1aa'} />
                <Text style={[styles.methodText, method === 'GIFTCARD' && styles.methodTextActive]}>Gift Card</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.detailsWrapper}>
              <Text style={styles.inputLabel}>
                {method === 'USDT' ? 'USDT (TRC20) Address' : 'Delivery Email Address'}
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder={method === 'USDT' ? 'Enter wallet address' : 'name@example.com'}
                placeholderTextColor="#71717a"
                value={address}
                onChangeText={setAddress}
                autoCapitalize="none"
                keyboardType={method === 'GIFTCARD' ? 'email-address' : 'default'}
              />
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleWithdraw} disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Request Withdrawal</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f13' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f1f25' },
  backBtn: { padding: 8 },
  pageTitle: { color: '#93c5fd', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  balanceCard: { backgroundColor: '#18181b', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#27272a', marginBottom: 24 },
  balanceLabel: { color: '#a1a1aa', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  balanceAmount: { color: '#fff', fontSize: 40, fontWeight: '900', letterSpacing: 1 },
  form: { flex: 1 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  methodContainer: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  methodCard: { flex: 1, backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 12, padding: 20, alignItems: 'center', gap: 12 },
  methodCardActive: { borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.05)' },
  methodText: { color: '#a1a1aa', fontSize: 14, fontWeight: '600' },
  methodTextActive: { color: '#f59e0b' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 12, paddingHorizontal: 16, marginBottom: 24 },
  currencySymbol: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginRight: 8 },
  amountInput: { flex: 1, color: '#fff', fontSize: 24, fontWeight: 'bold', paddingVertical: 16 },
  detailsWrapper: { gap: 16, marginBottom: 32 },
  inputLabel: { color: '#a1a1aa', fontSize: 13, fontWeight: '600', marginBottom: -8 },
  textInput: { backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 12, color: '#fff', fontSize: 15, padding: 16 },
  submitBtn: { backgroundColor: '#3b82f6', paddingVertical: 18, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 }
});
