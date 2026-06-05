import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  type TextInputProps,
} from 'react-native';
import { colors } from '../theme/colors';
import { createStyles } from '../theme/createStyles';

interface FloatingInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  secureTextEntry?: boolean;
  placeholder?: string;
  right?: React.ReactNode;
  keyboardType?: TextInputProps['keyboardType'];
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoCorrect?: boolean;
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  blurOnSubmit?: boolean;
}

export function FloatingInput({
  label,
  value,
  onChange,
  secureTextEntry,
  placeholder,
  right,
  keyboardType,
  returnKeyType,
  onSubmitEditing,
  autoCapitalize = 'none',
  autoCorrect = false,
  autoComplete,
  textContentType,
  blurOnSubmit = true,
}: FloatingInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={secureTextEntry}
          placeholder={placeholder}
          placeholderTextColor={colors.gray400}
          keyboardType={keyboardType}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          autoComplete={autoComplete}
          textContentType={textContentType}
          blurOnSubmit={blurOnSubmit}
          style={[
            styles.input,
            focused && styles.inputFocused,
            right ? styles.inputWithRight : undefined,
          ]}
        />
        {right && <View style={styles.right}>{right}</View>}
      </View>
    </View>
  );
}

const styles = createStyles({
  container: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray900,
    marginBottom: 6,
  },
  inputWrap: {
    position: 'relative',
  },
  input: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    backgroundColor: colors.white,
    fontSize: 13,
    color: colors.gray900,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  inputWithRight: {
    paddingRight: 48,
  },
  right: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
});
