/**
 * useConsent — React hook for the GDPR consent record.
 *
 * Returns:
 *   {
 *     status:    'unset' | 'granted' | 'declined' | 'expired' | 'loading',
 *     grantedAt: string | null,
 *     expiresAt: string | null,
 *     grant:     () => Promise<void>,
 *     decline:   () => Promise<void>,
 *     revoke:    () => Promise<void>,
 *     reload:    () => Promise<void>,
 *   }
 *
 * Sentry / analytics init helpers should gate on `status === 'granted'`.
 */

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CONSENT_KEY,
  buildDeclineRecord,
  buildGrantRecord,
  resolveStatus,
} from '../lib/consent';

export default function useConsent() {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(CONSENT_KEY);
      if (!raw) {
        setRecord(null);
        return;
      }
      try {
        setRecord(JSON.parse(raw));
      } catch (_e) {
        setRecord(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grant = useCallback(async () => {
    const next = buildGrantRecord();
    await AsyncStorage.setItem(CONSENT_KEY, JSON.stringify(next));
    setRecord(next);
  }, []);

  const decline = useCallback(async () => {
    const next = buildDeclineRecord();
    await AsyncStorage.setItem(CONSENT_KEY, JSON.stringify(next));
    setRecord(next);
  }, []);

  const revoke = useCallback(async () => {
    await AsyncStorage.removeItem(CONSENT_KEY);
    setRecord(null);
  }, []);

  const status = loading ? 'loading' : resolveStatus(record);
  return {
    status,
    grantedAt: record?.grantedAt || null,
    expiresAt: record?.expiresAt || null,
    grant,
    decline,
    revoke,
    reload: load,
  };
}
