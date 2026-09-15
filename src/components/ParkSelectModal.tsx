import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, withAlpha, ColorPalette } from '../theme/theme';
import { useThemeColors } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth, Park } from '../context/AuthContext';
import AppText from './AppText';

export type ParkSelection = { id: string; name: string } | { newName: string };

export default function ParkSelectModal({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (park: ParkSelection) => void;
}) {
  const colors = useThemeColors();
  const { t } = useLanguage();
  const { searchParks } = useAuth();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Park[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!visible) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const thisRequest = ++requestIdRef.current;
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      searchParks(query)
        .then((parks) => {
          if (requestIdRef.current === thisRequest) setResults(parks);
        })
        .finally(() => {
          if (requestIdRef.current === thisRequest) setLoading(false);
        });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, visible]);

  const trimmed = query.trim();
  const exactMatch = results.some((p) => p.name.toLowerCase() === trimmed.toLowerCase());

  const handleClose = () => {
    setQuery('');
    setResults([]);
    onClose();
  };

  const handleSelectExisting = (park: Park) => {
    setQuery('');
    setResults([]);
    onSelect({ id: park.id, name: park.name });
  };

  const handleCreateNew = () => {
    if (!trimmed) return;
    setQuery('');
    setResults([]);
    onSelect({ newName: trimmed });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFillObject} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <AppText style={styles.title}>{t('parkSelect.title')}</AppText>
            <TouchableOpacity onPress={handleClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('parkSelect.searchPlaceholder')}
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              autoFocus
            />
            {loading && <ActivityIndicator size="small" color={colors.primary} />}
            {!loading && query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: spacing.lg }}>
            {results.map((park) => {
              const subtitle = [park.district, park.state].filter(Boolean).join(', ');
              return (
                <TouchableOpacity key={park.id} style={styles.row} onPress={() => handleSelectExisting(park)}>
                  <View style={[styles.rowIcon, { backgroundColor: withAlpha(colors.primary, 0.1) }]}>
                    <Ionicons name="business-outline" size={16} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText style={styles.rowText}>{park.name}</AppText>
                    {!!subtitle && <AppText style={styles.rowSubtext}>{subtitle}</AppText>}
                  </View>
                </TouchableOpacity>
              );
            })}

            {!loading && results.length === 0 && trimmed.length > 0 && (
              <AppText style={styles.emptyText}>{t('parkSelect.noResults')}</AppText>
            )}

            {trimmed.length > 0 && !exactMatch && !loading && (
              <TouchableOpacity style={styles.customRow} onPress={handleCreateNew}>
                <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                <AppText style={styles.customRowText}>{t('parkSelect.createNew', { name: trimmed })}</AppText>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.15)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      maxHeight: '80%',
      paddingTop: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      height: 44,
      marginBottom: spacing.sm,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
      height: '100%',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    rowIcon: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowText: {
      fontSize: 14,
      color: colors.text,
    },
    rowSubtext: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 1,
    },
    customRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: spacing.xs,
    },
    customRowText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
      flex: 1,
    },
    emptyText: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.lg,
    },
  });
