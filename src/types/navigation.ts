export type Screen =
  | 'splash'
  | 'login'
  | 'signup'
  | 'forgot-password'
  | 'home'
  | 'scan'
  | 'processing'
  | 'report'
  | 'field-map'
  | 'timeline'
  | 'savings'
  | 'fields-list'
  | 'settings'
  | 'billing';

export type NavTab = 'home' | 'scan' | 'fields' | 'savings' | 'reports';

export interface ScreenProps {
  onNavigate: (screen: Screen) => void;
  onBack: () => void;
}
