/**
 * LicencePlateChip.js
 *
 * Compact inline UK rear-plate chip — sits inside the sort row to the right
 * of the Nearest/Cheapest buttons. Height matches the sort pill (~32px).
 * Width hugs content (~88–110px).
 *
 * Registered state  → bold uppercase reg in yellow plate styling
 * Unregistered state → "+ ADD" in the same styling
 *
 * Tap → opens VehicleSettings via the onPress callback.
 *
 * Props:
 *   userVehicle  {object|null}  Saved vehicle object (or null if none).
 *   onPress      {function}     Called on tap.
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';

// Official UK rear plate yellow
const PLATE_YELLOW = '#FFD400';
const PLATE_BLACK  = '#000000';

export default function LicencePlateChip({ userVehicle, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 30,
      bounciness: 0,
    }).start();
  }

  function handlePressOut() {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 2,
    }).start();
  }

  const hasVehicle = !!userVehicle;
  const regText = hasVehicle
    ? String(userVehicle.reg || '').toUpperCase()
    : null;

  const plateLabel = hasVehicle ? regText : '+ ADD';
  const a11yLabel = hasVehicle
    ? `Licence plate ${regText}. Tap to edit vehicle.`
    : 'Add your licence plate';

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel={a11yLabel}
        accessibilityRole="button"
        activeOpacity={1}
        testID="licence-plate-chip"
      >
        <View style={styles.plate}>
          <Text style={styles.plateText} numberOfLines={1}>
            {plateLabel}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  plate: {
    backgroundColor: PLATE_YELLOW,
    borderWidth: 2,
    borderColor: PLATE_BLACK,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
    height: 32,
  },
  plateText: {
    color: PLATE_BLACK,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
    includeFontPadding: false,
  },
});
