import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FloatingInput } from '../components/FloatingInput';
import type { Screen } from '../types/navigation';
import { colors } from '../theme/colors';

interface LoginScreenProps {
  onNavigate: (s: Screen) => void;
}

export function LoginScreen({ onNavigate }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('splash')} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={18} color={colors.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Welcome back!</Text>
        <FloatingInput label="Email address" value={email} onChange={setEmail} />
        <FloatingInput
          label="Password"
          value={password}
          onChange={setPassword}
          secureTextEntry={!showPw}
          right={
            <TouchableOpacity onPress={() => setShowPw((v) => !v)}>
              <Ionicons name={showPw ? 'eye-off' : 'eye'} size={16} color={colors.gray400} />
            </TouchableOpacity>
          }
        />
        <View style={styles.row}>
          <TouchableOpacity style={styles.checkRow} onPress={() => setRemember((v) => !v)}>
            <View style={[styles.checkbox, remember && styles.checkboxChecked]}>
              {remember && <Ionicons name="checkmark" size={10} color={colors.white} />}
            </View>
            <Text style={styles.checkLabel}>Remember me</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={styles.forgot}>Forgot password?</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => onNavigate('home')}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Login</Text>
          </LinearGradient>
        </TouchableOpacity>
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Login with</Text>
          <View style={styles.dividerLine} />
        </View>
        <View style={styles.social}>
          {['logo-google', 'logo-apple'].map((icon) => (
            <TouchableOpacity key={icon} style={styles.socialBtn}>
              <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color={colors.gray700} />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.footer}>
          Don't have an account?{' '}
          <Text style={styles.link} onPress={() => onNavigate('signup')}>
            Sign up
          </Text>
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: { paddingHorizontal: 20, paddingTop: 20 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { color: colors.primary, fontWeight: '500', fontSize: 14 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 },
  title: { fontSize: 28, fontWeight: '900', color: colors.gray900, marginBottom: 32 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkLabel: { fontSize: 12, color: colors.gray500 },
  forgot: { fontSize: 12, fontWeight: '600', color: colors.primary },
  primaryBtn: { paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginBottom: 24 },
  primaryBtnText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.gray200 },
  dividerText: { fontSize: 12, color: colors.gray400 },
  social: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 32 },
  socialBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { textAlign: 'center', fontSize: 14, color: colors.gray400 },
  link: { fontWeight: '700', color: colors.primary },
});
