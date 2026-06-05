export type Screen =
  | 'splash'
  | 'login'
  | 'signup'
  | 'forgot-password'
  | 'setup'
  | 'home'
  | 'scan'
  | 'processing'
  | 'reports-list'
  | 'report'
  | 'field-map'
  | 'timeline'
  | 'savings'
  | 'fields-list'
  | 'add-field'
  | 'field-detail'
  | 'settings'
  | 'billing';

export type NavTab = 'home' | 'scan' | 'fields' | 'savings' | 'reports';

export interface ScreenProps {
  onNavigate: (screen: Screen) => void;
  onBack: () => void;
}
