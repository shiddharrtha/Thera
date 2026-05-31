import {
  StyleSheet,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { fonts } from './typography';

type Style = ViewStyle | TextStyle | ImageStyle;

type WithFont<T extends Record<string, Style>> = {
  [K in keyof T]: T[K] extends TextStyle ? T[K] & { fontFamily: typeof fonts.extraBold } : T[K];
};

function isTextStyle(style: Style): style is TextStyle {
  return (
    (style as TextStyle).fontSize != null ||
    (style as TextStyle).fontWeight != null ||
    (style as TextStyle).lineHeight != null ||
    (style as TextStyle).letterSpacing != null ||
    (style as TextStyle).textAlign != null ||
    (style as TextStyle).textDecorationLine != null ||
    (style as TextStyle).fontStyle != null
  );
}

export function createStyles<T extends Record<string, Style>>(styles: T): WithFont<T> {
  const mapped = {} as Record<string, Style>;

  for (const key of Object.keys(styles)) {
    const value = styles[key];
    mapped[key] = isTextStyle(value)
      ? { ...value, fontFamily: fonts.extraBold }
      : value;
  }

  return StyleSheet.create(mapped as WithFont<T>);
}
