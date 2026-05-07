/**
 * receiptOcrClient.js — pure async function for posting image to OCR endpoint.
 *
 * Extracted as a non-JSX module so it can be unit-tested without React Native
 * JSX transform requirements.
 */

import Constants from 'expo-constants';

const BASE_URL =
  Constants.expoConfig?.extra?.apiBaseUrl || 'https://api.freefuelpriceapp.com';

/**
 * postImageForOcr(uri) — POSTs image to /api/v1/receipts/ocr.
 * Returns parsed JSON response or throws on error.
 *
 * @param {string} uri — local file:// URI
 * @returns {Promise<object>} OCR result
 */
export async function postImageForOcr(uri) {
  const formData = new FormData();
  const filename = uri.split('/').pop() || 'receipt.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';
  formData.append('image', { uri, name: filename, type });

  const response = await fetch(`${BASE_URL}/api/v1/receipts/ocr`, {
    method: 'POST',
    body: formData,
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    const error = new Error(`OCR failed: HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}
