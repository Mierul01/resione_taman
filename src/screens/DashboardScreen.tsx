import React, { useCallback, useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MainTabParamList } from '../navigation/types';
import { heroGradientDark, heroGradientLight, radius, shadow, spacing, withAlpha, ColorPalette } from '../theme/theme';
import { useAppTheme, useThemeColors, useThemeTypography } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth, User } from '../context/AuthContext';
import { usePayments } from '../context/PaymentContext';
import {
  Program,
  FeeItem,
  categoryColors,
  categoryIcons,
  emergencyContacts,
  notifications,
  formatNotificationDate,
  totalHouseholds,
} from '../data/mockData';
import { getAllPrograms } from '../data/programsStore';
import HighlightCarousel from '../components/HighlightCarousel';
import GradientBackground from '../components/GradientBackground';
import AppText from '../components/AppText';
import { toTitleCase } from '../utils/formatName';

type Props = BottomTabScreenProps<MainTabParamList, 'Dashboard'>;

const FEE_RING_SIZE = 78;
const FEE_RING_STROKE = 8;
const FEE_RING_RADIUS = (FEE_RING_SIZE - FEE_RING_STROKE) / 2;
const FEE_RING_CIRCUMFERENCE = 2 * Math.PI * FEE_RING_RADIUS;
const EXPLORE_CATEGORIES: Program['category'][] = ['Sukan', 'Gotong-Royong', 'Perayaan', 'Kursus'];

// Hand-picked stock placeholder photos (Lorem Picsum — free, royalty-free) shown
// until a park's AJK uploads a real photo for a program of that category.
const CATEGORY_FALLBACK_IMAGES: Record<Program['category'], string> = {
  Sukan: 'https://picsum.photos/id/1058/800/450', // stadium field
  'Gotong-Royong': 'https://picsum.photos/id/1043/800/450', // park/forest
  Perayaan: 'https://picsum.photos/id/225/800/450', // flowers, festive
  Kursus: 'https://picsum.photos/id/431/800/450', // coffee & notes, workshop feel
};

export default function DashboardScreen({ navigation }: Props) {
  const colors = useThemeColors();
  const { isDarkMode } = useAppTheme();
  const typography = useThemeTypography();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user, getParkUsers } = useAuth();
  const { getUserPaymentRecords, getFeeItems } = usePayments();
  const [upcoming, setUpcoming] = useState<Program[]>([]);
  const [upcomingAll, setUpcomingAll] = useState<Program[]>([]);
  const [feeItems, setFeeItemsState] = useState<FeeItem[]>([]);
  const [paidTotal, setPaidTotal] = useState(0);
  const [paidByItem, setPaidByItem] = useState<Record<string, number>>({});
  const [feeExpanded, setFeeExpanded] = useState(false);
  const [residentCount, setResidentCount] = useState<number | null>(null);
  const [committeePreview, setCommitteePreview] = useState<User[]>([]);
  const emergencyPreview = emergencyContacts.slice(0, 2);
  const unreadNotifications = notifications.filter((n) => n.unread);
  const latestNotification = unreadNotifications[0] ?? notifications[0];
  const notifLocale = language === 'ms' ? 'ms-MY' : 'en-GB';
  const isDependent = !!user?.dependentOf;
  const canViewCollections = user ? user.role !== 'resident' : false;

  useFocusEffect(
    useCallback(() => {
      const today = new Date().toISOString().slice(0, 10);
      getAllPrograms().then((all) => {
        const scoped = all.filter((p) => !p.parkName || p.parkName === user?.parkName);
        const next = scoped.filter((p) => p.dateISO >= today).sort((a, b) => a.dateISO.localeCompare(b.dateISO));
        setUpcomingAll(next);
        setUpcoming(next.slice(0, 5));
      });
    }, [user?.parkName])
  );

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      (async () => {
        const items = await getFeeItems(user.parkName);
        setFeeItemsState(items);
        let paid = 0;
        const byItem: Record<string, number> = {};
        for (const item of items) {
          const records = await getUserPaymentRecords(user.email, item.id);
          const itemPaid = records.reduce((sum, r) => sum + r.amount, 0);
          byItem[item.id] = itemPaid;
          paid += itemPaid;
        }
        setPaidTotal(paid);
        setPaidByItem(byItem);
      })();
    }, [user?.email, user?.parkName])
  );

  useFocusEffect(
    useCallback(() => {
      if (!user?.parkName) return;
      getParkUsers(user.parkName).then((parkUsers) => {
        setResidentCount(parkUsers.length);
        setCommitteePreview(
          parkUsers
            .filter((u) => u.role !== 'resident' && u.email !== user.email)
            .sort((a, b) => a.name.localeCompare(b.name))
            .slice(0, 2)
        );
      });
    }, [user?.parkName, user?.email])
  );

  const callNumber = (phone: string) => Linking.openURL(`tel:${phone}`);

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<Program['category'], number>> = {};
    upcomingAll.forEach((p) => {
      counts[p.category] = (counts[p.category] ?? 0) + 1;
    });
    return counts;
  }, [upcomingAll]);

  const totalFeeAmount = useMemo(() => feeItems.reduce((sum, item) => sum + item.amount, 0), [feeItems]);
  const feeRemaining = Math.max(0, totalFeeAmount - paidTotal);
  const feePct = totalFeeAmount > 0 ? Math.min(100, Math.round((paidTotal / totalFeeAmount) * 100)) : 0;

  const upcomingWithImages = useMemo(
    () => upcoming.map((program) => ({ ...program, imageUri: program.imageUri ?? CATEGORY_FALLBACK_IMAGES[program.category] })),
    [upcoming]
  );

  const quickActions: { key: string; icon: keyof typeof Ionicons.glyphMap; label: string; route: keyof MainTabParamList }[] = [
    { key: 'pay', icon: 'card', label: t('dashboard.tabPayments'), route: 'Payments' },
    { key: 'programs', icon: 'calendar', label: t('dashboard.tabPrograms'), route: 'Programs' },
    { key: 'charity', icon: 'heart', label: t('dashboard.tabCharity'), route: 'Charity' },
    { key: 'committee', icon: 'people', label: t('dashboard.tabCommittee'), route: 'Committee' },
    canViewCollections
      ? { key: 'reports', icon: 'stats-chart', label: t('dashboard.tabCollections'), route: 'Collections' }
      : { key: 'profile', icon: 'person', label: t('dashboard.tabProfile'), route: 'Profile' },
  ];

  const stats = [
    {
      key: 'residents',
      icon: 'people' as const,
      color: '#2E6FD9',
      value: residentCount ?? '—',
      label: t('dashboard.statResidents'),
      pct: residentCount ? Math.min(100, (residentCount / totalHouseholds) * 100) : 0,
      onPress: () => navigation.navigate('Committee'),
    },
    {
      key: 'programs',
      icon: 'calendar' as const,
      color: '#1B7A43',
      value: upcoming.length,
      label: t('dashboard.statPrograms'),
      pct: Math.min(100, (upcoming.length / 5) * 100),
      onPress: () => navigation.navigate('Programs'),
    },
    {
      key: 'family',
      icon: 'home' as const,
      color: '#D9862E',
      value: (user?.familyMembers?.length ?? 0) + 1,
      label: t('dashboard.statFamily'),
      pct: Math.min(100, (((user?.familyMembers?.length ?? 0) + 1) / 6) * 100),
      onPress: () => navigation.navigate('Profile'),
    },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: spacing.xl }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <GradientBackground colors={isDarkMode ? heroGradientDark : heroGradientLight} />
        <View style={styles.glowLarge} />
        <View style={styles.glowSmall} />
        <Ionicons name="leaf" size={150} color="rgba(255,255,255,0.07)" style={styles.heroWatermark} />

        <View style={[styles.topBar, { paddingTop: insets.top + spacing.md }]}>
          <View style={styles.topBarBrand}>
            <View style={styles.topBarLogo}>
              <Ionicons name="leaf" size={16} color={colors.white} />
            </View>
            <AppText style={styles.topBarTitle}>{t('common.appName').toUpperCase()}</AppText>
          </View>
          <View style={styles.topBarActions}>
            <TouchableOpacity
              style={styles.glassIconButton}
              activeOpacity={0.8}
              onPress={() => (navigation as any).navigate('Notifications')}
            >
              <Ionicons name="notifications-outline" size={19} color={colors.white} />
              {unreadNotifications.length > 0 && <View style={styles.notificationDot} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.glassIconButton}
              activeOpacity={0.8}
              onPress={() => (navigation as any).navigate('Settings')}
            >
              <Ionicons name="settings-outline" size={19} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.greetingRow}>
          <View style={styles.greetingTextWrap}>
            <AppText style={styles.greetingCaption}>{t('dashboard.welcome')}</AppText>
            <AppText style={styles.greetingName} numberOfLines={1} ellipsizeMode="tail">
              {user?.name ? toTitleCase(user.name) : t('role.resident')}
            </AppText>
            <View style={styles.parkRow}>
              <Ionicons name="location" size={12} color="rgba(255,255,255,0.85)" />
              <AppText style={styles.greetingSubtitle} numberOfLines={1}>
                {user?.parkName}
              </AppText>
            </View>
          </View>
          <TouchableOpacity style={styles.avatar} activeOpacity={0.85} onPress={() => navigation.navigate('Profile')}>
            <Ionicons name="person" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.heroCardsRow}>
          <TouchableOpacity
            style={[styles.glassCard, styles.ringCard]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Payments')}
          >
            <View style={styles.feeRingWrap}>
              <Svg width={FEE_RING_SIZE} height={FEE_RING_SIZE} style={{ transform: [{ rotate: '-90deg' }] }}>
                <Circle
                  cx={FEE_RING_SIZE / 2}
                  cy={FEE_RING_SIZE / 2}
                  r={FEE_RING_RADIUS}
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth={FEE_RING_STROKE}
                  fill="none"
                />
                <Circle
                  cx={FEE_RING_SIZE / 2}
                  cy={FEE_RING_SIZE / 2}
                  r={FEE_RING_RADIUS}
                  stroke="#FFFFFF"
                  strokeWidth={FEE_RING_STROKE}
                  fill="none"
                  strokeDasharray={`${FEE_RING_CIRCUMFERENCE} ${FEE_RING_CIRCUMFERENCE}`}
                  strokeDashoffset={FEE_RING_CIRCUMFERENCE * (1 - feePct / 100)}
                  strokeLinecap="round"
                />
              </Svg>
              <AppText style={styles.feeRingLabel}>{feePct}%</AppText>
            </View>
            <AppText style={styles.ringCaption}>{t('dashboard.feeStatusTitle')}</AppText>
          </TouchableOpacity>

          <View style={[styles.glassCard, styles.balanceCard]}>
            <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('Payments')}>
              <View style={styles.balanceHeader}>
                <AppText style={styles.balanceTitle}>{t('dashboard.balanceTitle')}</AppText>
                <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.8)" />
              </View>
              {feeRemaining > 0 ? (
                <AppText style={styles.balanceAmount} numberOfLines={1} adjustsFontSizeToFit>
                  RM {feeRemaining.toFixed(2)}
                </AppText>
              ) : (
                <View style={styles.settledRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <AppText style={styles.settledText}>{t('dashboard.feeSettledShort')}</AppText>
                </View>
              )}
              <AppText style={styles.balanceSub} numberOfLines={2}>
                {t('dashboard.feeProgress', { paid: paidTotal.toFixed(2), total: totalFeeAmount.toFixed(2) })}
              </AppText>
            </TouchableOpacity>
            <View style={styles.balanceFooter}>
              <TouchableOpacity
                style={styles.breakdownToggle}
                activeOpacity={0.7}
                onPress={() => setFeeExpanded((v) => !v)}
              >
                <AppText style={styles.breakdownToggleText}>
                  {t('dashboard.feeBreakdownShort')}
                </AppText>
                <Ionicons name={feeExpanded ? 'chevron-up' : 'chevron-down'} size={13} color="#FFFFFF" />
              </TouchableOpacity>
              {!isDependent && feeRemaining > 0 && (
                <TouchableOpacity style={styles.payPill} activeOpacity={0.85} onPress={() => navigation.navigate('Payments')}>
                  <AppText style={styles.payPillText}>{t('payments.payNow')}</AppText>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {feeExpanded && (
          <View style={[styles.glassCard, styles.breakdownPanel]}>
            {feeItems.map((item) => {
              const itemPaid = paidByItem[item.id] ?? 0;
              const isPaid = itemPaid >= item.amount;
              return (
                <View key={item.id} style={styles.feeItemRow}>
                  <Ionicons
                    name={isPaid ? 'checkmark-circle' : 'time-outline'}
                    size={16}
                    color={isPaid ? '#8CF0B5' : '#FFD58A'}
                  />
                  <AppText style={styles.feeItemTitle} numberOfLines={1}>
                    {item.title}
                  </AppText>
                  <AppText style={[styles.feeItemStatus, { color: isPaid ? '#8CF0B5' : '#FFD58A' }]}>
                    {isPaid ? t('dashboard.feePaid') : t('dashboard.feeUnpaid')}
                  </AppText>
                </View>
              );
            })}
          </View>
        )}

        <TouchableOpacity
          style={[styles.glassCard, styles.notifPill]}
          activeOpacity={0.85}
          onPress={() => (navigation as any).navigate('Notifications')}
        >
          <View style={styles.notifPillIcon}>
            <Ionicons name={latestNotification.icon} size={16} color={colors.white} />
          </View>
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <AppText style={styles.notifPillTitle} numberOfLines={1}>
              {t(latestNotification.titleKey)}
            </AppText>
            <AppText style={styles.notifPillSub} numberOfLines={1}>
              {t(latestNotification.bodyKey)}
            </AppText>
          </View>
          {unreadNotifications.length > 0 && (
            <View style={styles.notifBadge}>
              <AppText style={styles.notifBadgeText}>{t('dashboard.newCount', { count: unreadNotifications.length })}</AppText>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.quickRow}>
          {quickActions.map((a) => (
            <TouchableOpacity
              key={a.key}
              style={styles.quickItem}
              activeOpacity={0.8}
              onPress={() => navigation.navigate(a.route as never)}
            >
              <View style={styles.quickIcon}>
                <Ionicons name={a.icon} size={22} color={colors.white} />
              </View>
              <AppText style={styles.quickLabel} numberOfLines={1}>
                {a.label}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />

        <View style={styles.sectionRow}>
          <AppText style={styles.sectionTitle}>{t('dashboard.upcomingPrograms')}</AppText>
          <AppText style={styles.linkText} onPress={() => navigation.navigate('Programs')}>
            {t('dashboard.viewAll')}
          </AppText>
        </View>
        {upcomingWithImages.length > 0 ? (
          <HighlightCarousel
            programs={upcomingWithImages}
            onPressItem={(program) => (navigation as any).navigate('ProgramDetail', { programId: program.id })}
          />
        ) : (
          <View style={styles.emptyCard}>
            <AppText style={typography.caption}>{t('dashboard.noUpcoming')}</AppText>
          </View>
        )}

        <AppText style={styles.sectionTitleStandalone}>{t('dashboard.exploreCategories')}</AppText>
        <View style={styles.exploreGrid}>
          {EXPLORE_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.exploreCard,
                { backgroundColor: categoryColors[cat], shadowColor: categoryColors[cat], shadowOpacity: 0.38 },
              ]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Programs', { category: cat })}
            >
              <Ionicons
                name={categoryIcons[cat]}
                size={64}
                color="rgba(255,255,255,0.16)"
                style={styles.exploreWatermark}
              />
              <View style={styles.exploreIconWrap}>
                <Ionicons name={categoryIcons[cat]} size={18} color={colors.white} />
              </View>
              <AppText style={styles.exploreLabel}>{t(`category.${cat}`)}</AppText>
              <AppText style={styles.exploreCount}>
                {t('dashboard.categoryCount', { count: categoryCounts[cat] ?? 0 })}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.statsRow}>
          {stats.map((s) => (
            <TouchableOpacity
              key={s.key}
              style={[styles.statCard, { backgroundColor: withAlpha(s.color, isDarkMode ? 0.22 : 0.12) }]}
              activeOpacity={0.8}
              onPress={s.onPress}
            >
              <View style={[styles.statIconWrap, { backgroundColor: s.color }]}>
                <Ionicons name={s.icon} size={15} color="#FFFFFF" />
              </View>
              <AppText style={styles.statValue}>{s.value}</AppText>
              <AppText style={styles.statLabel} numberOfLines={1}>
                {s.label}
              </AppText>
              <View style={[styles.statTrack, { backgroundColor: withAlpha(s.color, 0.2) }]}>
                <View style={[styles.statFill, { width: `${Math.max(s.pct, 6)}%`, backgroundColor: s.color }]} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {committeePreview.length > 0 && (
          <>
            <View style={styles.sectionRow}>
              <AppText style={styles.sectionTitle}>{t('committee.committeeSection')}</AppText>
              <AppText style={styles.linkText} onPress={() => navigation.navigate('Committee')}>
                {t('dashboard.viewAll')}
              </AppText>
            </View>
            <View style={styles.listCard}>
              {committeePreview.map((member, idx) => (
                <TouchableOpacity
                  key={member.email}
                  style={[styles.committeeRow, idx > 0 && styles.rowDivider]}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('Committee')}
                >
                  <View style={styles.committeeAvatar}>
                    <Ionicons name="person" size={16} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <AppText style={styles.committeeName} numberOfLines={1}>
                      {toTitleCase(member.name)}
                    </AppText>
                    <AppText style={styles.committeeRole}>{t(`role.${member.role}`)}</AppText>
                  </View>
                  <TouchableOpacity
                    style={styles.committeeCallButton}
                    activeOpacity={0.8}
                    onPress={() => callNumber(member.phone)}
                  >
                    <Ionicons name="call" size={15} color={colors.white} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <AppText style={styles.sectionTitleStandalone}>{t('dashboard.emergencyContacts')}</AppText>
        <View style={styles.emergencyRow}>
          {emergencyPreview.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={styles.emergencyCard}
              activeOpacity={0.85}
              onPress={() => callNumber(c.phone)}
            >
              <View style={styles.emergencyIconWrap}>
                <Ionicons name="call" size={15} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <AppText style={styles.emergencyRole} numberOfLines={2}>
                  {t(`emergencyContact.${c.id}Role`)}
                </AppText>
                <AppText style={styles.emergencyPhone}>{c.phone}</AppText>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    hero: {
      backgroundColor: colors.primaryDark,
      overflow: 'hidden',
      paddingBottom: spacing.xl + spacing.sm,
    },
    glowLarge: {
      position: 'absolute',
      width: 260,
      height: 260,
      borderRadius: 130,
      right: -90,
      top: -70,
      backgroundColor: 'rgba(255,255,255,0.09)',
    },
    glowSmall: {
      position: 'absolute',
      width: 160,
      height: 160,
      borderRadius: 80,
      left: -60,
      bottom: 40,
      backgroundColor: 'rgba(242,169,59,0.10)',
    },
    heroWatermark: {
      position: 'absolute',
      right: -24,
      top: 60,
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
    },
    topBarBrand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs + 2,
    },
    topBarLogo: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.22)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    topBarTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.white,
      letterSpacing: 0.8,
    },
    topBarActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    glassIconButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: 'rgba(255,255,255,0.16)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.25)',
      alignItems: 'center',
      justifyContent: 'center',
      ...shadow.glass,
      shadowOpacity: 0.22,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 5 },
    },
    notificationDot: {
      position: 'absolute',
      top: 8,
      right: 9,
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: '#FF5A5F',
      borderWidth: 1.5,
      borderColor: '#14532D',
    },
    greetingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      marginTop: spacing.md,
    },
    greetingTextWrap: {
      flex: 1,
      minWidth: 0,
      marginRight: spacing.md,
    },
    greetingCaption: {
      fontSize: 12.5,
      color: 'rgba(255,255,255,0.8)',
    },
    greetingName: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.white,
      marginTop: 1,
    },
    parkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 3,
    },
    greetingSubtitle: {
      fontSize: 12.5,
      color: 'rgba(255,255,255,0.85)',
      flexShrink: 1,
    },
    avatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.45)',
      ...shadow.glass,
      shadowOpacity: 0.28,
      shadowRadius: 12,
    },
    heroCardsRow: {
      flexDirection: 'row',
      gap: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      marginTop: spacing.md,
    },
    glassCard: {
      backgroundColor: 'rgba(255,255,255,0.14)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.26)',
      borderRadius: radius.lg,
      ...shadow.glass,
    },
    ringCard: {
      width: 112,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md - 2,
    },
    feeRingWrap: {
      width: FEE_RING_SIZE,
      height: FEE_RING_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    feeRingLabel: {
      position: 'absolute',
      fontSize: 18,
      fontWeight: '800',
      color: colors.white,
    },
    ringCaption: {
      fontSize: 11.5,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.9)',
      marginTop: spacing.sm,
    },
    balanceCard: {
      flex: 1,
      padding: spacing.md - 2,
      justifyContent: 'space-between',
    },
    balanceHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    balanceTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.85)',
    },
    balanceAmount: {
      fontSize: 25,
      fontWeight: '800',
      color: colors.white,
      marginTop: 2,
    },
    settledRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
    },
    settledText: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.white,
    },
    balanceSub: {
      fontSize: 11,
      lineHeight: 15,
      color: 'rgba(255,255,255,0.75)',
      marginTop: 2,
    },
    balanceFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.sm,
    },
    breakdownToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    breakdownToggleText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.white,
    },
    payPill: {
      backgroundColor: colors.white,
      borderRadius: radius.full,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 6,
      marginLeft: spacing.sm,
      ...shadow.glass,
      shadowOpacity: 0.3,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    payPillText: {
      fontSize: 11.5,
      fontWeight: '800',
      color: '#12522D',
    },
    breakdownPanel: {
      marginHorizontal: spacing.md,
      marginTop: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    feeItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: 5,
    },
    feeItemTitle: {
      flex: 1,
      fontSize: 12.5,
      color: colors.white,
    },
    feeItemStatus: {
      fontSize: 11.5,
      fontWeight: '800',
    },
    notifPill: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: spacing.md,
      marginTop: spacing.sm + 2,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md - 2,
      borderRadius: radius.full,
    },
    notifPillIcon: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: 'rgba(255,255,255,0.22)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    notifPillTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.white,
    },
    notifPillSub: {
      fontSize: 11.5,
      color: 'rgba(255,255,255,0.8)',
      marginTop: 1,
    },
    notifBadge: {
      backgroundColor: '#FF5A5F',
      borderRadius: radius.full,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      marginLeft: spacing.sm,
    },
    notifBadgeText: {
      fontSize: 10.5,
      fontWeight: '800',
      color: colors.white,
    },
    quickRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      marginTop: spacing.md,
    },
    quickItem: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
    },
    quickIcon: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: 'rgba(255,255,255,0.16)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.28)',
      alignItems: 'center',
      justifyContent: 'center',
      ...shadow.glass,
      shadowOpacity: 0.26,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 7 },
    },
    quickLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.white,
    },
    sheet: {
      backgroundColor: colors.background,
      marginTop: -spacing.lg,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingTop: spacing.sm,
      ...shadow.sheet,
    },
    sheetHandle: {
      alignSelf: 'center',
      width: 38,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: spacing.xs,
    },
    sectionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginHorizontal: spacing.md,
      marginTop: spacing.md - 2,
      marginBottom: spacing.sm,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
    },
    sectionTitleStandalone: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
      marginHorizontal: spacing.md,
      marginTop: spacing.md - 2,
      marginBottom: spacing.sm,
    },
    linkText: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: 13,
    },
    emptyCard: {
      backgroundColor: colors.surface,
      marginHorizontal: spacing.md,
      borderRadius: radius.md,
      padding: spacing.md,
      ...shadow.card,
    },
    exploreGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginHorizontal: spacing.md,
      rowGap: spacing.sm + 2,
    },
    exploreCard: {
      width: '48.5%',
      height: 104,
      borderRadius: radius.lg,
      padding: spacing.md - 2,
      overflow: 'hidden',
      justifyContent: 'flex-end',
      ...shadow.card,
      shadowRadius: 16,
    },
    exploreWatermark: {
      position: 'absolute',
      right: -12,
      top: -10,
    },
    exploreIconWrap: {
      position: 'absolute',
      top: spacing.md - 2,
      left: spacing.md - 2,
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: 'rgba(255,255,255,0.25)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    exploreLabel: {
      fontSize: 14.5,
      fontWeight: '800',
      color: colors.white,
    },
    exploreCount: {
      fontSize: 11.5,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.9)',
      marginTop: 1,
    },
    statsRow: {
      flexDirection: 'row',
      gap: spacing.sm + 2,
      marginHorizontal: spacing.md,
      marginTop: spacing.md - 2,
    },
    statCard: {
      flex: 1,
      borderRadius: radius.md,
      padding: spacing.md - 2,
      ...shadow.card,
    },
    statIconWrap: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statValue: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
      marginTop: spacing.sm,
    },
    statLabel: {
      fontSize: 11.5,
      color: colors.textMuted,
      marginTop: 1,
    },
    statTrack: {
      height: 4,
      borderRadius: 2,
      marginTop: spacing.sm,
      overflow: 'hidden',
    },
    statFill: {
      height: '100%',
      borderRadius: 2,
    },
    listCard: {
      backgroundColor: colors.surface,
      marginHorizontal: spacing.md,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md - 2,
      ...shadow.card,
    },
    rowDivider: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    committeeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm + 2,
    },
    committeeAvatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: withAlpha(colors.primary, 0.14),
      alignItems: 'center',
      justifyContent: 'center',
    },
    committeeName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    committeeRole: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 1,
    },
    committeeCallButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emergencyRow: {
      flexDirection: 'row',
      paddingHorizontal: spacing.md,
      gap: spacing.sm + 2,
    },
    emergencyCard: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: withAlpha('#D64545', 0.12),
      borderRadius: radius.md,
      padding: spacing.md - 2,
      ...shadow.card,
      shadowColor: '#D64545',
      shadowOpacity: 0.18,
    },
    emergencyIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#D64545',
      alignItems: 'center',
      justifyContent: 'center',
    },
    emergencyRole: {
      fontSize: 12,
      color: colors.textMuted,
    },
    emergencyPhone: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
      marginTop: 1,
    },
  });
