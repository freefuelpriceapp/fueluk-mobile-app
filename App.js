import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: '#1a1a2e' },
            headerTintColor: '#ffffff',
            tabBarStyle: { backgroundColor: '#1a1a2e' },
            tabBarActiveTintColor: '#4CAF50',
            tabBarInactiveTintColor: '#888888',
          }}
        >
          <Tab.Screen
            name="Nearby"
            component={HomeScreen}
            options={{ title: 'Nearby Stations' }}
          />
          <Tab.Screen
            name="Search"
            component={SearchScreen}
            options={{ title: 'Search Stations' }}
          />
        </Tab.Navigator>
      </NavigationContainer>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
