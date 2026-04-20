import 'react-native-gesture-handler';
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HomeScreen from './src/screens/HomeScreen';
import StationDetailScreen from './src/screens/StationDetailScreen';
import AlertsScreen from './src/screens/AlertsScreen';
import SearchScreen from './src/screens/SearchScreen';
import FavouritesScreen from './src/screens/FavouritesScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import MapScreen from './src/screens/MapScreen';
import TripCalculatorScreen from './src/screens/TripCalculatorScreen';
import MoreScreen from './src/screens/MoreScreen';
import VehicleCheckScreen from './src/screens/VehicleCheckScreen';
import LocationPermissionScreen from './src/screens/LocationPermissionScreen';
import { FEATURES } from './src/lib/featureFlags';
import { installCrashHandlers, logger } from './src/lib/logger';
import { initNotifications, registerNotificationResponseHandler } from './src/lib/notifications';
import { COLORS } from './src/lib/theme';

const LOCATION_PERMISSION_SHOWN_KEY = 'location_permission_shown';

// Install global crash handlers (uncaught JS errors + unhandled promise rejections)
// before any React tree is mounted. Safe to call multiple times — idempotent.
installCrashHandlers();

// Configure notification handler (foreground display) and Android channel.
// Handler is registered at module import; channel setup is async and kicked
// off here so it's ready before any alert is scheduled.
initNotifications();

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// ─────────────────────────────────────────────────────────────────────────────
// ErrorBoundary
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
    } catch (_) {}
  }

  handleReload = () => {
    this.setState({ hasError: false, errorMessage: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <Ionicons name="warning-outline" size={56} color={COLORS.warning} />
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
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 20,
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 20,
  },
  hint: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 28,
  },
  btn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
  },
  btnText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '700',
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Stack navigators
// ─────────────────────────────────────────────────────────────────────────────
const stackHeader = {
  headerStyle: { backgroundColor: COLORS.surfaceAlt },
  headerTintColor: COLORS.white,
  headerTitleStyle: { fontWeight: '700' },
};

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={stackHeader}>
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
    <Stack.Navigator screenOptions={stackHeader}>
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

function MoreStack() {
  return (
    <Stack.Navigator screenOptions={stackHeader}>
      <Stack.Screen
        name="MoreMain"
        component={MoreScreen}
        options={{ title: 'More' }}
      />
      {FEATURES.tripCalculator && (
        <Stack.Screen
          name="TripCalculator"
          component={TripCalculatorScreen}
          options={{ title: 'Trip Calculator' }}
        />
      )}
      <Stack.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{ title: 'My Price Alerts' }}
      />
      <Stack.Screen
        name="VehicleCheck"
        component={VehicleCheckScreen}
        options={{ title: 'Vehicle Check' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Stack.Navigator>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.surfaceAlt },
        headerTintColor: COLORS.white,
        tabBarStyle: { backgroundColor: COLORS.surfaceAlt },
        tabBarActiveTintColor: COLORS.accent,
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
          headerStyle: { backgroundColor: COLORS.surfaceAlt },
          headerTintColor: COLORS.white,
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
          headerStyle: { backgroundColor: COLORS.surfaceAlt },
          headerTintColor: COLORS.white,
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
        name="More"
        component={MoreStack}
        options={{
          tabBarLabel: 'More',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ellipsis-horizontal" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [permissionGateChecked, setPermissionGateChecked] = useState(false);
  const [showPermissionGate, setShowPermissionGate] = useState(false);
  const navigationRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const flag = await AsyncStorage.getItem(LOCATION_PERMISSION_SHOWN_KEY);
        setShowPermissionGate(!flag);
      } catch (_e) {
        setShowPermissionGate(false);
      } finally {
        setPermissionGateChecked(true);
      }
    })();
  }, []);

  useEffect(() => {
    const unsubscribe = registerNotificationResponseHandler(navigationRef);
    return unsubscribe;
  }, []);

  const dismissPermissionGate = async () => {
    try {
      await AsyncStorage.setItem(LOCATION_PERMISSION_SHOWN_KEY, '1');
    } catch (_e) {}
    setShowPermissionGate(false);
  };

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="light" />
        {permissionGateChecked && showPermissionGate ? (
          <LocationPermissionScreen
            onGranted={dismissPermissionGate}
            onSkip={dismissPermissionGate}
          />
        ) : permissionGateChecked ? (
          <NavigationContainer ref={navigationRef}>
            <TabNavigator />
          </NavigationContainer>
        ) : null}
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
