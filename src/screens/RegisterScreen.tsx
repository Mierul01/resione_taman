import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { radius, shadow, spacing, withAlpha, ColorPalette } from '../theme/theme';
import { useThemeColors } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import Button from '../components/Button';
import SelectField from '../components/SelectField';
import ParkSelectModal, { ParkSelection } from '../components/ParkSelectModal';
import { useAuth } from '../context/AuthContext';
import PasswordStrengthChecklist, { PasswordMatchIndicator } from '../components/PasswordStrengthChecklist';
import { SELANGOR_CITIES, SELANGOR_DISTRICTS, SelangorDistrict } from '../data/selangorLocations';
import { MALAYSIA_STATE_OPTIONS } from '../data/malaysiaLocations';
import AppText from '../components/AppText';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const colors = useThemeColors();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { register, checkHousehold } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [parkPickerVisible, setParkPickerVisible] = useState(false);
  const [selectedPark, setSelectedPark] = useState<ParkSelection | null>(null);
  const [houseNo, setHouseNo] = useState('');
  const [houseCheck, setHouseCheck] = useState<{
    status: 'idle' | 'checking' | 'available' | 'taken';
    ownerName?: string;
  }>({ status: 'idle' });
  const [address, setAddress] = useState('');
  const [postcode, setPostcode] = useState('');
  const [state, setState] = useState('Selangor');
  const [district, setDistrict] = useState<SelangorDistrict | ''>('');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pdpaConsent, setPdpaConsent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Live "is this house already registered" check, debounced so it doesn't
  // fire on every keystroke. Only meaningful once an existing park is
  // picked — a brand-new park can't have any households yet.
  const houseCheckRef = useRef(0);
  useEffect(() => {
    if (!selectedPark || !('id' in selectedPark) || !houseNo.trim()) {
      setHouseCheck({ status: 'idle' });
      return;
    }
    const parkId = selectedPark.id;
    const thisCheck = ++houseCheckRef.current;
    setHouseCheck({ status: 'checking' });
    const timer = setTimeout(() => {
      checkHousehold(parkId, houseNo)
        .then((household) => {
          if (houseCheckRef.current !== thisCheck) return;
          setHouseCheck(household ? { status: 'taken', ownerName: household.ownerName } : { status: 'available' });
        })
        .catch(() => {
          if (houseCheckRef.current === thisCheck) setHouseCheck({ status: 'idle' });
        });
    }, 400);
    return () => clearTimeout(timer);
  }, [selectedPark, houseNo]);

  const parkDisplayName = selectedPark ? ('id' in selectedPark ? selectedPark.name : selectedPark.newName) : '';
  const isNewPark = !!selectedPark && !('id' in selectedPark);

  const handleRegister = async () => {
    setError('');
    if (
      !name.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !selectedPark ||
      !houseNo.trim() ||
      !address.trim() ||
      !postcode.trim() ||
      !state ||
      !district ||
      !city.trim() ||
      !password
    ) {
      setError(t('common.required'));
      return;
    }
    if (houseCheck.status === 'taken') {
      setError(t('register.houseTaken', { owner: houseCheck.ownerName ?? '' }));
      return;
    }
    if (password.length < 6) {
      setError(t('register.passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('register.passwordMismatch'));
      return;
    }
    if (!pdpaConsent) {
      setError(t('register.pdpaRequired'));
      return;
    }
    setLoading(true);
    const result = await register({
      name,
      email,
      phone,
      park: selectedPark,
      houseNo,
      address,
      postcode,
      state,
      district,
      city,
      password,
    });
    setLoading(false);
    if (!result.success) {
      setError(
        result.messageKey === 'register.houseTaken'
          ? t('register.houseTaken', { owner: result.ownerName ?? '' })
          : t(result.messageKey ?? 'register.failed')
      );
    }
  };

  return (
    <View style={styles.backdrop}>
      <Ionicons name="leaf" size={160} color="rgba(255,255,255,0.06)" style={styles.backdropWatermarkTop} />

      <View style={styles.logoCircle}>
        <Ionicons name="leaf" size={22} color={colors.primary} />
      </View>

      <KeyboardAvoidingView style={styles.cardWrap} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.card}>
          <View style={styles.cardHandle} />
          <ScrollView contentContainerStyle={styles.cardContent} keyboardShouldPersistTaps="handled">
            <AppText style={styles.title}>{t('register.title')}</AppText>
            <AppText style={styles.subtitle}>
              {t('register.subtitle', { appName: t('common.appName') })}
            </AppText>

            <Field label={t('register.fullName')} icon="person-outline" value={name} onChangeText={setName} placeholder={t('register.fullNamePlaceholder')} />
            <Field label={t('common.email')} icon="mail-outline" value={email} onChangeText={setEmail} placeholder={t('register.emailPlaceholder')} keyboardType="email-address" autoCapitalize="none" />
            <Field label={t('common.phone')} icon="call-outline" value={phone} onChangeText={setPhone} placeholder={t('register.phonePlaceholder')} keyboardType="phone-pad" />
            <AppText style={styles.fieldLabel}>{t('register.parkName')}</AppText>
            <TouchableOpacity
              style={styles.inputWrap}
              activeOpacity={0.75}
              onPress={() => setParkPickerVisible(true)}
            >
              <View style={styles.inputIconWrap}>
                <Ionicons name="business-outline" size={15} color={colors.primary} />
              </View>
              <AppText style={[styles.input, !parkDisplayName && styles.pickerPlaceholder]} numberOfLines={1}>
                {parkDisplayName || t('register.parkNamePlaceholder')}
              </AppText>
              <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
            </TouchableOpacity>
            {isNewPark && (
              <View style={styles.newParkBadge}>
                <Ionicons name="add-circle" size={13} color={colors.primary} />
                <AppText style={styles.newParkBadgeText}>{t('register.parkNewBadge')}</AppText>
              </View>
            )}
            <AppText style={styles.parkHint}>{t('register.parkHint')}</AppText>

            <AppText style={styles.fieldLabel}>{t('register.houseNo')}</AppText>
            <View style={styles.inputWrap}>
              <View style={styles.inputIconWrap}>
                <Ionicons name="home-outline" size={15} color={colors.primary} />
              </View>
              <TextInput
                value={houseNo}
                onChangeText={setHouseNo}
                placeholder={t('register.houseNoPlaceholder')}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                editable={!!selectedPark}
                style={styles.input}
              />
            </View>
            {houseCheck.status === 'checking' && (
              <View style={styles.houseStatusRow}>
                <ActivityIndicator size="small" color={colors.textMuted} />
                <AppText style={styles.houseStatusMuted}>{t('register.houseChecking')}</AppText>
              </View>
            )}
            {houseCheck.status === 'available' && (
              <View style={styles.houseStatusRow}>
                <Ionicons name="checkmark-circle" size={15} color={colors.primary} />
                <AppText style={styles.houseStatusOk}>{t('register.houseAvailable')}</AppText>
              </View>
            )}
            {houseCheck.status === 'taken' && (
              <View style={styles.houseStatusRow}>
                <Ionicons name="alert-circle" size={15} color={colors.danger} />
                <AppText style={styles.houseStatusTaken}>
                  {t('register.houseTaken', { owner: houseCheck.ownerName ?? '' })}
                </AppText>
              </View>
            )}

            <Field
              label={t('common.address')}
              icon="home-outline"
              value={address}
              onChangeText={setAddress}
              placeholder={t('register.addressPlaceholder')}
              multiline
            />
            <View style={styles.row}>
              <Field
                label={t('common.postcode')}
                icon="location-outline"
                value={postcode}
                onChangeText={setPostcode}
                placeholder={t('register.postcodePlaceholder')}
                keyboardType="number-pad"
                maxLength={5}
                style={{ flex: 1 }}
              />
              <SelectField
                label={t('common.state')}
                icon="flag-outline"
                value={state}
                options={MALAYSIA_STATE_OPTIONS}
                placeholder={t('register.statePlaceholder')}
                onSelect={setState}
                style={{ flex: 2 }}
              />
            </View>
            <SelectField
              label={t('common.district')}
              icon="map-outline"
              value={district}
              options={SELANGOR_DISTRICTS as unknown as string[]}
              placeholder={t('register.districtPlaceholder')}
              onSelect={(value) => setDistrict(value as SelangorDistrict)}
            />
            <SelectField
              label={t('common.city')}
              icon="business-outline"
              value={city}
              options={SELANGOR_CITIES}
              placeholder={t('register.cityPlaceholder')}
              onSelect={setCity}
            />
            <Field label={t('register.password')} icon="lock-closed-outline" value={password} onChangeText={setPassword} placeholder={t('register.passwordPlaceholder')} secureTextEntry />
            <PasswordStrengthChecklist password={password} />
            <Field label={t('register.confirmPassword')} icon="lock-closed-outline" value={confirmPassword} onChangeText={setConfirmPassword} placeholder={t('register.confirmPasswordPlaceholder')} secureTextEntry />
            <PasswordMatchIndicator password={password} confirmPassword={confirmPassword} />

            <TouchableOpacity style={styles.pdpaRow} activeOpacity={0.75} onPress={() => setPdpaConsent((v) => !v)}>
              <Ionicons name={pdpaConsent ? 'checkbox' : 'square-outline'} size={20} color={colors.primary} />
              <AppText style={styles.pdpaText}>
                {t('register.pdpaConsent')}{' '}
                <AppText style={styles.pdpaLink} onPress={() => navigation.navigate('PdpaNotice')}>
                  {t('register.pdpaReadMore')}
                </AppText>
              </AppText>
            </TouchableOpacity>

            {error ? <AppText style={styles.error}>{error}</AppText> : null}

            <Button
              label={t('register.submit')}
              onPress={handleRegister}
              loading={loading}
              style={styles.submitButton}
            />

            <View style={styles.footerRow}>
              <AppText style={styles.footerText}>{t('register.haveAccount')}</AppText>
              <AppText style={styles.link} onPress={() => navigation.navigate('Login')}>
                {t('register.loginLink')}
              </AppText>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <ParkSelectModal
        visible={parkPickerVisible}
        onClose={() => setParkPickerVisible(false)}
        onSelect={(park) => {
          setSelectedPark(park);
          setParkPickerVisible(false);
        }}
      />
    </View>
  );
}

function Field({
  label,
  icon,
  style,
  multiline,
  secureTextEntry,
  ...inputProps
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words';
  maxLength?: number;
  multiline?: boolean;
  style?: ViewStyle;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [visible, setVisible] = useState(false);
  return (
    <View style={style}>
      <AppText style={styles.fieldLabel}>{label}</AppText>
      <View style={[styles.inputWrap, multiline && styles.inputWrapMultiline]}>
        <View style={styles.inputIconWrap}>
          <Ionicons name={icon} size={15} color={colors.primary} />
        </View>
        <TextInput
          {...inputProps}
          secureTextEntry={secureTextEntry && !visible}
          multiline={multiline}
          textAlignVertical="center"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, multiline && styles.inputMultiline]}
        />
        {secureTextEntry && (
          <Ionicons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={18}
            color={colors.textMuted}
            onPress={() => setVisible((v) => !v)}
          />
        )}
      </View>
    </View>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.primary,
      overflow: 'hidden',
    },
    backdropWatermarkTop: {
      position: 'absolute',
      right: -40,
      top: -30,
    },
    logoCircle: {
      alignSelf: 'center',
      marginTop: 48,
      marginBottom: spacing.sm,
      width: 56,
      height: 56,
      borderRadius: 28,
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
    cardWrap: {
      flex: 1,
    },
    card: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: radius.lg * 1.7,
      marginHorizontal: spacing.md,
      marginBottom: spacing.lg,
      ...shadow.card,
      overflow: 'hidden',
    },
    cardHandle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: radius.full,
      backgroundColor: colors.border,
      marginTop: spacing.sm,
    },
    cardContent: {
      padding: spacing.lg,
      paddingTop: spacing.md,
      flexGrow: 1,
    },
    title: {
      fontSize: 22,
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
    row: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    parkHint: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 4,
      lineHeight: 15,
    },
    pickerPlaceholder: {
      color: colors.textMuted,
    },
    newParkBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: spacing.xs,
    },
    newParkBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
    },
    houseStatusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: spacing.xs,
    },
    houseStatusMuted: {
      fontSize: 11.5,
      color: colors.textMuted,
    },
    houseStatusOk: {
      fontSize: 11.5,
      color: colors.primary,
      fontWeight: '600',
    },
    houseStatusTaken: {
      flex: 1,
      fontSize: 11.5,
      color: colors.danger,
      fontWeight: '600',
      lineHeight: 15,
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
      borderWidth: 1,
      borderColor: colors.background,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.sm,
      height: 56,
      gap: spacing.sm,
    },
    inputWrapMultiline: {
      alignItems: 'center',
      height: undefined,
      minHeight: 56,
      paddingVertical: spacing.sm,
    },
    inputIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: withAlpha(colors.primary, 0.12),
      alignItems: 'center',
      justifyContent: 'center',
    },
    inputMultiline: {
      minHeight: 34,
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
    },
    pdpaRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    pdpaText: {
      flex: 1,
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 17,
    },
    pdpaLink: {
      color: colors.primary,
      fontWeight: '700',
    },
    submitButton: {
      marginTop: spacing.lg,
      borderRadius: radius.full,
      paddingVertical: 16,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.28,
      shadowRadius: 12,
      elevation: 4,
    },
    error: {
      color: colors.danger,
      marginTop: spacing.md,
      fontSize: 13,
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
