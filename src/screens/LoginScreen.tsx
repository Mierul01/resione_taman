import React, { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { heroGradientDark, heroGradientLight, radius, shadow, spacing, withAlpha, ColorPalette } from '../theme/theme';
import { useAppTheme, useThemeColors } from '../context/ThemeContext';
import GradientBackground from '../components/GradientBackground';
import { useLanguage } from '../context/LanguageContext';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import AppText from '../components/AppText';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

// Google sign-in uses the browser pop-up flow, so it is only offered on the
// web app for now; the Android APK needs a native Google sign-in module.
const GOOGLE_SIGN_IN_ENABLED = Platform.OS === 'web';

export default function LoginScreen({ navigation }: Props) {
  const colors = useThemeColors();
  const { isDarkMode } = useAppTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { login, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError(t('login.fillBoth'));
      return;
    }
    setLoading(true);
    const result = await login(email, password, rememberMe);
    setLoading(false);
    if (!result.success) {
      setError(t(result.messageKey ?? 'common.loginFailed'));
    }
  };

  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    const result = await signInWithGoogle(rememberMe);
    setGoogleLoading(false);
    if (result.needsProfile) {
      navigation.navigate('Register', { google: { name: result.name ?? '', email: result.email ?? '' } });
      return;
    }
    if (!result.success && result.messageKey) {
      setError(t(result.messageKey));
    }
  };

  return (
    <View style={styles.backdrop}>
      <GradientBackground colors={isDarkMode ? heroGradientDark : heroGradientLight} />
      <View style={styles.glowLarge} />
      <View style={styles.glowSmall} />
      <Ionicons name="leaf" size={200} color="rgba(255,255,255,0.06)" style={styles.backdropWatermarkTop} />
      <Ionicons name="leaf" size={160} color="rgba(255,255,255,0.06)" style={styles.backdropWatermarkBottom} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brand}>
            <View style={styles.logoCircle}>
              <Ionicons name="leaf" size={28} color={colors.primary} />
            </View>
            <AppText style={styles.brandName}>{t('common.appName')}</AppText>
            <AppText style={styles.brandTagline}>{t('splash.subtitle')}</AppText>
          </View>

          <View style={styles.card}>
            <AppText style={styles.title}>{t('login.title')}</AppText>
            <AppText style={styles.subtitle}>{t('login.subtitle', { appName: t('common.appName') })}</AppText>

            <AppText style={styles.fieldLabel}>{t('common.email')}</AppText>
            <View style={[styles.inputWrap, focused === 'email' && styles.inputWrapFocused]}>
              <Ionicons name="mail-outline" size={18} color={focused === 'email' ? colors.primary : colors.textMuted} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                placeholder={t('login.emailPlaceholder')}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
              />
            </View>

            <AppText style={styles.fieldLabel}>{t('login.passwordLabel')}</AppText>
            <View style={[styles.inputWrap, focused === 'password' && styles.inputWrapFocused]}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={focused === 'password' ? colors.primary : colors.textMuted}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
                onSubmitEditing={handleLogin}
                placeholder={t('login.passwordPlaceholder')}
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                style={styles.input}
              />
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={19}
                color={colors.textMuted}
                onPress={() => setShowPassword((v) => !v)}
              />
            </View>

            <TouchableOpacity style={styles.rememberRow} activeOpacity={0.75} onPress={() => setRememberMe((v) => !v)}>
              <Ionicons name={rememberMe ? 'checkbox' : 'square-outline'} size={19} color={colors.primary} />
              <AppText style={styles.rememberText}>{t('login.rememberMe')}</AppText>
            </TouchableOpacity>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={colors.danger} />
                <AppText style={styles.error}>{error}</AppText>
              </View>
            ) : null}

            <Button label={t('login.submit')} onPress={handleLogin} loading={loading} style={styles.submitButton} />

            {GOOGLE_SIGN_IN_ENABLED && (
              <>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <AppText style={styles.dividerText}>{t('login.or')}</AppText>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={styles.googleButton}
                  activeOpacity={0.8}
                  onPress={handleGoogle}
                  disabled={googleLoading}
                >
                  {googleLoading ? <ActivityIndicator size="small" color={colors.primary} /> : <GoogleLogo />}
                  <AppText style={styles.googleText}>{t('login.google')}</AppText>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.footerRow}>
              <AppText style={styles.footerText}>{t('login.noAccount')}</AppText>
              <AppText style={styles.link} onPress={() => navigation.navigate('Register')}>
                {t('login.registerLink')}
              </AppText>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function GoogleLogo() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <Path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Svg>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    flex: {
      flex: 1,
    },
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
    backdrop: {
      flex: 1,
      backgroundColor: colors.primary,
      overflow: 'hidden',
    },
    backdropWatermarkTop: {
      position: 'absolute',
      right: -50,
      top: -40,
    },
    backdropWatermarkBottom: {
      position: 'absolute',
      left: -40,
      bottom: -30,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
    },
    brand: {
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    logoCircle: {
      width: 64,
      height: 64,
      borderRadius: 22,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: withAlpha(colors.white, 0.35),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 14,
      elevation: 6,
    },
    brandName: {
      marginTop: spacing.sm,
      fontSize: 24,
      fontWeight: '800',
      letterSpacing: 1,
      color: colors.white,
    },
    brandTagline: {
      marginTop: 2,
      fontSize: 13,
      color: 'rgba(255,255,255,0.82)',
    },
    card: {
      width: '100%',
      maxWidth: 440,
      alignSelf: 'center',
      backgroundColor: colors.surface,
      borderRadius: 28,
      paddingHorizontal: 20,
      paddingTop: spacing.lg,
      paddingBottom: 20,
      ...shadow.hero,
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      letterSpacing: 0.2,
      color: colors.text,
      textAlign: 'center',
    },
    subtitle: {
      marginTop: spacing.xs,
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
      marginBottom: spacing.xs,
      marginTop: spacing.md,
    },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderWidth: 1.5,
      borderColor: colors.background,
      borderRadius: 16,
      paddingHorizontal: 14,
      height: 52,
      gap: spacing.sm,
    },
    inputWrapFocused: {
      borderColor: colors.primary,
      backgroundColor: colors.surface,
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
    },
    rememberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.md,
      alignSelf: 'flex-start',
    },
    rememberText: {
      fontSize: 13,
      color: colors.text,
      fontWeight: '600',
    },
    submitButton: {
      marginTop: spacing.lg,
      borderRadius: radius.full,
      paddingVertical: 15,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.28,
      shadowRadius: 12,
      elevation: 4,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.xs,
      marginTop: spacing.md,
      backgroundColor: withAlpha(colors.danger, 0.1),
      borderRadius: 12,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
    },
    error: {
      flex: 1,
      color: colors.danger,
      fontSize: 13,
      lineHeight: 18,
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    dividerLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    dividerText: {
      fontSize: 12,
      color: colors.textMuted,
    },
    googleButton: {
      marginTop: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      height: 50,
      borderRadius: radius.full,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    googleText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: spacing.lg,
      gap: 4,
    },
    footerText: {
      fontSize: 13,
      color: colors.textMuted,
    },
    link: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: 13,
    },
  });
