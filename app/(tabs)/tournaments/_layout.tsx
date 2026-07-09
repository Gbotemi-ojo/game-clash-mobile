import { withLayoutContext } from 'expo-router';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';

const { Navigator } = createMaterialTopTabNavigator();
export const MaterialTopTabs = withLayoutContext(Navigator);

export default function ArenaLayout() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <MaterialTopTabs
        screenOptions={{
          // Container styling
          tabBarStyle: { 
            backgroundColor: '#0f0f13', 
            elevation: 0,               // Removes Android drop shadow
            shadowOpacity: 0,           // Removes iOS drop shadow
            borderBottomWidth: 1, 
            borderBottomColor: '#1f1f25' // Clean subtle divider line
          },
          // The sliding accent bar
          tabBarIndicatorStyle: { 
            backgroundColor: '#38bdf8', 
            height: 3, 
            borderTopLeftRadius: 3, 
            borderTopRightRadius: 3 
          },
          // Typography
          tabBarLabelStyle: { 
            fontWeight: '900', 
            fontSize: 13, 
            letterSpacing: 0.5 
          },
          // Colors
          tabBarActiveTintColor: '#38bdf8',
          tabBarInactiveTintColor: '#52525b', // Darker gray so the active tab pops
          tabBarPressColor: 'rgba(56, 189, 248, 0.1)', // Blue ripple on tap
        }}
      >
        <MaterialTopTabs.Screen name="index" options={{ title: 'League' }} />
        <MaterialTopTabs.Screen name="cups" options={{ title: 'Cups' }} />
        <MaterialTopTabs.Screen name="custom" options={{ title: 'Custom' }} />
      </MaterialTopTabs>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f0f13', // Matches tab bar to hide the notch perfectly
  }
});
