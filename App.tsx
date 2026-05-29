import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import type { Screen, NavTab } from './src/types/navigation';
import { BottomNav } from './src/components/BottomNav';
import { SplashScreen } from './src/screens/SplashScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { SignUpScreen } from './src/screens/SignUpScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ScanScreen } from './src/screens/ScanScreen';
import { ProcessingScreen } from './src/screens/ProcessingScreen';
import { ReportScreen } from './src/screens/ReportScreen';
import { FieldMapScreen } from './src/screens/FieldMapScreen';
import { TimelineScreen } from './src/screens/TimelineScreen';
import { SavingsScreen } from './src/screens/SavingsScreen';
import { FieldsListScreen } from './src/screens/FieldsListScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { BillingScreen } from './src/screens/BillingScreen';
import { colors } from './src/theme/colors';

const NO_NAV_SCREENS: Screen[] = [
  'splash',
  'login',
  'signup',
  'scan',
  'processing',
  'fields-list',
  'settings',
  'billing',
];

const TAB_SCREEN_MAP: Record<NavTab, Screen> = {
  home: 'home',
  scan: 'scan',
  fields: 'fields-list',
  savings: 'savings',
  reports: 'report',
};

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash');
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [history, setHistory] = useState<Screen[]>([]);

  const navigate = (s: Screen) => {
    setHistory((h) => [...h, screen]);
    setScreen(s);
  };

  const goBack = () => {
    const h = [...history];
    const prev = h.pop() ?? 'home';
    setHistory(h);
    setScreen(prev);
  };

  const handleTab = (tab: NavTab) => {
    setActiveTab(tab);
    setHistory([]);
    setScreen(TAB_SCREEN_MAP[tab]);
  };

  const showNav = !NO_NAV_SCREENS.includes(screen);
  const screenProps = { onNavigate: navigate, onBack: goBack };

  const renderScreen = () => {
    switch (screen) {
      case 'splash':
        return <SplashScreen onNavigate={navigate} />;
      case 'login':
        return <LoginScreen onNavigate={navigate} />;
      case 'signup':
        return <SignUpScreen onNavigate={navigate} />;
      case 'home':
        return <HomeScreen {...screenProps} />;
      case 'scan':
        return <ScanScreen {...screenProps} />;
      case 'processing':
        return <ProcessingScreen {...screenProps} />;
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
      case 'settings':
        return <SettingsScreen {...screenProps} />;
      case 'billing':
        return <BillingScreen {...screenProps} />;
    }
  };

  const statusBarStyle = screen === 'splash' || screen === 'scan' ? 'light' : 'dark';
  const backgroundColor =
    screen === 'splash' ? 'transparent' : screen === 'scan' ? colors.scanDark : colors.background;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
        <StatusBar style={statusBarStyle} />
        <View style={styles.content}>{renderScreen()}</View>
        {showNav && <BottomNav active={activeTab} onTab={handleTab} />}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignSelf: 'stretch',
  },
});
