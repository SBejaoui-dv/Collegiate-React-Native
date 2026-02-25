import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CollegeResultCard } from '@/app/features/search/components/CollegeResultCard';
import {
  addCollegeToDashboard,
  listDashboardColleges,
  removeCollegeFromDashboard,
} from '@/app/features/dashboard/services/dashboard.service';
import {
  initialSearchFilters,
  sortOptions,
  stateFilterOptions,
} from '@/app/features/search/constants/search.constants';
import { useCollegeSearch } from '@/app/features/search/hooks/useCollegeSearch';
import { College, SearchFilters } from '@/app/features/search/types/search.types';
import { useAuth } from '@/app/features/auth/store/auth.context';
import { Screen } from '@/components/ui/Screen';
import { colors } from '@/constants/theme';

export default function SearchScreen() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<SearchFilters>(initialSearchFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [stateSearchQuery, setStateSearchQuery] = useState('');
  const { colleges, totalCount, isLoading, error, retrySearch } = useCollegeSearch(filters);
  const [savedCollegeMap, setSavedCollegeMap] = useState<Record<string, string>>({});
  const [pendingCollegeId, setPendingCollegeId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const updateFilter = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
  };

  const getCollegeKey = useCallback((college: College) => `${college.name}|${college.state}`, []);

  const loadSavedColleges = useCallback(async () => {
    if (!user) {
      setSavedCollegeMap({});
      return;
    }

    try {
      const savedColleges = await listDashboardColleges();
      const mapped = savedColleges.reduce<Record<string, string>>((accumulator, item) => {
        const key = `${item.college_name}|${item.state ?? ''}`;
        accumulator[key] = item.id;
        return accumulator;
      }, {});
      setSavedCollegeMap(mapped);
    } catch {
      setSavedCollegeMap({});
    }
  }, [user]);

  useEffect(() => {
    void loadSavedColleges();
  }, [loadSavedColleges]);

  const savedCount = useMemo(() => Object.keys(savedCollegeMap).length, [savedCollegeMap]);
  const selectedStateLabel = useMemo(
    () => stateFilterOptions.find((option) => option.value === filters.state)?.label ?? 'All States',
    [filters.state],
  );
  const filteredStateOptions = useMemo(() => {
    const query = stateSearchQuery.trim().toLowerCase();
    if (!query) {
      return stateFilterOptions;
    }

    return stateFilterOptions.filter(
      (option) =>
        option.label.toLowerCase().includes(query) || option.value.toLowerCase().includes(query),
    );
  }, [stateSearchQuery]);
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.state) {
      count += 1;
    }
    if (filters.onlineOnly) {
      count += 1;
    }
    if (filters.sortBy !== 'name') {
      count += 1;
    }
    if (filters.sortOrder !== 'asc') {
      count += 1;
    }
    return count;
  }, [filters]);

  const toggleSave = async (college: College) => {
    if (!user) {
      setActionError('You must be logged in to save colleges.');
      return;
    }

    setActionError(null);
    setPendingCollegeId(college.id);

    const key = getCollegeKey(college);
    const existingSavedId = savedCollegeMap[key];

    try {
      if (existingSavedId) {
        await removeCollegeFromDashboard(existingSavedId);
      } else {
        await addCollegeToDashboard(college);
      }
      await loadSavedColleges();
    } catch (saveError) {
      setActionError(saveError instanceof Error ? saveError.message : 'Failed to update dashboard.');
    } finally {
      setPendingCollegeId(null);
    }
  };

  return (
    <Screen>
      <View style={styles.headerCard}>
        <Text style={styles.title}>College Search</Text>
        <Text style={styles.subtitle}>Find colleges with quick filters and sort controls.</Text>

        <TextInput
          style={styles.input}
          placeholder="Search by college, city, or state"
          placeholderTextColor="#94A3B8"
          value={filters.query}
          onChangeText={(value) => updateFilter('query', value)}
        />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Online only</Text>
          <Switch
            value={filters.onlineOnly}
            onValueChange={(value) => updateFilter('onlineOnly', value)}
          />
        </View>

        <View style={styles.controlsRow}>
          <Pressable style={styles.controlButton} onPress={() => setShowFilters((value) => !value)}>
            <Text style={styles.controlButtonText}>
              {showFilters ? 'Hide Filters' : 'Show Filters'} {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
            </Text>
          </Pressable>
          <Pressable
            style={styles.resetButton}
            onPress={() => {
              setFilters(initialSearchFilters);
              setShowFilters(false);
            }}
          >
            <Text style={styles.resetButtonText}>Reset</Text>
          </Pressable>
        </View>
      </View>

      {showFilters ? (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>State</Text>
            <Pressable style={styles.stateSelector} onPress={() => setShowStatePicker(true)}>
              <Text style={styles.stateSelectorLabel}>Selected</Text>
              <Text style={styles.stateSelectorValue}>{selectedStateLabel}</Text>
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sort By</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
              {sortOptions.map((option) => {
                const isActive = filters.sortBy === option.value;
                return (
                  <Pressable
                    key={option.value}
                    style={[styles.chip, isActive && styles.chipActive]}
                    onPress={() => updateFilter('sortBy', option.value)}
                  >
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={styles.orderRow}>
              <Pressable
                style={[styles.orderButton, filters.sortOrder === 'asc' && styles.orderButtonActive]}
                onPress={() => updateFilter('sortOrder', 'asc')}
              >
                <Text
                  style={[
                    styles.orderButtonText,
                    filters.sortOrder === 'asc' && styles.orderButtonTextActive,
                  ]}
                >
                  Asc
                </Text>
              </Pressable>
              <Pressable
                style={[styles.orderButton, filters.sortOrder === 'desc' && styles.orderButtonActive]}
                onPress={() => updateFilter('sortOrder', 'desc')}
              >
                <Text
                  style={[
                    styles.orderButtonText,
                    filters.sortOrder === 'desc' && styles.orderButtonTextActive,
                  ]}
                >
                  Desc
                </Text>
              </Pressable>
            </View>
          </View>
        </>
      ) : null}

      {!showFilters ? (
        <View style={styles.collapsedHint}>
          <Text style={styles.collapsedHintText}>
            Filters hidden for mobile focus. Tap Show Filters to refine results.
          </Text>
        </View>
      ) : null}

      <View style={styles.resultsHeader}>
        <Text style={styles.resultsTitle}>Results</Text>
        <Text style={styles.resultsCount}>
          {isLoading ? 'Loading...' : `${totalCount} colleges • ${savedCount} saved`}
        </Text>
      </View>

      <View style={styles.resultsList}>
        {actionError ? (
          <View style={styles.errorState}>
            <Text style={styles.errorText}>{actionError}</Text>
          </View>
        ) : null}
        {error ? (
          <View style={styles.errorState}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={() => void retrySearch()}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : colleges.length > 0 ? (
          colleges.map((college) => {
            const collegeKey = getCollegeKey(college);
            return (
              <CollegeResultCard
                key={college.id}
                college={college}
                isSaved={Boolean(savedCollegeMap[collegeKey])}
                isPending={pendingCollegeId === college.id}
                onToggleSave={() => void toggleSave(college)}
              />
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No colleges match your current filters.</Text>
          </View>
        )}
      </View>

      <Modal visible={showStatePicker} animationType="slide" onRequestClose={() => setShowStatePicker(false)}>
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select State</Text>
            <Pressable
              style={styles.modalCloseButton}
              onPress={() => {
                setShowStatePicker(false);
                setStateSearchQuery('');
              }}
            >
              <Text style={styles.modalCloseText}>Done</Text>
            </Pressable>
          </View>

          <TextInput
            style={styles.modalSearchInput}
            placeholder="Search state..."
            placeholderTextColor="#94A3B8"
            value={stateSearchQuery}
            onChangeText={setStateSearchQuery}
          />

          <FlatList
            data={filteredStateOptions}
            keyExtractor={(item) => item.value || 'all-states'}
            renderItem={({ item }) => {
              const isActive = filters.state === item.value;
              return (
                <Pressable
                  style={[styles.modalOption, isActive && styles.modalOptionActive]}
                  onPress={() => {
                    updateFilter('state', item.value);
                    setShowStatePicker(false);
                    setStateSearchQuery('');
                  }}
                >
                  <Text style={[styles.modalOptionText, isActive && styles.modalOptionTextActive]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.modalOptionCode, isActive && styles.modalOptionTextActive]}>
                    {item.value || 'ALL'}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
    backgroundColor: '#FFFFFF',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  controlButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  controlButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  resetButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  resetButtonText: {
    color: colors.mutedText,
    fontWeight: '700',
    fontSize: 13,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  horizontalChips: {
    gap: 8,
    paddingRight: 12,
  },
  stateSelector: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  stateSelectorLabel: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: '600',
  },
  stateSelectorValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  chipText: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.primary,
  },
  orderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  orderButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  orderButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  orderButtonText: {
    color: colors.mutedText,
    fontWeight: '600',
  },
  orderButtonTextActive: {
    color: colors.primary,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultsTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  resultsCount: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: '600',
  },
  resultsList: {
    gap: 10,
    paddingBottom: 14,
  },
  collapsedHint: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
    padding: 10,
  },
  collapsedHintText: {
    color: colors.mutedText,
    fontSize: 12,
  },
  emptyState: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  emptyStateText: {
    color: colors.mutedText,
    fontSize: 14,
  },
  errorState: {
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 14,
    fontWeight: '600',
  },
  retryButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#F87171',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  retryButtonText: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '700',
  },
  modalRoot: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 50,
    paddingHorizontal: 16,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  modalCloseButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  modalCloseText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  modalSearchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    color: colors.text,
    fontSize: 15,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 8,
  },
  modalOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  modalOptionText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  modalOptionCode: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
  },
  modalOptionTextActive: {
    color: colors.primary,
  },
});
