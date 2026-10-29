import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { radius, shadow, spacing, withAlpha, ColorPalette } from '../theme/theme';
import { useThemeColors } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import type { MainTabParamList } from './types';
import AppText from '../components/AppText';

const TAB_BAR_BG = '#0E1411';
const TAB_ACTIVE = '#4CCB85';
const TAB_INACTIVE = '#8A9690';

const PRIMARY_ROUTE_NAMES: (keyof MainTabParamList)[] = ['Dashboard', 'Payments', 'Committee', 'Profile'];

const icons: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
  Dashboard: 'home',
  Programs: 'calendar',
  Payments: 'card',
  Charity: 'heart',
  Committee: 'people',
  Collections: 'stats-chart',
  Profile: 'person',
};

const labelKeys: Record<keyof MainTabParamList, string> = {
  Dashboard: 'dashboard.tabHome',
  Programs: 'dashboard.tabPrograms',
  Payments: 'dashboard.tabPayments',
  Charity: 'dashboard.tabCharity',
  Committee: 'dashboard.tabCommittee',
  Collections: 'dashboard.tabCollections',
  Profile: 'dashboard.tabProfile',
};

export default function CustomTabBar({ state, navigation, insets }: BottomTabBarProps) {
  const colors = useThemeColors();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [moreOpen, setMoreOpen] = useState(false);

  const routes = state.routes as { key: string; name: keyof MainTabParamList }[];
  const primaryRoutes = PRIMARY_ROUTE_NAMES.map((name) => routes.find((r) => r.name === name)).filter(
    (r): r is { key: string; name: keyof MainTabParamList } => !!r
  );
  const overflowRoutes = routes.filter((r) => !PRIMARY_ROUTE_NAMES.includes(r.name));
  const focusedRoute = routes[state.index];
  const isOverflowFocused = overflowRoutes.some((r) => r.key === focusedRoute.key);

  const goTo = (name: keyof MainTabParamList) => {
    setMoreOpen(false);
    navigation.navigate(name as never);
  };

  return (
    <>
      <View style={[styles.tabBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        {primaryRoutes.map((route, idx) => {
          const focused = focusedRoute.key === route.key;
          return (
            <React.Fragment key={route.key}>
              <TouchableOpacity
                style={styles.tabItem}
                activeOpacity={0.75}
                onPress={() => !focused && goTo(route.name)}
              >
                <Ionicons
                  name={focused ? icons[route.name] : (`${icons[route.name]}-outline` as keyof typeof Ionicons.glyphMap)}
                  size={22}
                  color={focused ? TAB_ACTIVE : TAB_INACTIVE}
                />
                <AppText style={[styles.tabLabel, { color: focused ? TAB_ACTIVE : TAB_INACTIVE }]} numberOfLines={1}>
                  {t(labelKeys[route.name])}
                </AppText>
              </TouchableOpacity>
              {idx === 1 && overflowRoutes.length > 0 && (
                <View style={styles.centerSlot}>
                  <TouchableOpacity
                    style={[styles.centerButton, (moreOpen || isOverflowFocused) && styles.centerButtonActive]}
                    activeOpacity={0.85}
                    onPress={() => setMoreOpen(true)}
                  >
                    <Ionicons name="add" size={26} color={colors.white} />
                  </TouchableOpacity>
                  <AppText
                    style={[
                      styles.tabLabel,
                      styles.centerLabel,
                      { color: moreOpen || isOverflowFocused ? TAB_ACTIVE : TAB_INACTIVE },
                    ]}
                    numberOfLines={1}
                  >
                    {t('dashboard.tabMore')}
                  </AppText>
                </View>
              )}
            </React.Fragment>
          );
        })}
      </View>

      <Modal visible={moreOpen} transparent animationType="slide" onRequestClose={() => setMoreOpen(false)}>
        <View style={styles.modalRoot}>
          <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFillObject} />
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMoreOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.sheetHandle} />
            <AppText style={styles.sheetTitle}>{t('dashboard.moreMenuTitle')}</AppText>
            {overflowRoutes.map((route) => {
              const focused = focusedRoute.key === route.key;
              return (
                <TouchableOpacity
                  key={route.key}
                  style={styles.sheetItem}
                  activeOpacity={0.75}
                  onPress={() => goTo(route.name)}
                >
                  <View style={[styles.sheetIconWrap, focused && { backgroundColor: withAlpha(colors.primary, 0.15) }]}>
                    <Ionicons name={icons[route.name]} size={20} color={colors.primary} />
                  </View>
                  <AppText style={styles.sheetItemLabel}>{t(labelKeys[route.name])}</AppText>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    tabBar: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingTop: spacing.sm,
      paddingHorizontal: spacing.xs,
      backgroundColor: TAB_BAR_BG,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      overflow: 'visible',
      ...shadow.sheet,
    },
    tabItem: {
      flex: 1,
      alignItems: 'center',
      gap: 3,
      paddingVertical: 4,
    },
    tabLabel: {
      fontSize: 10.5,
      fontWeight: '600',
    },
    centerSlot: {
      flex: 1,
      alignItems: 'center',
      marginTop: -26,
    },
    centerButton: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: '#1F9A55',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: TAB_BAR_BG,
      ...shadow.card,
    },
    centerButtonActive: {
      backgroundColor: '#2FBF6E',
    },
    centerLabel: {
      marginTop: 6,
    },
    modalRoot: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.15)',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingTop: spacing.sm,
      ...shadow.sheet,
      paddingHorizontal: spacing.lg,
    },
    sheetHandle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: spacing.md,
    },
    sheetTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing.md,
    },
    sheetItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      gap: spacing.md,
    },
    sheetIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: withAlpha(colors.primary, 0.12),
    },
    sheetItemLabel: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
  });
