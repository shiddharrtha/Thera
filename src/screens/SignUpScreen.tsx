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

interface SignUpScreenProps {
  onNavigate: (s: Screen) => void;
}

export function SignUpScreen({ onNavigate }: SignUpScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('splash')} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={18} color={colors.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Get started</Text>
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
        <TouchableOpacity style={styles.checkRow} onPress={() => setAgreed((v) => !v)}>
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
            {agreed && <Ionicons name="checkmark" size={10} color={colors.white} />}
          </View>
          <Text style={styles.checkLabel}>
            I agree to the processing of <Text style={styles.link}>Personal data</Text>
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onNavigate('home')}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Sign up</Text>
          </LinearGradient>
        </TouchableOpacity>
        <Text style={styles.footer}>
          If you have an account?{' '}
          <Text style={styles.link} onPress={() => onNavigate('login')}>
            Login
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
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 32 },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkLabel: { flex: 1, fontSize: 12, color: colors.gray500, lineHeight: 18 },
  link: { fontWeight: '600', color: colors.primary },
  primaryBtn: { paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginBottom: 24 },
  primaryBtnText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  footer: { textAlign: 'center', fontSize: 14, color: colors.gray400 },
});
