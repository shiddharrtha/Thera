import { createElement, type RefObject } from 'react';
import { Platform, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

type WebScanCameraProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  style?: StyleProp<ViewStyle>;
};

/** Browser camera preview for field scans on web (Vercel). */
export function WebScanCamera({ videoRef, style }: WebScanCameraProps) {
  if (Platform.OS !== 'web') return null;

  const flatStyle = StyleSheet.flatten(style) ?? {};

  return createElement('video', {
    ref: videoRef,
    style: {
      ...flatStyle,
      objectFit: 'cover',
      backgroundColor: '#050D07',
      transform: 'scaleX(1)',
    },
    playsInline: true,
    muted: true,
    autoPlay: true,
  });
}
