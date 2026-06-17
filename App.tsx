import { useEffect, useState, useCallback, useRef } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { ensureFirebaseInitialized } from './src/lib/firebase';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import type { Screen, NavTab, NavigateOptions } from './src/types/navigation';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AppDataProvider, useAppData } from './src/context/AppDataContext';
import { BottomNav } from './src/components/BottomNav';
import { SplashScreen } from './src/screens/SplashScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { SignUpScreen } from './src/screens/SignUpScreen';
import { ForgotPasswordScreen } from './src/screens/ForgotPasswordScreen';
import { FarmSetupScreen } from './src/screens/FarmSetupScreen';
import { FarmerBackgroundScreen } from './src/screens/FarmerBackgroundScreen';
import { AddFarmScreen } from './src/screens/AddFarmScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ScanScreen } from './src/screens/ScanScreen';
import { ProcessingScreen } from './src/screens/ProcessingScreen';
import { ReportsListScreen } from './src/screens/ReportsListScreen';
import { ReportScreen } from './src/screens/ReportScreen';
import { FieldMapScreen } from './src/screens/FieldMapScreen';
import { TimelineScreen } from './src/screens/TimelineScreen';
import { SavingsScreen } from './src/screens/SavingsScreen';
import { FieldsListScreen } from './src/screens/FieldsListScreen';
import { AddFieldScreen } from './src/screens/AddFieldScreen';
import { FieldDetailScreen } from './src/screens/FieldDetailScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { BillingScreen } from './src/screens/BillingScreen';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import { colors } from './src/theme/colors';

const AUTH_SCREENS: Screen[] = ['splash', 'login', 'signup', 'forgot-password'];
const SETUP_SCREENS: Screen[] = ['setup', 'farmer-background'];

const ONBOARDING_NEXT: Partial<Record<Screen, Screen[]>> = {
  setup: ['farmer-background'],
  'farmer-background': ['home'],
};

function getOnboardingScreen(data: { onboardingComplete: boolean; farms: { id: string }[] }): Screen {
  if (data.onboardingComplete) return 'home';
  if (data.farms.length > 0) return 'farmer-background';
  return 'setup';
}

const TAB_SCREEN_MAP: Record<NavTab, Screen> = {
  home: 'home',
  scan: 'scan',
  fields: 'fields-list',
  savings: 'savings',
  reports: 'reports-list',
};

const SCREEN_TO_TAB: Partial<Record<Screen, NavTab>> = {
  home: 'home',
  scan: 'scan',
  'fields-list': 'fields',
  savings: 'savings',
  'reports-list': 'reports',
  report: 'reports',
};

function AppNavigator() {
  const { user, loading: authLoading } = useAuth();
  const { loading: dataLoading, data, getDataSnapshot, resetForSignOut } = useAppData();
  const [screen, setScreen] = useState<Screen>('splash');
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [history, setHistory] = useState<Screen[]>([]);
  const navigateRef = useRef<(s: Screen, options?: NavigateOptions) => void>(() => {});

  usePushNotifications((screen) => navigateRef.current(screen));

  const completeLogin = useCallback(() => {
    setHistory([]);
    setActiveTab('home');
    setScreen('home');
  }, []);

  const completeRegistration = useCallback(() => {
    setHistory([]);
    setActiveTab('home');
    setScreen('setup');
  }, []);

  useEffect(() => {
    if (authLoading || dataLoading) return;

    if (user) {
      setScreen((current) => {
        if (current === 'splash') return current;

        if (current === 'signup') {
          setHistory([]);
          setActiveTab('home');
          return 'setup';
        }

        if (current === 'login' || current === 'forgot-password') {
          setHistory([]);
          setActiveTab('home');
          return 'home';
        }

        return current;
      });
      return;
    }

    resetForSignOut();
    setScreen((current) => {
      if (!AUTH_SCREENS.includes(current)) {
        setHistory([]);
        return 'splash';
      }
      return current;
    });
  }, [user, authLoading, dataLoading, data.onboardingComplete, resetForSignOut]);

  const navigate = (s: Screen, options?: NavigateOptions) => {
    const appData = getDataSnapshot();
    if (!user && !AUTH_SCREENS.includes(s)) return;

    if (user && screen === 'splash' && s === 'login') {
      setActiveTab('home');
      setHistory([]);
      setScreen('home');
      return;
    }

    if (screen === 'splash' && s === 'signup') {
      setHistory([]);
      setScreen('signup');
      return;
    }

    if (AUTH_SCREENS.includes(s) && AUTH_SCREENS.includes(screen)) {
      setHistory((h) => [...h, screen]);
      setScreen(s);
      return;
    }

    if (user && AUTH_SCREENS.includes(s)) return;

    if (user && (s === 'home' || s === 'setup' || s === 'farmer-background')) {
      setHistory([]);
      setActiveTab('home');
      if (s === 'home') {
        setScreen(getOnboardingScreen(appData));
      } else {
        setScreen(s);
      }
      return;
    }

    if (user && !appData.onboardingComplete && SETUP_SCREENS.includes(screen)) {
      const allowed = ONBOARDING_NEXT[screen] ?? [];
      if (!allowed.includes(s) && s !== 'add-field') return;
    }

    const tab = SCREEN_TO_TAB[s];
    if (tab) setActiveTab(tab);

    if (options?.replace) {
      setScreen(s);
      return;
    }

    setHistory((h) => [...h, screen]);
    setScreen(s);
  };
  navigateRef.current = navigate;

  const goBack = () => {
    const h = [...history];
    const prev = h.pop() ?? (user ? getOnboardingScreen(getDataSnapshot()) : 'splash');
    setHistory(h);
    setScreen(prev);
  };

  const handleTab = (tab: NavTab) => {
    if (!user) return;
    setActiveTab(tab);
    setHistory([]);
    setScreen(TAB_SCREEN_MAP[tab]);
  };

  const showNav =
    user &&
    !AUTH_SCREENS.includes(screen) &&
    !SETUP_SCREENS.includes(screen) &&
    screen !== 'scan' &&
    screen !== 'processing';
  const screenProps = { onNavigate: navigate, onBack: goBack };

  const renderScreen = () => {
    switch (screen) {
      case 'splash':
        return <SplashScreen onNavigate={navigate} />;
      case 'login':
        return <LoginScreen onNavigate={navigate} onAuthenticated={completeLogin} />;
      case 'signup':
        return <SignUpScreen onNavigate={navigate} onRegistered={completeRegistration} />;
      case 'forgot-password':
        return <ForgotPasswordScreen onNavigate={navigate} />;
      case 'setup':
        return <FarmSetupScreen {...screenProps} />;
      case 'farmer-background':
        return <FarmerBackgroundScreen {...screenProps} />;
      case 'home':
        return <HomeScreen {...screenProps} />;
      case 'scan':
        return <ScanScreen {...screenProps} />;
      case 'processing':
        return <ProcessingScreen {...screenProps} />;
      case 'reports-list':
        return <ReportsListScreen {...screenProps} />;
      case 'report':
        return <ReportScreen {...screenProps} />;
      case 'field-map':
        return <FieldMapScreen {...screenProps} />;
      case 'timeline':
        return <TimelineScreen {...screenProps} />;
      case 'savings':
        return <SavingsScreen {...screenProps} />;
      case 'fields-list':
        return <FieldsListScreen {...screenProps} />;
      case 'add-field':
        return <AddFieldScreen {...screenProps} />;
      case 'field-detail':
        return <FieldDetailScreen {...screenProps} />;
      case 'settings':
        return <SettingsScreen {...screenProps} />;
      case 'add-farm':
        return <AddFarmScreen {...screenProps} />;
      case 'billing':
        return <BillingScreen {...screenProps} />;
    }
  };

  const statusBarStyle = screen === 'splash' || screen === 'scan' ? 'light' : 'dark';
  const backgroundColor =
    screen === 'splash' ? 'transparent' : screen === 'scan' ? colors.scanDark : colors.background;

  if (authLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]} edges={['top']}>
        <StatusBar style="light" />
        <View style={styles.content}>
          <SplashScreen onNavigate={() => {}} />
        </View>
      </SafeAreaView>
    );
  }

  const isFullBleedScreen = screen === 'scan' || screen === 'processing';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor }]}
      edges={isFullBleedScreen ? ['top', 'left', 'right'] : ['top']}
    >
      <StatusBar style={statusBarStyle} />
      <View style={[styles.content, isFullBleedScreen && styles.fullBleedContent]}>
        {renderScreen()}
      </View>
      {showNav && <BottomNav active={activeTab} onTab={handleTab} />}
    </SafeAreaView>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    'Gilroy-ExtraBold': require('./assets/fonts/Gilroy-ExtraBold.ttf'),
  });
  const [firebaseReady, setFirebaseReady] = useState(Platform.OS !== 'web');

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    ensureFirebaseInitialized()
      .then(() => setFirebaseReady(true))
      .catch((error) => {
        if (__DEV__) {
          console.error('[firebase] initialization failed', error);
        }
        setFirebaseReady(true);
      });
  }, []);

  if (!fontsLoaded || !firebaseReady) {
    return <View style={[styles.container, { backgroundColor: colors.background }]} />;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppDataProvider>
          <AppNavigator />
        </AppDataProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  content: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
  },
  fullBleedContent: {
    overflow: 'hidden',
  },
});
