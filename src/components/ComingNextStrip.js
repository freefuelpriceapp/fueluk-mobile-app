/**
 * ComingNextStrip — horizontally-scrolling row of "locked" roadmap preview
 * cards shown near the bottom of HomeScreen.
 *
 * Each tile has:
 *   - Lock icon (top-right)
 *   - "Soon" pill badge
 *   - Title + 1-line description
 *   - Subtle desaturated preview gradient (signals "not active yet")
 *   - onPress → modal info sheet (no email capture — lightweight)
 *
 * Four cards per brief: EV charging, MOT alerts, Route-aware pricing,
 * Price forecasts.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../lib/theme';

// ─── Data ─────────────────────────────────────────────────────────────────────

export const COMING_NEXT_CARDS = [
  {
    id: 'ev-charging',
    title: 'EV charging prices',
    description: 'Live charge point pricing across the UK. Plug-and-pay made smarter.',
    icon: 'flash-outline',
    gradient: ['#0d1f2d', '#0a2a1a'],
  },
  {
    id: 'mot-alerts',
    title: 'MOT renewal alerts',
    description: 'Smart reminders before your MOT, with garage prices nearby.',
    icon: 'notifications-outline',
    gradient: ['#1a1a0d', '#2a1f0a'],
  },
  {
    id: 'route-aware',
    title: 'Route-aware pricing',
    description: 'Tell us your route. We find the cheapest fill-up on the way.',
    icon: 'map-outline',
    gradient: ['#0d1a2a', '#0a1a2a'],
  },
  {
    id: 'price-forecasts',
    title: 'Price forecasts',
    description: 'Wait or fill? AI-driven price predictions for the week ahead.',
    icon: 'trending-up-outline',
    gradient: ['#1a0d2a', '#1a0d1a'],
  },
];

// ─── Info Sheet ───────────────────────────────────────────────────────────────

function CardInfoSheet({ card, visible, onClose }) {
  if (!card) return null;
  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <View style={styles.sheetContent}>
          <View style={styles.sheetHandleBar} />
          <View style={styles.sheetIconRow}>
            <View style={styles.sheetIconWrap}>
              <Ionicons name={card.icon} size={28} color={COLORS.accent} />
            </View>
            <View style={styles.sheetSoonPill}>
              <Text style={styles.sheetSoonText}>Coming soon</Text>
            </View>
          </View>
          <Text style={styles.sheetTitle}>{card.title}</Text>
          <Text style={styles.sheetDescription}>{card.description}</Text>
          <Text style={styles.sheetNote}>
            We're working on it. Keep an eye out for updates.
          </Text>
          <TouchableOpacity style={styles.sheetClose} onPress={onClose}>
            <Text style={styles.sheetCloseText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

// ─── Individual Card ──────────────────────────────────────────────────────────

function ComingNextCard({ card, onPress }) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(card)}
      accessibilityRole="button"
      accessibilityLabel={`${card.title} — coming soon. Tap to learn more.`}
      activeOpacity={0.82}
    >
      {/* Desaturated gradient background */}
      <View style={[styles.cardBg, { backgroundColor: card.gradient[0] }]} />

      {/* Lock icon top-right */}
      <View style={styles.lockWrap} pointerEvents="none">
        <Ionicons name="lock-closed-outline" size={13} color={COLORS.textMuted} />
      </View>

      {/* "Soon" pill badge */}
      <View style={styles.soonPill}>
        <Text style={styles.soonText}>Soon</Text>
      </View>

      {/* Content */}
      <View style={styles.cardContent}>
        <Ionicons name={card.icon} size={20} color={COLORS.textSecondary} style={styles.cardIcon} />
        <Text style={styles.cardTitle} numberOfLines={2}>
          {card.title}
        </Text>
        <Text style={styles.cardDesc} numberOfLines={2}>
          {card.description}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Strip ────────────────────────────────────────────────────────────────────

export default function ComingNextStrip({ cards = COMING_NEXT_CARDS }) {
  const [selectedCard, setSelectedCard] = useState(null);

  const handlePress = (card) => setSelectedCard(card);
  const handleClose = () => setSelectedCard(null);

  return (
    <>
      <View style={styles.strip} accessibilityRole="list" accessibilityLabel="Coming soon features">
        <View style={styles.stripHeader}>
          <Text style={styles.stripLabel}>Coming next</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {cards.map((card) => (
            <ComingNextCard key={card.id} card={card} onPress={handlePress} />
          ))}
        </ScrollView>
      </View>

      <CardInfoSheet
        card={selectedCard}
        visible={!!selectedCard}
        onClose={handleClose}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_WIDTH = 148;
const CARD_HEIGHT = 130;

const styles = StyleSheet.create({
  strip: {
    marginTop: 12,
    marginBottom: 4,
  },
  stripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  stripLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  scroll: {
    paddingHorizontal: 12,
    gap: 10,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    overflow: 'hidden',
    position: 'relative',
  },
  cardBg: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
  },
  lockWrap: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
  },
  soonPill: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  soonText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    paddingTop: 28,
  },
  cardIcon: {
    marginBottom: 5,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginBottom: 3,
  },
  cardDesc: {
    fontSize: 10,
    color: COLORS.textMuted,
    lineHeight: 14,
  },
  // ─── Info sheet ──────────────────────────────────────────────────────────
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sheetHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 18,
  },
  sheetIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sheetIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSoonPill: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sheetSoonText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  sheetDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  sheetNote: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 17,
    marginBottom: 24,
  },
  sheetClose: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sheetCloseText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
});
