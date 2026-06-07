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
  | 'add-farm'
  | 'billing';

export type NavTab = 'home' | 'scan' | 'fields' | 'savings' | 'reports';

export type NavigateOptions = {
  /** Replace the current screen instead of pushing it onto the back stack. */
  replace?: boolean;
};

export interface ScreenProps {
  onNavigate: (screen: Screen, options?: NavigateOptions) => void;
  onBack: () => void;
}
