import 'react-native-gesture-handler';
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
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
import VehicleSettingsScreen from './src/screens/VehicleSettingsScreen';
import LocationPermissionScreen from './src/screens/LocationPermissionScreen';
import { FEATURES } from './src/lib/featureFlags';
import { FEATURE_FLAGS } from './src/config/featureFlags';
import { installCrashHandlers, logger } from './src/lib/logger';
import { initNotifications, registerNotificationResponseHandler } from './src/lib/notifications';
import { COLORS } from './src/lib/theme';

const LOCATION_PERMISSION_SHOWN_KEY = 'location_permission_shown';
// Bumping this forces a one-shot purge of AsyncStorage caches that might hold
// the legacy brand-enrichment shape ({ name, count }) from the pre-hardening
// API. Each bump wipes `cached_nearby_stations` and normalises `user_favourites`.
const CACHE_VERSION = 2;
const CACHE_VERSION_KEY = 'cache_schema_version';
const STATIONS_CACHE_KEY = 'cached_nearby_stations';
const FAVOURITES_KEY = 'user_favourites';

async function runCacheMigration() {
  try {
    const stored = await AsyncStorage.getItem(CACHE_VERSION_KEY);
    const version = stored ? parseInt(stored, 10) : 0;
    if (version >= CACHE_VERSION) return;
    // Purge stations cache — it's re-fetched on launch anyway.
    try { await AsyncStorage.removeItem(STATIONS_CACHE_KEY); } catch (_) {}
    // Normalise favourites — strip any brand/name object shape left behind.
    try {
      const favsRaw = await AsyncStorage.getItem(FAVOURITES_KEY);
      if (favsRaw) {
        const parsed = JSON.parse(favsRaw);
        if (Array.isArray(parsed)) {
          const cleaned = parsed
            .filter((s) => s && typeof s === 'object' && s.id != null)
            .map((s) => {
              const brand = s.brand;
              const name = s.name;
              return {
                ...s,
                brand: typeof brand === 'string'
                  ? brand
                  : (brand && typeof brand === 'object' && typeof brand.name === 'string' ? brand.name : ''),
                name: typeof name === 'string'
                  ? name
                  : (name && typeof name === 'object' && typeof name.name === 'string' ? name.name : ''),
              };
            });
          await AsyncStorage.setItem(FAVOURITES_KEY, JSON.stringify(cleaned));
        }
      }
    } catch (_) {}
    try { await AsyncStorage.setItem(CACHE_VERSION_KEY, String(CACHE_VERSION)); } catch (_) {}
  } catch (_) {
    // Migration failures must never crash app startup.
  }
}

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
// Truncate + trim the first N frames of a component stack so we can render
// it on the error screen without blowing up the layout. Always returns a
// string — never an object or nullish.
function extractComponentStackLines(stack, maxLines = 6) {
  if (!stack || typeof stack !== 'string') return '';
  const lines = stack.split('\n').map((l) => l.trim()).filter(Boolean);
  return lines.slice(0, maxLines).join('\n');
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      errorName: null,
      errorMessage: null,
      componentStackTop: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorName: error?.name || 'Error',
      errorMessage: error?.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error, info) {
    const rawStack = info?.componentStack || '';
    const componentStackTop = extractComponentStackLines(rawStack, 6);
    // Update state so the stack is visible on the error screen itself. Do this
    // even in production — we're shipping OTA to a user-side APK and need
    // the stack rendered so screenshots tell us what crashed.
    this.setState({ componentStackTop });
    try {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary] render crash',
        error?.name,
        error?.message,
        '\nerror.stack:', error?.stack,
        '\ncomponentStack:', rawStack,
      );
    } catch (_) {}
    try {
      logger.fatal(
        'react_render_error',
        {
          errorName: error?.name,
          componentStack: rawStack.slice(0, 1200),
          stack: typeof error?.stack === 'string' ? error.stack.slice(0, 1200) : undefined,
        },
        error
      );
    } catch (_) {}
  }

  handleReload = () => {
    this.setState({ hasError: false, errorName: null, errorMessage: null, componentStackTop: null });
  };

  render() {
    if (this.state.hasError) {
      const { errorName, errorMessage, componentStackTop } = this.state;
      return (
        <View style={errorStyles.container}>
          <Ionicons name="warning-outline" size={56} color={COLORS.warning} />
          <Text style={errorStyles.title}>Something went wrong</Text>
          {errorName ? (
            <Text style={errorStyles.errorType}>{String(errorName)}</Text>
          ) : null}
          <Text style={errorStyles.message}>
            {String(errorMessage || '')}
          </Text>
          {componentStackTop ? (
            <ScrollView
              style={errorStyles.stackBox}
              contentContainerStyle={errorStyles.stackBoxContent}
            >
              <Text style={errorStyles.stackText} selectable>
                {String(componentStackTop)}
              </Text>
            </ScrollView>
          ) : null}
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
  errorType: {
    fontSize: 12,
    color: COLORS.warning,
    textAlign: 'center',
    marginBottom: 6,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  message: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 20,
  },
  stackBox: {
    alignSelf: 'stretch',
    maxHeight: 140,
    marginTop: 10,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  stackBoxContent: {
    padding: 10,
  },
  stackText: {
    fontSize: 11,
    lineHeight: 15,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
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
        options={{ title: 'FuelUK' }}
      />
      <Stack.Screen
        name="StationDetail"
        component={StationDetailScreen}
        options={{ title: 'Station Detail' }}
      />
      {FEATURE_FLAGS.vehicleSettings && (
        <Stack.Screen
          name="VehicleSettings"
          component={VehicleSettingsScreen}
          options={{ title: 'Your Vehicle' }}
        />
      )}
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
      {FEATURE_FLAGS.vehicleSettings && (
        <Stack.Screen
          name="VehicleSettings"
          component={VehicleSettingsScreen}
          options={{ title: 'Your Vehicle' }}
        />
      )}
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
      // Run cache migration before any screen reads AsyncStorage so stale
      // object-shaped brand/name values can't leak into render.
      await runCacheMigration();
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
