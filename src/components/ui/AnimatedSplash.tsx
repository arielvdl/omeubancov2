import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import Svg, { Rect, G, Path } from 'react-native-svg';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const AnimatedView = Animated.createAnimatedComponent(View);

// Individual letter paths from the SVG
// MEU (top row)
const LETTER_M =
  'M433 1658 c-12 -6 -24 -20 -27 -32 -11 -40 -6 -542 5 -575 11 -30 13 -31 70 -31 84 0 90 12 89 177 -1 70 -1 133 0 138 1 6 19 -25 41 -68 22 -43 46 -80 54 -84 23 -8 44 15 80 89 17 37 35 65 38 61 4 -3 7 -70 7 -148 0 -96 4 -145 12 -153 7 -7 38 -12 70 -12 46 0 59 4 68 19 6 12 10 127 10 303 0 335 3 323 -90 323 -73 0 -72 1 -135 -139 -23 -50 -45 -90 -51 -88 -5 2 -29 49 -54 105 -32 71 -53 106 -70 114 -30 15 -87 16 -117 1z';

const LETTER_E =
  'M1000 1650 c-19 -19 -20 -33 -20 -308 0 -269 1 -290 19 -306 16 -14 39 -16 167 -14 l149 3 3 62 c3 72 5 71 -108 75 l-65 3 -3 51 c-2 33 2 55 10 62 8 6 45 12 83 14 l70 3 0 60 0 60 -70 3 c-80 3 -95 12 -95 58 0 49 23 66 89 64 97 -3 91 -7 91 59 0 44 -4 60 -16 65 -9 3 -76 6 -150 6 -121 0 -136 -2 -154 -20z';

const LETTER_U =
  'M1369 1649 c-20 -20 -20 -29 -17 -283 3 -230 5 -265 21 -289 32 -49 71 -62 187 -62 92 0 110 3 141 23 60 37 64 56 64 344 0 185 -3 260 -12 269 -19 19 -105 23 -128 6 -19 -15 -20 -29 -23 -258 -2 -175 -6 -246 -15 -251 -19 -12 -44 -9 -61 8 -14 13 -16 50 -16 249 0 266 0 265 -76 265 -31 0 -50 -6 -65 -21z';

// BANCO (bottom row)
const LETTER_B =
  'M410 910 c-7 -12 -9 -88 -8 -202 l3 -183 107 -3 106 -3 26 34 c36 46 37 127 3 161 -23 23 -23 24 -5 46 11 14 18 39 18 67 0 36 -6 50 -29 74 -28 28 -33 29 -120 29 -80 0 -92 -2 -101 -20z m138 -72 c16 -16 15 -33 -4 -52 -21 -21 -31 -20 -39 4 -14 44 15 76 43 48z m10 -192 c-3 -36 -6 -41 -28 -41 -21 0 -26 5 -28 31 -3 36 20 66 44 57 11 -4 14 -17 12 -47z';

const LETTER_A =
  'M757 908 c-14 -23 -55 -232 -64 -335 l-5 -53 45 0 c45 0 46 1 57 40 9 35 14 40 39 40 25 0 30 -5 38 -37 8 -36 11 -38 55 -41 33 -2 47 1 51 12 7 18 -50 332 -67 366 -10 22 -19 25 -73 28 -55 3 -63 1 -76 -20z m83 -115 c0 -16 3 -44 6 -63 5 -31 3 -36 -15 -37 -23 -2 -26 18 -15 90 8 43 24 50 24 10z';

const LETTER_N =
  'M1002 918 c-9 -9 -12 -61 -12 -189 0 -98 3 -184 6 -193 7 -17 78 -23 88 -7 3 4 6 48 7 96 l2 88 46 -94 46 -94 40 0 40 0 6 77 c4 43 4 133 0 200 l-6 123 -35 3 c-47 5 -60 -16 -61 -102 l0 -71 -42 85 c-40 81 -44 85 -77 88 -19 2 -41 -3 -48 -10z';

const LETTER_C =
  'M1383 914 c-62 -31 -92 -90 -93 -184 0 -113 43 -187 125 -210 61 -17 75 -10 75 40 0 38 -2 40 -30 40 -42 0 -60 39 -60 133 0 66 3 76 26 98 14 13 27 23 30 22 2 -2 11 -3 19 -3 11 0 15 11 15 40 0 40 0 40 -37 40 -21 0 -52 -8 -70 -16z';

const LETTER_O =
  'M1559 915 c-42 -23 -54 -67 -54 -195 0 -136 11 -171 62 -195 52 -25 127 -16 161 19 26 26 27 30 30 162 4 152 -4 186 -49 209 -35 19 -116 19 -150 0z m96 -190 c0 -113 -1 -120 -20 -120 -19 0 -20 8 -23 109 -3 122 0 139 25 134 16 -3 18 -17 18 -123z';

const ALL_LETTERS = [
  LETTER_M,
  LETTER_E,
  LETTER_U,
  LETTER_B,
  LETTER_A,
  LETTER_N,
  LETTER_C,
  LETTER_O,
];

interface AnimatedSplashProps {
  onFinish: () => void;
}

export default function AnimatedSplash({ onFinish }: AnimatedSplashProps) {
  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);
  const logoTranslateY = useSharedValue(-60);
  const screenTranslateY = useSharedValue(0);
  const overlayOpacity = useSharedValue(1);

  useEffect(() => {
    // Phase 1: Logo drops in from above with elastic bounce (0-1000ms)
    logoOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
    logoTranslateY.value = withSpring(0, {
      damping: 12,
      stiffness: 90,
      mass: 0.8,
    });
    logoScale.value = withSpring(1, {
      damping: 10,
      stiffness: 80,
      mass: 0.8,
    });

    // Phase 2: Pause, then screen slides down smoothly (1400ms-2200ms)
    screenTranslateY.value = withDelay(
      1400,
      withSpring(SCREEN_HEIGHT + 50, {
        damping: 20,
        stiffness: 60,
        mass: 1,
      })
    );

    overlayOpacity.value = withDelay(
      2200,
      withTiming(0, { duration: 100 })
    );

    const timeout = setTimeout(() => {
      onFinish();
    }, 2400);

    return () => clearTimeout(timeout);
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: screenTranslateY.value }],
    opacity: overlayOpacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: logoTranslateY.value },
      { scale: logoScale.value },
    ],
    opacity: logoOpacity.value,
  }));

  return (
    <AnimatedView style={[styles.container, containerStyle]} pointerEvents="none">
      <AnimatedView style={[styles.logoContainer, logoStyle]}>
        <Svg width={160} height={160} viewBox="0 0 217 217">
          <Rect width="217" height="217" rx="32" ry="32" fill="#FFD600" />
          <G
            transform="translate(0,217) scale(0.1,-0.1)"
            fill="#333333"
            stroke="none"
          >
            {ALL_LETTERS.map((d, i) => (
              <Path key={i} d={d} fill="#333333" />
            ))}
          </G>
        </Svg>
      </AnimatedView>
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFD600',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  logoContainer: {
    alignItems: 'center',
  },
});
