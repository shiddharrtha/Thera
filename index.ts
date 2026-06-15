// @react-native-firebase uses setImmediate on web; polyfill for browsers.
if (typeof globalThis.setImmediate === 'undefined') {
  globalThis.setImmediate = ((callback: (...args: unknown[]) => void, ...args: unknown[]) =>
    setTimeout(() => callback(...args), 0)) as unknown as typeof globalThis.setImmediate;
}

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
