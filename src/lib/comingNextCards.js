/**
 * comingNextCards.js — static data for ComingNextStrip.
 *
 * Extracted to lib so it can be tested without requiring React/JSX.
 */

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

export default COMING_NEXT_CARDS;
