import { Image, StyleSheet, View } from 'react-native';

export function AuthLogo() {
  return (
    <View style={styles.logoWrap}>
      <Image
        source={require('../../assets/thera-mark-black.png')}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel="Thera logo"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  logoWrap: {
    width: 52,
    height: 52,
    alignSelf: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
});
