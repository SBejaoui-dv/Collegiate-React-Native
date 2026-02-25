import { StyleSheet, Text, View } from 'react-native';

import { EssayGrade } from '@/app/features/essay-guidance/types/essay-guidance.types';
import { colors } from '@/constants/theme';

type EssayGradingResultsProps = {
  essayGrade: EssayGrade;
};

export function EssayGradingResults({ essayGrade }: EssayGradingResultsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Overall Score</Text>
        <Text style={styles.scoreText}>{essayGrade.score.toFixed(1)}/10</Text>
        <Text style={styles.summaryText}>{essayGrade.summary}</Text>
        <Text style={styles.metaText}>
          Words: {essayGrade.meta.word_count} | Characters: {essayGrade.meta.char_count}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Rubric</Text>
        {Object.entries(essayGrade.rubric_scores).map(([key, scoreData]) => (
          <View key={key} style={styles.row}>
            <Text style={styles.rowLabel}>{toTitle(key)}</Text>
            <Text style={styles.rowScore}>{scoreData.score.toFixed(1)}</Text>
            <Text style={styles.rowReason}>{scoreData.reason}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Strengths</Text>
        {essayGrade.strengths.map((item, index) => (
          <Text key={`${item}-${index}`} style={styles.listText}>• {item}</Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Improvements</Text>
        {essayGrade.weaknesses.map((item, index) => (
          <Text key={`${item}-${index}`} style={styles.listText}>• {item}</Text>
        ))}
      </View>

      {essayGrade.priority_fixes.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Priority Fixes</Text>
          {essayGrade.priority_fixes.map((fix, index) => (
            <View key={`${fix.issue}-${index}`} style={styles.fixBox}>
              <Text style={styles.fixIssue}>{fix.issue}</Text>
              <Text style={styles.fixText}>{fix.why_it_matters}</Text>
              <Text style={styles.fixText}>How to fix: {fix.how_to_fix}</Text>
              {fix.before_example ? <Text style={styles.fixBefore}>Before: {fix.before_example}</Text> : null}
              {fix.after_example ? <Text style={styles.fixAfter}>After: {fix.after_example}</Text> : null}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function toTitle(input: string) {
  return input
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: colors.surface,
    gap: 8,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  scoreText: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: '700',
  },
  summaryText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  metaText: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: '600',
  },
  row: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    gap: 2,
  },
  rowLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  rowScore: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  rowReason: {
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 17,
  },
  listText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
  fixBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    gap: 4,
    backgroundColor: '#FFFFFF',
  },
  fixIssue: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  fixText: {
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 17,
  },
  fixBefore: {
    color: '#991B1B',
    fontSize: 12,
  },
  fixAfter: {
    color: '#166534',
    fontSize: 12,
  },
});
