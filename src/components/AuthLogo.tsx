import { Image, StyleSheet } from 'react-native';

export function AuthLogo() {
  return (
    <Image
      source={require('../../assets/thera-mark-black.png')}
      style={styles.logo}
      resizeMode="contain"
      accessibilityLabel="Thera logo"
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 52,
    height: 52,
    alignSelf: 'center',
    marginBottom: 16,
  },
});
