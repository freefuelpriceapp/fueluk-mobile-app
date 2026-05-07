/**
 * Wave A.4 — wire-format mapper for the synthetic 'unleaded' fuel-type.
 *
 * Lives in its own file (not in fuelApi.js) so unit tests can import it
 * without dragging in expo-constants / axios. The behaviour:
 *   'unleaded' → 'e10'  (post-2021 the default UK pump grade)
 *   anything else passes through.
 *
 * Why E10, not E5? E10 is what the vast majority of UK cars take and the
 * fuel users want ranked first. Server-side ranking by E5 (`petrol_price`)
 * was burying cheap-E10 stations below the truncation horizon.
 */
export function wireFuelType(ft) {
  return ft === 'unleaded' ? 'e10' : ft;
}

export default wireFuelType;
