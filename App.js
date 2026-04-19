import 'react-native-gesture-handler';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
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
import { installCrashHandlers, logger } from './src/lib/logger';
// DEFERRED: monetization — import PremiumScreen from './src/screens/PremiumScreen';

// Install global crash handlers (uncaught JS errors + unhandled promise rejections)
// before any React tree is mounted. Safe to call multiple times — idempotent.
installCrashHandlers();

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// ─────────────────────────────────────────────────────────────────────────────
// ErrorBoundary
// Catches React render errors in the component tree below it and displays a
// friendly recovery screen instead of a blank crash. Logs the error via the
// app's structured logger.
// ─────────────────────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error?.message || 'An unexpected error occurred.' };
  }

  componentDidCatch(error, info) {
    try {
      logger.fatal('react_render_error', { componentStack: info?.componentStack?.slice(0, 500) }, error);
    } catch (_) {
      // Logger must never interfere with error boundary behaviour.
    }
  }

  handleReload = () => {
    this.setState({ hasError: false, errorMessage: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <Ionicons name="warning-outline" size={56} color="#F39C12" />
          <Text style={errorStyles.title}>Something went wrong</Text>
          <Text style={errorStyles.message}>
            {this.state.errorMessage}
          </Text>
          <Text style={errorStyles.hint}>
            If this keeps happening, try restarting the app.
          </Text>
          <TouchableOpacity style={errorStyles.btn} onPress={this.handleReload}>
            <Text style={errorStyles.btnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#E6EDF3',
    marginTop: 20,
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    color: '#8B949E',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 20,
  },
  hint: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
    marginBottom: 28,
  },
  btn: {
    backgroundColor: '#2ECC71',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
  },
  btnText: {
    color: '#0D1117',
    fontSize: 16,
    fontWeight: '700',
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Stack navigators
// ─────────────────────────────────────────────────────────────────────────────
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
    <ErrorBoundary>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <TabNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
