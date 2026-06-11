/**
 * LicencePlateChip.js
 *
 * Compact inline UK rear-plate chip — sits inside the sort row to the right
 * of the Nearest/Cheapest buttons. Proportioned like a real UK plate (≈3.4:1
 * aspect ratio, not a square chip), so the eye registers "licence plate"
 * instantly rather than "yellow button".
 *
 * Registered state    → bold uppercase reg (e.g. "NJ69 DDF") in plate styling
 * Unregistered state  → semi-transparent placeholder "YOUR REG" so users know
 *                       this is something they can populate by tapping
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
  Platform,
} from 'react-native';

// Re-export the formatter so existing call sites that import it from this
// module keep working. The implementation lives in src/lib/formatUKReg.js
// so it can be unit-tested without a JSX-aware Babel config.
import { formatUKReg } from '../lib/formatUKReg';
export { formatUKReg };

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

  const hasVehicle = !!(userVehicle && userVehicle.reg);
  const displayReg = hasVehicle ? formatUKReg(userVehicle.reg) : 'YOUR REG';

  const a11yLabel = hasVehicle
    ? `Licence plate ${displayReg}. Tap to edit vehicle.`
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
          <Text
            style={[styles.plateText, !hasVehicle && styles.plateTextPlaceholder]}
            numberOfLines={1}
            allowFontScaling={false}
            testID="licence-plate-text"
          >
            {displayReg}
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
    borderRadius: 4,
    // Plate proportions ~3.4:1 (real UK rear plate is 520×111 mm = 4.7:1; we
    // compress slightly so it sits comfortably alongside the sort pills).
    width: 108,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  plateText: {
    color: PLATE_BLACK,
    // Charles Wright is the official DVLA mandatory plate typeface. It is
    // protected and not safely bundled, so we approximate with the heaviest
    // available system condensed sans + tight letter-spacing. Reads as
    // "plate-like" without infringing the typeface licence.
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    includeFontPadding: false,
    ...Platform.select({
      ios: { fontFamily: 'Helvetica' },
      android: { fontFamily: 'sans-serif-condensed' },
      default: {},
    }),
  },
  plateTextPlaceholder: {
    // Semi-transparent so users perceive it as a hint, not a value
    opacity: 0.45,
    // Slightly smaller for the longer "YOUR REG" placeholder so it fits
    // comfortably without truncation on smaller plates
    fontSize: 15,
    letterSpacing: 1.2,
  },
});
