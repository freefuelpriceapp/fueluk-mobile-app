/**
 * ReceiptCaptureScreen — camera capture + OCR flow.
 *
 * Uses expo-image-picker (already in use in app) for camera capture.
 * POSTs to /api/v1/receipts/ocr (multipart/form-data).
 * Falls back to manual entry on 5xx or network failure.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../lib/theme';
import { postImageForOcr } from '../lib/receiptOcrClient';
export { postImageForOcr };

export default function ReceiptCaptureScreen({ navigation }) {
  const [imageUri, setImageUri] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrError, setOcrError] = useState(null);

  const launchCamera = useCallback(async () => {
    const ip = getImagePicker();
    if (!ip) {
      Alert.alert(
        'Camera unavailable',
        'Please enter receipt details manually.',
        [
          {
            text: 'Enter manually',
            onPress: () => navigation.navigate('ReceiptReview', { ocrData: null, imageUri: null }),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    // Request camera permissions
    const { status } = await ip.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Camera permission needed',
        'Please grant camera access in Settings to snap receipts.',
        [{ text: 'OK' }]
      );
      return;
    }

    const result = await ip.launchCameraAsync({
      mediaTypes: 'Images',
      allowsEditing: true,
      quality: 0.85,
      base64: false,
    });

    if (result.canceled || !result.assets?.[0]) return;
    const uri = result.assets[0].uri;
    setImageUri(uri);
    setOcrError(null);
    await processOcr(uri);
  }, [navigation]);

  const launchLibrary = useCallback(async () => {
    const ip = getImagePicker();
    if (!ip) {
      navigation.navigate('ReceiptReview', { ocrData: null, imageUri: null });
      return;
    }

    const { status } = await ip.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Library permission needed', 'Please grant photo library access in Settings.', [
        { text: 'OK' },
      ]);
      return;
    }

    const result = await ip.launchImageLibraryAsync({
      mediaTypes: 'Images',
      allowsEditing: true,
      quality: 0.85,
      base64: false,
    });

    if (result.canceled || !result.assets?.[0]) return;
    const uri = result.assets[0].uri;
    setImageUri(uri);
    setOcrError(null);
    await processOcr(uri);
  }, [navigation]);

  const processOcr = useCallback(async (uri) => {
    setIsProcessing(true);
    setOcrError(null);
    try {
      const ocrData = await postImageForOcr(uri);
      navigation.navigate('ReceiptReview', { ocrData, imageUri: uri });
    } catch (err) {
      // Graceful fallback: 5xx or network error → manual entry with the image
      setOcrError(
        err?.status >= 500 || !err?.status
          ? 'Could not read receipt automatically. Please fill in the details.'
          : 'OCR unavailable. Please enter details manually.'
      );
      // Still navigate to review but with null OCR data (manual mode)
      navigation.navigate('ReceiptReview', { ocrData: null, imageUri: uri });
    } finally {
      setIsProcessing(false);
    }
  }, [navigation]);

  const enterManually = useCallback(() => {
    navigation.navigate('ReceiptReview', { ocrData: null, imageUri: null });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} bounces={false}>
        {/* Preview */}
        <View style={styles.previewContainer}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
          ) : (
            <View style={styles.previewPlaceholder}>
              <Ionicons name="receipt-outline" size={64} color={COLORS.textMuted} />
              <Text style={styles.previewHint}>Snap your fuel receipt</Text>
            </View>
          )}
        </View>

        {/* Processing overlay */}
        {isProcessing && (
          <View style={styles.processingBanner}>
            <ActivityIndicator color={COLORS.accent} style={{ marginRight: 10 }} />
            <Text style={styles.processingText}>Reading receipt…</Text>
          </View>
        )}

        {ocrError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={16} color={COLORS.warning} />
            <Text style={styles.errorText}>{ocrError}</Text>
          </View>
        ) : null}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionPrimary]}
            onPress={launchCamera}
            disabled={isProcessing}
            activeOpacity={0.85}
            accessibilityLabel="Take a photo of your receipt"
          >
            <Ionicons name="camera-outline" size={20} color={COLORS.background} />
            <Text style={[styles.actionBtnText, styles.actionPrimaryText]}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionSecondary]}
            onPress={launchLibrary}
            disabled={isProcessing}
            activeOpacity={0.85}
            accessibilityLabel="Choose photo from library"
          >
            <Ionicons name="images-outline" size={20} color={COLORS.text} />
            <Text style={styles.actionBtnText}>Choose from Library</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.manualEntry}
            onPress={enterManually}
            disabled={isProcessing}
            activeOpacity={0.7}
          >
            <Text style={styles.manualEntryText}>Enter details manually</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  previewContainer: {
    marginTop: 20,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 260,
    justifyContent: 'center',
    alignItems: 'center',
  },
  preview: {
    width: '100%',
    height: 260,
  },
  previewPlaceholder: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  previewHint: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  processingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  processingText: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.warning,
    flex: 1,
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  actionPrimary: {
    backgroundColor: COLORS.accent,
  },
  actionSecondary: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  actionPrimaryText: {
    color: COLORS.background,
  },
  manualEntry: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  manualEntryText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textDecorationLine: 'underline',
  },
});
