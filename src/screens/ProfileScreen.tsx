import React, { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { radius, shadow, spacing, withAlpha, ColorPalette } from '../theme/theme';
import { useThemeColors, useThemeTypography } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import ScreenHeader from '../components/ScreenHeader';
import Button from '../components/Button';
import AppModal from '../components/AppModal';
import { useAuth, Role } from '../context/AuthContext';
import AppText from '../components/AppText';
import { toTitleCase } from '../utils/formatName';

const RELATIONSHIPS = ['Isteri', 'Suami', 'Anak', 'Ibu', 'Bapa', 'Lain-lain'];

export default function ProfileScreen() {
  const colors = useThemeColors();
  const typography = useThemeTypography();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user, logout, addFamilyMember, removeFamilyMember, addFamilyMemberWithLogin } = useAuth();
  const navigation = useNavigation<any>();
  const [confirmLogout, setConfirmLogout] = useState(false);

  const [familyVisible, setFamilyVisible] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [memberRelationship, setMemberRelationship] = useState(RELATIONSHIPS[0]);
  const [memberAge, setMemberAge] = useState('');
  const [createLogin, setCreateLogin] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPassword, setMemberPassword] = useState('');
  const [savingMember, setSavingMember] = useState(false);
  const [memberError, setMemberError] = useState('');

  const openAddFamily = () => {
    setMemberName('');
    setMemberRelationship(RELATIONSHIPS[0]);
    setMemberAge('');
    setCreateLogin(false);
    setMemberEmail('');
    setMemberPassword('');
    setMemberError('');
    setFamilyVisible(true);
  };

  const handleSaveMember = async () => {
    if (!memberName.trim()) return;
    if (createLogin && (!memberEmail.trim() || memberPassword.length < 6)) {
      setMemberError(t('profile.memberLoginError'));
      return;
    }
    setMemberError('');
    setSavingMember(true);
    const newMemberId = `fm_${Date.now()}`;
    const newMember = {
      id: newMemberId,
      name: memberName.trim(),
      relationship: memberRelationship,
      age: memberAge.trim() || undefined,
    };
    if (createLogin) {
      const result = await addFamilyMemberWithLogin(newMember, {
        email: memberEmail.trim(),
        password: memberPassword,
      });
      if (!result.success) {
        setMemberError(t(result.messageKey ?? 'profile.memberCreateFailed'));
        setSavingMember(false);
        return;
      }
    } else {
      await addFamilyMember(newMember);
    }
    setSavingMember(false);
    setFamilyVisible(false);
  };

  const infoRows = [
    { key: 'email', icon: 'mail-outline' as const, label: t('common.email'), value: user?.email || '-', showVerifyBadge: true },
    { key: 'phone', icon: 'call-outline' as const, label: t('common.phone'), value: user?.phone || '-' },
    { key: 'address', icon: 'home-outline' as const, label: t('common.address'), value: user?.address ? toTitleCase(user.address) : '-' },
    {
      key: 'postcodeCity',
      icon: 'location-outline' as const,
      label: t('profile.postcodeCity'),
      value:
        [user?.postcode, user?.city && toTitleCase(user.city), user?.district && toTitleCase(user.district)]
          .filter(Boolean)
          .join(', ') || '-',
    },
  ];

  const actionRows = [
    {
      key: 'update',
      icon: 'pencil' as const,
      label: t('profile.updateProfile'),
      onPress: () => navigation.navigate('ProfileEdit'),
      highlight: false,
    },
    {
      key: 'settings',
      icon: 'settings-outline' as const,
      label: t('profile.settings'),
      onPress: () => navigation.navigate('Settings'),
      highlight: false,
    },
    ...(user?.role === 'admin' || user?.role === 'chairman'
      ? [
          {
            key: 'admin',
            icon: 'shield-checkmark-outline' as const,
            label: t('profile.adminPanel'),
            onPress: () => navigation.navigate('AdminPanel'),
            highlight: true,
          },
        ]
      : []),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <ScreenHeader title={t('profile.title')} />

        <View style={styles.heroCard}>
          <View style={styles.avatarWrap}>
            {user?.avatarUri ? (
              <Image source={{ uri: user.avatarUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatar}>
                <Ionicons name="person" size={40} color={colors.white} />
              </View>
            )}
          </View>
          <AppText style={[typography.h3, styles.nameText]} numberOfLines={2} ellipsizeMode="tail">
            {toTitleCase(user?.name ?? '')}
          </AppText>
          <View style={styles.roleBadge}>
            <AppText style={styles.roleBadgeText}>{t(`role.${user?.role ?? 'resident'}`)}</AppText>
          </View>
          {user?.parkName ? (
            <View style={styles.parkRow}>
              <Ionicons name="business" size={13} color={colors.textMuted} />
              <AppText style={styles.parkRowText}>{toTitleCase(user.parkName)}</AppText>
            </View>
          ) : null}
        </View>

        <View style={styles.sectionCard}>
          {actionRows.map((row, idx) => (
            <TouchableOpacity
              key={row.key}
              style={[styles.actionRow, idx !== actionRows.length - 1 && styles.rowDivider]}
              activeOpacity={0.75}
              onPress={row.onPress}
            >
              <View style={[styles.actionIconWrap, row.highlight && styles.actionIconWrapHighlight]}>
                <Ionicons name={row.icon} size={18} color={row.highlight ? colors.white : colors.primary} />
              </View>
              <AppText style={[styles.actionLabel, row.highlight && styles.actionLabelHighlight]}>{row.label}</AppText>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoCard}>
          {infoRows.map((row, idx) => (
            <View key={row.key} style={[styles.infoRow, idx !== infoRows.length - 1 && styles.rowDivider]}>
              <View style={styles.infoIconWrap}>
                <Ionicons name={row.icon} size={16} color={colors.primary} />
              </View>
              <View style={{ marginLeft: spacing.md, flex: 1 }}>
                <AppText style={typography.caption}>{row.label}</AppText>
                <AppText style={typography.body}>{row.value}</AppText>
                {row.showVerifyBadge && (
                  <View style={styles.verifyRow}>
                    <Ionicons name="alert-circle-outline" size={12} color={colors.textMuted} />
                    <AppText style={styles.verifyRowText}>{t('profile.notVerified')}</AppText>
                    <TouchableOpacity activeOpacity={1} disabled>
                      <AppText style={styles.verifyLink}>{t('profile.verifyEmail')}</AppText>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.sectionRow}>
          <AppText style={styles.sectionTitle}>{t('profile.familyMembers')}</AppText>
        </View>
        <AppText style={styles.sectionSubtitle}>{t('profile.familyHint')}</AppText>

        <View style={styles.sectionCard}>
          {!user?.familyMembers?.length ? (
            <View style={styles.emptyFamily}>
              <View style={styles.emptyFamilyIconWrap}>
                <Ionicons name="people-outline" size={24} color={colors.primary} />
              </View>
              <AppText style={styles.emptyFamilyText}>{t('profile.noFamily')}</AppText>
            </View>
          ) : (
            user.familyMembers.map((member, idx) => (
              <View
                key={member.id}
                style={[styles.familyRow, idx !== user.familyMembers.length - 1 && styles.rowDivider]}
              >
                <View style={styles.familyAvatar}>
                  <Ionicons name="person" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <AppText style={typography.h3} numberOfLines={1}>
                    {member.name}
                  </AppText>
                  <View style={styles.familyMetaRow}>
                    <View style={styles.relationshipBadge}>
                      <AppText style={styles.relationshipBadgeText}>
                        {t(`relationship.${member.relationship}`)}
                      </AppText>
                    </View>
                    {member.age ? (
                      <AppText style={typography.caption}>{t('profile.yearsOld', { age: member.age })}</AppText>
                    ) : null}
                    {member.linkedEmail ? (
                      <Ionicons name="link" size={12} color={colors.textMuted} />
                    ) : null}
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  activeOpacity={0.8}
                  onPress={() => removeFamilyMember(member.id)}
                >
                  <Ionicons name="trash-outline" size={17} color={colors.danger} />
                </TouchableOpacity>
              </View>
            ))
          )}
          <TouchableOpacity style={styles.addMemberRow} activeOpacity={0.75} onPress={openAddFamily}>
            <View style={styles.addMemberIconWrap}>
              <Ionicons name="add" size={18} color={colors.primary} />
            </View>
            <AppText style={styles.addMemberLabel}>{t('profile.addMember')}</AppText>
          </TouchableOpacity>
        </View>

        <View style={styles.actions}>
          <Button label={t('profile.logOut')} variant="ghost" onPress={() => setConfirmLogout(true)} />
        </View>
      </ScrollView>

      <AppModal visible={confirmLogout} onClose={() => setConfirmLogout(false)}>
        <AppText style={[typography.h3, { textAlign: 'center' }]}>{t('profile.logOutConfirmTitle')}</AppText>
        <AppText style={[typography.caption, { textAlign: 'center', marginTop: spacing.xs }]}>
          {t('profile.logOutConfirmBody')}
        </AppText>
        <View style={styles.modalActions}>
          <Button label={t('common.cancel')} variant="ghost" onPress={() => setConfirmLogout(false)} style={{ flex: 1 }} />
          <Button
            label={t('profile.logOut')}
            variant="danger"
            onPress={() => {
              setConfirmLogout(false);
              logout();
            }}
            style={{ flex: 1 }}
          />
        </View>
      </AppModal>

      <AppModal visible={familyVisible} onClose={() => setFamilyVisible(false)}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <AppText style={typography.h3}>{t('profile.addFamilyTitle')}</AppText>
          <View style={{ marginTop: spacing.md }}>
            <AppText style={styles.fieldLabel}>{t('profile.memberName')}</AppText>
            <TextInput
              value={memberName}
              onChangeText={setMemberName}
              placeholder={t('profile.memberNamePlaceholder')}
              style={styles.input}
              placeholderTextColor={colors.textMuted}
            />
            <AppText style={styles.fieldLabel}>{t('profile.relationship')}</AppText>
            <View style={styles.chipRow}>
              {RELATIONSHIPS.map((rel) => (
                <TouchableOpacity
                  key={rel}
                  style={[styles.chip, memberRelationship === rel && styles.chipActive]}
                  onPress={() => setMemberRelationship(rel)}
                >
                  <AppText style={[styles.chipText, memberRelationship === rel && styles.chipTextActive]}>
                    {t(`relationship.${rel}`)}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
            <AppText style={styles.fieldLabel}>{t('profile.age')}</AppText>
            <TextInput
              value={memberAge}
              onChangeText={setMemberAge}
              keyboardType="number-pad"
              maxLength={3}
              placeholder={t('profile.agePlaceholder')}
              style={styles.input}
              placeholderTextColor={colors.textMuted}
            />

            <TouchableOpacity style={styles.toggleRow} onPress={() => setCreateLogin((v) => !v)}>
              <Ionicons name={createLogin ? 'checkbox' : 'square-outline'} size={20} color={colors.primary} />
              <AppText style={styles.toggleLabel}>{t('profile.createLoginToggle')}</AppText>
            </TouchableOpacity>

            {createLogin && (
              <>
                <AppText style={styles.toggleHint}>{t('profile.createLoginHint')}</AppText>
                <AppText style={styles.fieldLabel}>{t('profile.memberEmail')}</AppText>
                <TextInput
                  value={memberEmail}
                  onChangeText={setMemberEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder={t('login.emailPlaceholder')}
                  style={styles.input}
                  placeholderTextColor={colors.textMuted}
                />
                <AppText style={styles.fieldLabel}>{t('profile.memberPassword')}</AppText>
                <TextInput
                  value={memberPassword}
                  onChangeText={setMemberPassword}
                  secureTextEntry
                  placeholder={t('register.passwordPlaceholder')}
                  style={styles.input}
                  placeholderTextColor={colors.textMuted}
                />
              </>
            )}

            {memberError ? <AppText style={styles.errorText}>{memberError}</AppText> : null}
          </View>
          <View style={styles.modalActions}>
            <Button label={t('common.cancel')} variant="ghost" onPress={() => setFamilyVisible(false)} style={{ flex: 1 }} />
            <Button
              label={t('common.save')}
              onPress={handleSaveMember}
              loading={savingMember}
              disabled={!memberName.trim()}
              style={{ flex: 1 }}
            />
          </View>
        </ScrollView>
      </AppModal>
    </View>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    heroCard: {
      alignItems: 'center',
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      paddingTop: spacing.lg,
      paddingBottom: spacing.lg,
      paddingHorizontal: spacing.lg,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      ...shadow.card,
    },
    avatarWrap: {
      width: 88,
      height: 88,
      borderRadius: 44,
      marginBottom: spacing.sm,
      ...shadow.card,
    },
    avatar: {
      width: '100%',
      height: '100%',
      borderRadius: 44,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nameText: {
      textAlign: 'center',
      maxWidth: '100%',
    },
    roleBadge: {
      marginTop: 6,
      backgroundColor: withAlpha(colors.primary, 0.1),
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radius.full,
    },
    roleBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primaryDark,
    },
    parkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: spacing.sm,
    },
    parkRowText: {
      fontSize: 13,
      color: colors.textMuted,
      fontWeight: '600',
    },
    sectionCard: {
      backgroundColor: colors.surface,
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      ...shadow.card,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      gap: spacing.md,
    },
    actionIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: withAlpha(colors.primary, 0.1),
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionIconWrapHighlight: {
      backgroundColor: colors.primary,
    },
    actionLabel: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    actionLabelHighlight: {
      color: colors.primary,
    },
    infoCard: {
      backgroundColor: colors.surface,
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      borderRadius: radius.md,
      padding: spacing.md,
      ...shadow.card,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: spacing.sm,
    },
    infoIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: withAlpha(colors.primary, 0.1),
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    rowDivider: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    verifyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 4,
    },
    verifyRowText: {
      fontSize: 11,
      color: colors.textMuted,
    },
    verifyLink: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
      opacity: 0.6,
    },
    sectionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginHorizontal: spacing.lg,
      marginTop: spacing.xl,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.text,
    },
    sectionSubtitle: {
      fontSize: 13,
      color: colors.textMuted,
      marginHorizontal: spacing.lg,
      marginTop: 2,
      marginBottom: spacing.sm,
    },
    emptyFamily: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.lg,
      gap: spacing.xs,
    },
    emptyFamilyIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: withAlpha(colors.primary, 0.1),
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
    },
    emptyFamilyText: {
      color: colors.textMuted,
      fontSize: 13,
    },
    familyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
    },
    addMemberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
    },
    addMemberIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
    },
    addMemberLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primary,
    },
    familyAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: withAlpha(colors.primary, 0.12),
      alignItems: 'center',
      justifyContent: 'center',
    },
    familyMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: 4,
    },
    relationshipBadge: {
      backgroundColor: withAlpha(colors.accent, 0.15),
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.full,
    },
    relationshipBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#95601C',
    },
    removeButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: withAlpha(colors.danger, 0.1),
      alignItems: 'center',
      justifyContent: 'center',
    },
    actions: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.xl,
    },
    modalActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 6,
      marginTop: spacing.sm,
    },
    input: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      height: 46,
      fontSize: 14,
      color: colors.text,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    chip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    chipTextActive: {
      color: colors.white,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    toggleLabel: {
      flex: 1,
      fontSize: 13,
      color: colors.text,
    },
    toggleHint: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: spacing.xs,
      lineHeight: 16,
    },
    errorText: {
      color: colors.danger,
      fontSize: 12,
      marginTop: spacing.sm,
    },
  });
