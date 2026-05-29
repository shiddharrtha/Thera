import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface FloatingInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  secureTextEntry?: boolean;
  right?: React.ReactNode;
}

export function FloatingInput({ label, value, onChange, secureTextEntry, right }: FloatingInputProps) {
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        secureTextEntry={secureTextEntry}
        style={[styles.input, focused && styles.inputFocused, right ? styles.inputWithRight : undefined]}
      />
      {right && <View style={styles.right}>{right}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    position: 'relative',
  },
  label: {
    position: 'absolute',
    left: 12,
    top: 16,
    fontSize: 14,
    color: colors.gray400,
    zIndex: 1,
  },
  labelActive: {
    top: 6,
    fontSize: 10,
    color: colors.primary,
    fontWeight: '600',
  },
  input: {
    paddingTop: 22,
    paddingBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#FAFAFA',
    fontSize: 14,
    color: colors.gray900,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  inputWithRight: {
    paddingRight: 40,
  },
  right: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -8 }],
  },
});
