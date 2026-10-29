import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { heroGradientDark, heroGradientLight, ColorPalette } from '../theme/theme';
import { useAppTheme, useThemeColors } from '../context/ThemeContext';
import GradientBackground from '../components/GradientBackground';
import { useLanguage } from '../context/LanguageContext';

type Props = {
  onFinish: () => void;
};

export default function SplashScreen({ onFinish }: Props) {
  const colors = useThemeColors();
  const { isDarkMode } = useAppTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }),
      Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(onFinish, 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <GradientBackground colors={isDarkMode ? heroGradientDark : heroGradientLight} />
      <View style={styles.glowLarge} />
      <View style={styles.glowSmall} />
      <Animated.View style={[styles.logoCircle, { transform: [{ scale }], opacity }]}>
        <Ionicons name="leaf" size={56} color={colors.white} />
      </Animated.View>
      <Animated.Text style={[styles.title, { opacity }]}>{t('common.appName').toUpperCase()}</Animated.Text>
      <Animated.Text style={[styles.subtitle, { opacity }]}>{t('splash.subtitle')}</Animated.Text>
    </View>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    glowLarge: {
      position: 'absolute',
      width: 320,
      height: 320,
      borderRadius: 160,
      right: -110,
      top: -90,
      backgroundColor: 'rgba(255,255,255,0.09)',
    },
    glowSmall: {
      position: 'absolute',
      width: 200,
      height: 200,
      borderRadius: 100,
      left: -80,
      bottom: 60,
      backgroundColor: 'rgba(242,169,59,0.10)',
    },
    container: {
      flex: 1,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoCircle: {
      width: 110,
      height: 110,
      borderRadius: 55,
      backgroundColor: colors.primaryDark,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    title: {
      color: colors.white,
      fontSize: 22,
      fontWeight: '700',
      letterSpacing: 1,
    },
    subtitle: {
      color: colors.primaryLight,
      fontSize: 14,
      marginTop: 6,
    },
  });
