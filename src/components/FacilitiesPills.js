import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * FacilitiesPills
 *
 * Compact, pure-presentational row of facility tags for a station
 * (e.g. "24h", "Card", "Contactless", "Toilets").
 *
 * Props:
 *   facilities - array of strings OR object map { key: boolean }
 *   max        - optional cap on rendered pills (default 4)
 *
 * Behaviour:
 *   - Safely handles null/undefined/non-array/non-object input.
 *   - De-duplicates and trims labels.
 *   - Renders nothing if no valid pills resolve.
 */

const LABEL_MAP = {
  twenty_four_hour: '24h',
  h24: '24h',
  open_24h: '24h',
  card: 'Card',
  cards: 'Card',
  contactless: 'Contactless',
  toilets: 'Toilets',
  toilet: 'Toilets',
  shop: 'Shop',
  carwash: 'Car wash',
  car_wash: 'Car wash',
  jetwash: 'Jet wash',
  hgv: 'HGV',
  ev: 'EV charging',
  ev_charging: 'EV charging',
  air: 'Air',
  lpg: 'LPG',
  adblue: 'AdBlue',
};

function normalise(raw) {
  if (raw == null) return [];
  let entries = [];
  if (Array.isArray(raw)) {
    entries = raw;
  } else if (typeof raw === 'object') {
    entries = Object.keys(raw).filter((k) => !!raw[k]);
  } else {
    return [];
  }
  const out = [];
  const seen = new Set();
  for (const e of entries) {
    if (typeof e !== 'string') continue;
    const key = e.trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (!key) continue;
    const label = LABEL_MAP[key] || (e.trim().charAt(0).toUpperCase() + e.trim().slice(1));
    if (seen.has(label)) continue;
    seen.add(label);
    out.push(label);
  }
  return out;
}

export default function FacilitiesPills({ facilities, max = 4 }) {
  const pills = normalise(facilities).slice(0, Math.max(0, max));
  if (!pills.length) return null;
  return (
    <View style={styles.row} accessibilityLabel="Station facilities">
      {pills.map((label) => (
        <View key={label} style={styles.pill}>
          <Text style={styles.pillText} numberOfLines={1}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  pill: {
    backgroundColor: '#2ECC7120',
    borderColor: '#2ECC7144',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 6,
    marginBottom: 4,
  },
  pillText: {
    color: '#F5F7FA',
    fontSize: 11,
    fontWeight: '600',
  },
});

