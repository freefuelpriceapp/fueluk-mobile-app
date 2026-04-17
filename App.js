import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from './src/screens/HomeScreen';
import StationDetailScreen from './src/screens/StationDetailScreen';
import AlertsScreen from './src/screens/AlertsScreen';
import SearchScreen from './src/screens/SearchScreen';
import FavouritesScreen from './src/screens/FavouritesScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import MapScreen from './src/screens/MapScreen';
// DEFERRED: monetization — import PremiumScreen from './src/screens/PremiumScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1a1a2e' },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ title: 'FreeFuelPrice UK' }}
      />
      <Stack.Screen
        name="StationDetail"
        component={StationDetailScreen}
        options={{ title: 'Station Detail' }}
      />
    </Stack.Navigator>
  );
}

function FavouritesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1a1a2e' },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen
        name="FavouritesMain"
        component={FavouritesScreen}
        options={{ title: 'Favourites' }}
      />
      <Stack.Screen
        name="StationDetail"
        component={StationDetailScreen}
        options={{ title: 'Station Detail' }}
      />
    </Stack.Navigator>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1a1a2e' },
        headerTintColor: '#ffffff',
        tabBarStyle: { backgroundColor: '#1a1a2e' },
        tabBarActiveTintColor: '#2ECC71',
        tabBarInactiveTintColor: '#888',
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarLabel: 'Near Me',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="location-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarLabel: 'Map',
          headerShown: true,
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTintColor: '#ffffff',
          headerTitle: 'Fuel Map',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarLabel: 'Search',
          headerShown: true,
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTintColor: '#ffffff',
          headerTitle: 'Search Stations',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Favourites"
        component={FavouritesStack}
        options={{
          tabBarLabel: 'Saved',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{
          tabBarLabel: 'Alerts',
          headerShown: true,
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTintColor: '#ffffff',
          headerTitle: 'My Price Alerts',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          headerShown: true,
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTintColor: '#ffffff',
          headerTitle: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" color={color} size={size} />
          ),
        }}
      />
      {/* DEFERRED: monetization — Premium tab hidden for launch
      <Tab.Screen
        name="Premium"
        component={PremiumScreen}
        options={{
          tabBarLabel: 'Premium',
          headerShown: true,
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTintColor: '#ffffff',
          headerTitle: 'FreeFuelPrice Premium',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="star-outline" color={color} size={size} />
          ),
        }}
      />
            */}
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <TabNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
          }
