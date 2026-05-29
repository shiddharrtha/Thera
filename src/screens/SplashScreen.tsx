import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Screen } from '../types/navigation';
import { colors } from '../theme/colors';

/** Bundled farmer & field photos — Ken Burns cross-fade slideshow */
const SLIDES = [
  require('../../assets/splash/slide1.jpg'),
  require('../../assets/splash/slide2.jpg'),
  require('../../assets/splash/slide3.jpg'),
  require('../../assets/splash/slide4.jpg'),
  require('../../assets/splash/slide5.jpg'),
  require('../../assets/splash/slide6.jpg'),
];

const SLIDE_DURATION = 5000;
const FADE_DURATION = 1200;
const useNativeDriver = Platform.OS !== 'web';

interface SplashScreenProps {
  onNavigate: (s: Screen) => void;
}

function SlideLayer({
  source,
  isActive,
  isNext,
  fading,
  width,
  height,
}: {
  source: (typeof SLIDES)[0];
  isActive: boolean;
  isNext: boolean;
  fading: boolean;
  width: number;
  height: number;
}) {
  const opacity = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const scale = useRef(new Animated.Value(1.08)).current;

  useEffect(() => {
    if (isActive && !fading) {
      opacity.setValue(1);
      scale.setValue(1.08);
      Animated.timing(scale, {
        toValue: 1.18,
        duration: SLIDE_DURATION + FADE_DURATION,
        useNativeDriver,
      }).start();
    } else if (isNext && fading) {
      opacity.setValue(0);
      scale.setValue(1.08);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: FADE_DURATION,
          useNativeDriver,
        }),
        Animated.timing(scale, {
          toValue: 1.18,
          duration: SLIDE_DURATION + FADE_DURATION,
          useNativeDriver,
        }),
      ]).start();
    } else if (isActive && fading) {
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_DURATION,
        useNativeDriver,
      }).start();
    }
  }, [isActive, isNext, fading, opacity, scale]);

  const visible = isActive || (isNext && fading);
  if (!visible) return null;

  // Overscan dimensions so cover + Ken Burns never expose edges
  const imgW = width * 1.2;
  const imgH = height * 1.2;

  return (
    <Animated.View pointerEvents="none" style={[styles.slideContainer, { opacity }]}>
      <Animated.Image
        source={source}
        resizeMode="cover"
        style={[
          {
            width: imgW,
            height: imgH,
            marginLeft: -(imgW - width) / 2,
            marginTop: -(imgH - height) / 2,
            transform: [{ scale }],
          },
        ]}
      />
    </Animated.View>
  );
}

export function SplashScreen({ onNavigate }: SplashScreenProps) {
  const { width, height } = useWindowDimensions();
  const [current, setCurrent] = useState(0);
  const [next, setNext] = useState(1);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setCurrent((c) => {
          const n = (c + 1) % SLIDES.length;
          setNext((n + 1) % SLIDES.length);
          return n;
        });
        setFading(false);
      }, FADE_DURATION);
    }, SLIDE_DURATION);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={[styles.container, { width, height }]}>
      <View style={[styles.mediaStack, { width, height }]}>
        {SLIDES.map((source, i) => (
          <SlideLayer
            key={i}
            source={source}
            isActive={i === current}
            isNext={i === next}
            fading={fading}
            width={width}
            height={height}
          />
        ))}
      </View>

      <LinearGradient
        colors={['rgba(10,61,31,0.55)', 'rgba(27,107,56,0.42)', 'rgba(20,84,41,0.62)']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.content}>
        <Image
          source={require('../../assets/thera-logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Thera logo"
        />
        <Text style={styles.title}>Thera</Text>
        <Text style={styles.tagline}>"Treat only what needs treatment."</Text>
        <Text style={styles.subtitle}>Smart precision agriculture for every farm</Text>
      </View>

      <View style={styles.cta}>
        <TouchableOpacity style={styles.loginBtn} onPress={() => onNavigate('login')}>
          <Text style={styles.loginBtnText}>Log In</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.startBtn} onPress={() => onNavigate('signup')}>
          <Text style={styles.startBtnText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.primaryDark,
    overflow: 'hidden',
  },
  mediaStack: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
  slideContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    zIndex: 2,
  },
  logo: {
    width: 110,
    height: 110,
    borderRadius: 24,
    marginBottom: 16,
  },
  title: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.white,
    marginBottom: 12,
  },
  tagline: {
    fontSize: 18,
    fontStyle: 'italic',
    color: colors.greenLight,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.green300,
    textAlign: 'center',
  },
  cta: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 40,
    zIndex: 2,
  },
  loginBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
  },
  loginBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  startBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  startBtnText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 16,
  },
});
