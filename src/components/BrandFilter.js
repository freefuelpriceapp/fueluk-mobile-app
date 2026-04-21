import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { getBrands } from '../api/fuelApi';
import { brandToString } from '../lib/brand';

const BRAND_COLORS = {
  Shell: '#FFD500',
  BP: '#009900',
  Esso: '#CC0000',
  Tesco: '#00539F',
  Sainsburys: '#F06C00',
  Morrisons: '#007A3D',
  Asda: '#78BE20',
  Texaco: '#E31937',
};

const brandName = brandToString;

export default function BrandFilter({ selectedBrand, onSelectBrand }) {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getBrands();
        if (!mounted) return;
        const raw = Array.isArray(res) ? res : res && res.brands;
        if (Array.isArray(raw)) {
          const names = raw
            .map(brandName)
            .filter((n) => typeof n === 'string' && n.length > 0);
          setBrands(names);
        }
      } catch (e) {
        console.warn('BrandFilter fetch error:', e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#00B4D8" />
      </View>
    );
  }

  if (!brands.length) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Filter by brand</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <TouchableOpacity
          style={[styles.chip, !selectedBrand && styles.chipActive]}
          onPress={() => onSelectBrand(null)}
        >
          <Text style={[styles.chipText, !selectedBrand && styles.chipTextActive]}>All</Text>
        </TouchableOpacity>
        {brands.map((b) => {
          const name = brandName(b);
          if (!name) return null;
          const active = selectedBrand === name;
          const accent = BRAND_COLORS[name] || '#00B4D8';
          return (
            <TouchableOpacity
              key={name}
              style={[
                styles.chip,
                active && { backgroundColor: accent, borderColor: accent },
              ]}
              onPress={() => onSelectBrand(active ? null : name)}
            >
              <Text style={[styles.chipText, active && { color: '#fff' }]}>{name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scroll: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#F8F9FA',
  },
  chipActive: {
    backgroundColor: '#00B4D8',
    borderColor: '#00B4D8',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  chipTextActive: {
    color: '#fff',
  },
});
