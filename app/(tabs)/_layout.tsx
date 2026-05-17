import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { FontAwesome5, Ionicons, Foundation } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

// Use Google's Test ID for development
const bannerAdUnitId = __DEV__ ? TestIds.BANNER : 'ca-app-pub-xxxxxxxxxxxxxxxx/zzzzzzzzzz';

export default function TabLayout() {
  const insets = useSafeAreaInsets(); 
  
  // Calculate the height of your tab bar to position the ad perfectly above it
  const tabBarHeight = 65 + insets.bottom;

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#121212',
            borderTopColor: '#222',
            height: tabBarHeight, 
            paddingBottom: 8 + insets.bottom, 
            paddingTop: 8,
          },
          tabBarActiveTintColor: '#3b82f6', 
          tabBarInactiveTintColor: '#888',
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            marginTop: 4,
          }
        }}>
        
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <Foundation name="home" size={26} color={color} />,
          }}
        />

        <Tabs.Screen
          name="tournaments"
          options={{
            title: 'Tournaments',
            tabBarIcon: ({ color }) => <Ionicons name="trophy-outline" size={24} color={color} />,
          }}
        />

        <Tabs.Screen
          name="stats"
          options={{
            title: 'Stats',
            tabBarIcon: ({ color }) => <Ionicons name="bar-chart-outline" size={24} color={color} />,
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <FontAwesome5 name="user" size={22} color={color} />,
          }}
        />
      </Tabs>

      {/* ✅ GLOBAL BANNER AD: Anchored permanently above the Tab Bar */}
      <View style={[styles.adContainer, { bottom: tabBarHeight }]}>
        <BannerAd
          unitId={bannerAdUnitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: true,
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0f0f13',
  },
  adContainer: {
    position: 'absolute',
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#0f0f13',
    borderTopWidth: 1,
    borderTopColor: '#1f1f25',
  }
});
