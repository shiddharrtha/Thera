import type { ReactNode } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface KeyboardFormScreenProps {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  style?: StyleProp<ViewStyle>;
  scrollContentStyle?: StyleProp<ViewStyle>;
  /** Vertically center scroll content when the keyboard is closed (auth screens). */
  centerContent?: boolean;
}

export function KeyboardFormScreen({
  children,
  header,
  footer,
  style,
  scrollContentStyle,
  centerContent = false,
}: KeyboardFormScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={[styles.flex, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
      {header}
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scrollContent,
          centerContent && styles.centerContent,
          scrollContentStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Pressable style={styles.pressable} onPress={Keyboard.dismiss} accessible={false}>
          {children}
        </Pressable>
      </ScrollView>
      {footer}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 48,
  },
  centerContent: {
    justifyContent: 'center',
    minHeight: '100%',
  },
  pressable: {
    flexGrow: 1,
  },
});
