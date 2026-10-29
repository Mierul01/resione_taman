import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { heroGradientDark, heroGradientLight, shadow, spacing, ColorPalette } from '../theme/theme';
import { useAppTheme, useThemeColors } from '../context/ThemeContext';
import AppText from './AppText';
import GradientBackground from './GradientBackground';

const HEADER_RADIUS = 28;

export default function ScreenHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}) {
  const colors = useThemeColors();
  const { isDarkMode } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.shadowWrap}>
      <View style={[styles.clip, { paddingTop: insets.top + spacing.md }]}>
        <GradientBackground colors={isDarkMode ? heroGradientDark : heroGradientLight} />
        <View style={styles.glowLarge} />
        <View style={styles.glowSmall} />
        <Ionicons name="leaf" size={120} color="rgba(255,255,255,0.07)" style={styles.watermark} />
        {onBack && (
          <TouchableOpacity style={styles.backButton} activeOpacity={0.8} onPress={onBack} hitSlop={8}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </TouchableOpacity>
        )}
        <AppText style={styles.title}>{title}</AppText>
        {subtitle ? <AppText style={styles.subtitle}>{subtitle}</AppText> : null}
      </View>
    </View>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    shadowWrap: {
      backgroundColor: colors.primaryDark,
      borderBottomLeftRadius: HEADER_RADIUS,
      borderBottomRightRadius: HEADER_RADIUS,
      marginBottom: spacing.xs,
      ...shadow.hero,
    },
    clip: {
      paddingHorizontal: spacing.md + 2,
      paddingBottom: spacing.lg,
      borderBottomLeftRadius: HEADER_RADIUS,
      borderBottomRightRadius: HEADER_RADIUS,
      overflow: 'hidden',
    },
    glowLarge: {
      position: 'absolute',
      width: 220,
      height: 220,
      borderRadius: 110,
      right: -80,
      top: -70,
      backgroundColor: 'rgba(255,255,255,0.09)',
    },
    glowSmall: {
      position: 'absolute',
      width: 120,
      height: 120,
      borderRadius: 60,
      left: -40,
      bottom: -30,
      backgroundColor: 'rgba(242,169,59,0.10)',
    },
    watermark: {
      position: 'absolute',
      right: -16,
      top: 24,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.28)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    title: {
      fontSize: 25,
      fontWeight: '800',
      color: colors.white,
    },
    subtitle: {
      marginTop: spacing.xs,
      fontSize: 13.5,
      color: 'rgba(255,255,255,0.85)',
    },
  });
