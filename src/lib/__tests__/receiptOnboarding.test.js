/**
 * Tests for receiptOnboarding.js
 * Covers: shouldShowOnboarding (pure), incrementAppOpenCount, getAppOpenCount,
 *         isOnboardingDone, markOnboardingDone
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  shouldShowOnboarding,
  incrementAppOpenCount,
  getAppOpenCount,
  isOnboardingDone,
  markOnboardingDone,
  ONBOARDING_TRIGGER_OPENS,
  ONBOARDING_TRIGGER_SAVINGS_PENCE,
  ONBOARDED_KEY,
  APP_OPEN_COUNT_KEY,
} from '../receiptOnboarding';

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── shouldShowOnboarding (pure) ──────────────────────────────────────────────

describe('shouldShowOnboarding', () => {
  it('returns false when already done', () => {
    expect(shouldShowOnboarding({ alreadyDone: true, openCount: 5 })).toBe(false);
  });

  it('returns false when user already has receipts', () => {
    expect(shouldShowOnboarding({ openCount: 10, receiptCount: 1 })).toBe(false);
  });

  it('returns true after ONBOARDING_TRIGGER_OPENS opens with no receipts', () => {
    expect(
      shouldShowOnboarding({ openCount: ONBOARDING_TRIGGER_OPENS, receiptCount: 0 })
    ).toBe(true);
  });

  it('returns false before trigger opens', () => {
    expect(
      shouldShowOnboarding({ openCount: ONBOARDING_TRIGGER_OPENS - 1, receiptCount: 0 })
    ).toBe(false);
  });

  it('returns true when synthetic savings >= £20 (2000p)', () => {
    expect(
      shouldShowOnboarding({
        openCount: 0,
        syntheticSavingsPence: ONBOARDING_TRIGGER_SAVINGS_PENCE,
        receiptCount: 0,
      })
    ).toBe(true);
  });

  it('returns false when synthetic savings < £20', () => {
    expect(
      shouldShowOnboarding({
        openCount: 0,
        syntheticSavingsPence: ONBOARDING_TRIGGER_SAVINGS_PENCE - 1,
        receiptCount: 0,
      })
    ).toBe(false);
  });

  it('returns false when both triggers met but already done', () => {
    expect(
      shouldShowOnboarding({
        openCount: 100,
        syntheticSavingsPence: 9999,
        receiptCount: 0,
        alreadyDone: true,
      })
    ).toBe(false);
  });

  it('returns false when trigger met but user has receipts', () => {
    expect(
      shouldShowOnboarding({
        openCount: ONBOARDING_TRIGGER_OPENS,
        receiptCount: 2,
      })
    ).toBe(false);
  });

  it('handles defaults (no args) gracefully', () => {
    // 0 opens, 0 savings, 0 receipts → false
    expect(shouldShowOnboarding()).toBe(false);
  });

  it('trigger opens constant is 3', () => {
    expect(ONBOARDING_TRIGGER_OPENS).toBe(3);
  });

  it('trigger savings constant is 2000 pence (£20)', () => {
    expect(ONBOARDING_TRIGGER_SAVINGS_PENCE).toBe(2000);
  });
});

// ─── incrementAppOpenCount ─────────────────────────────────────────────────────

describe('incrementAppOpenCount', () => {
  it('starts at 1 when no previous count', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce(null);
    AsyncStorage.setItem.mockResolvedValueOnce(undefined);
    const count = await incrementAppOpenCount();
    expect(count).toBe(1);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(APP_OPEN_COUNT_KEY, '1');
  });

  it('increments from existing count', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('4');
    AsyncStorage.setItem.mockResolvedValueOnce(undefined);
    const count = await incrementAppOpenCount();
    expect(count).toBe(5);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(APP_OPEN_COUNT_KEY, '5');
  });

  it('handles AsyncStorage error gracefully', async () => {
    AsyncStorage.getItem.mockRejectedValueOnce(new Error('disk fail'));
    const count = await incrementAppOpenCount();
    expect(count).toBe(0);
  });
});

// ─── getAppOpenCount ──────────────────────────────────────────────────────────

describe('getAppOpenCount', () => {
  it('returns 0 when not set', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce(null);
    expect(await getAppOpenCount()).toBe(0);
  });

  it('returns parsed count', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('7');
    expect(await getAppOpenCount()).toBe(7);
  });

  it('returns 0 on error', async () => {
    AsyncStorage.getItem.mockRejectedValueOnce(new Error('fail'));
    expect(await getAppOpenCount()).toBe(0);
  });
});

// ─── isOnboardingDone ─────────────────────────────────────────────────────────

describe('isOnboardingDone', () => {
  it('returns false when not set', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce(null);
    expect(await isOnboardingDone()).toBe(false);
  });

  it('returns true when set to "true"', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('true');
    expect(await isOnboardingDone()).toBe(true);
  });

  it('returns false on error', async () => {
    AsyncStorage.getItem.mockRejectedValueOnce(new Error('fail'));
    expect(await isOnboardingDone()).toBe(false);
  });
});

// ─── markOnboardingDone ────────────────────────────────────────────────────────

describe('markOnboardingDone', () => {
  it('writes "true" to AsyncStorage', async () => {
    AsyncStorage.setItem.mockResolvedValueOnce(undefined);
    await markOnboardingDone();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(ONBOARDED_KEY, 'true');
  });

  it('handles AsyncStorage error silently', async () => {
    AsyncStorage.setItem.mockRejectedValueOnce(new Error('fail'));
    await expect(markOnboardingDone()).resolves.toBeUndefined();
  });
});
