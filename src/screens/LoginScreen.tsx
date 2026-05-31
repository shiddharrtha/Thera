import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthLogo } from '../components/AuthLogo';
import { FloatingInput } from '../components/FloatingInput';
import type { Screen } from '../types/navigation';
import { colors } from '../theme/colors';
import { createStyles } from '../theme/createStyles';

interface LoginScreenProps {
  onNavigate: (s: Screen) => void;
}

function SocialButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.socialBtn} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={20} color={colors.gray700} />
      <Text style={styles.socialBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function LoginScreen({ onNavigate }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('splash')} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.gray900} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.form}>
        <AuthLogo />
        <Text style={styles.title}>
          Welcome{'\n'}
          <Text style={styles.titleAccent}>Back!</Text>
        </Text>

        <FloatingInput
          label="Email Address"
          value={email}
          onChange={setEmail}
          placeholder="mail@mail.com"
        />
        <FloatingInput
          label="Password"
          value={password}
          onChange={setPassword}
          placeholder="Enter password"
          secureTextEntry={!showPw}
          right={
            <TouchableOpacity onPress={() => setShowPw((v) => !v)} hitSlop={8}>
              <Ionicons name={showPw ? 'eye-off' : 'eye'} size={18} color={colors.gray400} />
            </TouchableOpacity>
          }
        />

        <TouchableOpacity style={styles.forgotWrap}>
          <Text style={styles.forgot}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => onNavigate('home')} activeOpacity={0.85}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Login</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.social}>
          <SocialButton icon="logo-google" label="Login with Google" />
          <SocialButton icon="logo-apple" label="Login with Apple" />
        </View>

        <Text style={styles.footer}>
          Don't have an account?{' '}
          <Text style={styles.link} onPress={() => onNavigate('signup')}>
            Register
          </Text>
        </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = createStyles({
  container: { flex: 1, backgroundColor: colors.white },
  header: { paddingHorizontal: 16, paddingTop: 8 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  form: {
    width: '100%',
    maxWidth: 320,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.gray900,
    lineHeight: 32,
    marginBottom: 24,
    textAlign: 'center',
  },
  titleAccent: { color: colors.primary },
  forgotWrap: { alignItems: 'flex-end', marginTop: -6, marginBottom: 20 },
  forgot: { fontSize: 12, fontWeight: '700', color: colors.primary },
  primaryBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  primaryBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.gray200 },
  dividerText: { fontSize: 12, color: colors.gray400, fontWeight: '500' },
  social: { gap: 10, marginBottom: 24 },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    backgroundColor: colors.white,
  },
  socialBtnText: { fontSize: 13, fontWeight: '600', color: colors.gray700 },
  footer: { textAlign: 'center', fontSize: 14, color: colors.gray400 },
  link: { fontWeight: '700', color: colors.primary },
});
