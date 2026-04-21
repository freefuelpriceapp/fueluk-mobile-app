/**
 * src/lib/mapStyles.js
 *
 * Refined map styles for MapScreen. Two variants are exported:
 *   darkMapStyleRefined  — soft charcoal base for dark mode
 *   lightMapStyleRefined — muted neutral base for light mode
 *
 * Shared intent for both:
 *   - Hide noisy POI labels (shops, restaurants, parks) so fuel pins own
 *     the visual hierarchy.
 *   - Keep motorway shields + locality labels visible.
 *   - Desaturate park green so it doesn't fight the cheap-price green.
 */

export const darkMapStyleRefined = [
  { elementType: 'geometry', stylers: [{ color: '#1B1F24' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1B1F24' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9AA4AF' }] },

  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#D0D7DE' }] },
  { featureType: 'administrative.country',  elementType: 'labels.text.fill', stylers: [{ color: '#8B949E' }] },
  { featureType: 'administrative.province', elementType: 'labels.text.fill', stylers: [{ color: '#8B949E' }] },

  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#21281F' }] },
  { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.school', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.attraction', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.medical', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.place_of_worship', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.sports_complex', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.government', stylers: [{ visibility: 'off' }] },

  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#262B32' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1F2328' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#98A1AC' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },

  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#2C3139' }] },
  { featureType: 'road.highway',  elementType: 'geometry', stylers: [{ color: '#333A44' }] },
  { featureType: 'road.highway',  elementType: 'geometry.stroke', stylers: [{ color: '#202530' }] },
  { featureType: 'road.highway',  elementType: 'labels.text.fill', stylers: [{ color: '#E6EDF3' }] },
  { featureType: 'road.highway',  elementType: 'labels.icon', stylers: [{ visibility: 'on' }] },

  { featureType: 'transit', stylers: [{ visibility: 'off' }] },

  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#121821' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4B5563' }] },

  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#1E2329' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#1F242B' }] },
];

export const lightMapStyleRefined = [
  { elementType: 'geometry', stylers: [{ color: '#F4F5F7' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#F4F5F7' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#4B5563' }] },

  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#1F2937' }] },
  { featureType: 'administrative.country',  elementType: 'labels.text.fill', stylers: [{ color: '#6B7280' }] },

  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#E3EDDC' }] },
  { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.school', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.attraction', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.medical', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.place_of_worship', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.sports_complex', stylers: [{ visibility: 'off' }] },

  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#E5E7EB' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#4B5563' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },

  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#FAFBFC' }] },
  { featureType: 'road.highway',  elementType: 'geometry', stylers: [{ color: '#FFEFC2' }] },
  { featureType: 'road.highway',  elementType: 'geometry.stroke', stylers: [{ color: '#E2C77A' }] },
  { featureType: 'road.highway',  elementType: 'labels.text.fill', stylers: [{ color: '#1F2937' }] },
  { featureType: 'road.highway',  elementType: 'labels.icon', stylers: [{ visibility: 'on' }] },

  { featureType: 'transit', stylers: [{ visibility: 'off' }] },

  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#CDE4F2' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4B6B7F' }] },

  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#EFF1F4' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#F1F3F6' }] },
];

export default { darkMapStyleRefined, lightMapStyleRefined };
