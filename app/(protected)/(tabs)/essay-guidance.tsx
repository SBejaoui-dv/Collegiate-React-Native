import { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { EssayGradingResults } from '@/app/features/essay-guidance/components/EssayGradingResults';
import {
  generateOutline,
  gradeEssay,
} from '@/app/features/essay-guidance/services/essay-guidance.service';
import {
  EssayGrade,
  OutlineResponses,
  OutlineResult,
} from '@/app/features/essay-guidance/types/essay-guidance.types';
import { Screen } from '@/components/ui/Screen';
import { colors } from '@/constants/theme';

type TabMode = 'outline' | 'grade';

const initialOutlineResponses: OutlineResponses = {
  aboutYourself: '',
  uniqueQuality: '',
  storyAboutLovedOne: '',
  collegeInfo: '',
};

export default function EssayGuidanceScreen() {
  const [tab, setTab] = useState<TabMode>('outline');
  const [responses, setResponses] = useState<OutlineResponses>(initialOutlineResponses);
  const [outline, setOutline] = useState<OutlineResult | null>(null);

  const [essay, setEssay] = useState('');
  const [essayContext, setEssayContext] = useState('');
  const [essayGrade, setEssayGrade] = useState<EssayGrade | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const wordCount = useMemo(() => essay.trim().split(/\s+/).filter(Boolean).length, [essay]);

  const handleOutlineSubmit = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const generated = await generateOutline(responses);
      setOutline(generated);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to generate outline.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGradeEssay = async () => {
    if (!essay.trim()) {
      setErrorMessage('Please paste your essay before grading.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const graded = await gradeEssay(essay.trim(), essayContext.trim() || undefined);
      setEssayGrade(graded);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to grade essay.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tabButton, tab === 'outline' && styles.tabButtonActive]}
          onPress={() => setTab('outline')}
        >
          <Text style={[styles.tabText, tab === 'outline' && styles.tabTextActive]}>Generate Outline</Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, tab === 'grade' && styles.tabButtonActive]}
          onPress={() => setTab('grade')}
        >
          <Text style={[styles.tabText, tab === 'grade' && styles.tabTextActive]}>Grade Essay</Text>
        </Pressable>
      </View>

      {tab === 'outline' ? (
        <View style={styles.card}>
          <Text style={styles.title}>Essay Outline Generator</Text>
          <Text style={styles.subtitle}>Provide background and get an AI-generated outline.</Text>

          <LabeledInput
            label="Tell us about yourself"
            value={responses.aboutYourself}
            onChangeText={(value) => setResponses((prev) => ({ ...prev, aboutYourself: value }))}
          />
          <LabeledInput
            label="What makes you unique?"
            value={responses.uniqueQuality}
            onChangeText={(value) => setResponses((prev) => ({ ...prev, uniqueQuality: value }))}
          />
          <LabeledInput
            label="Share a story about someone you love"
            value={responses.storyAboutLovedOne}
            onChangeText={(value) => setResponses((prev) => ({ ...prev, storyAboutLovedOne: value }))}
          />
          <LabeledInput
            label="What should colleges know about you?"
            value={responses.collegeInfo}
            onChangeText={(value) => setResponses((prev) => ({ ...prev, collegeInfo: value }))}
          />

          <PrimaryButton
            label={isLoading ? 'Generating...' : 'Generate Outline'}
            disabled={isLoading}
            onPress={() => void handleOutlineSubmit()}
          />

          {outline ? (
            <View style={styles.resultBox}>
              <Text style={styles.resultTitle}>AI Outline</Text>
              <Text style={styles.resultText}>{outline.aiOutline}</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.title}>Essay Grading & Feedback</Text>
          <Text style={styles.subtitle}>Submit your essay for detailed rubric-based feedback.</Text>

          <LabeledInput
            label="Context (Optional)"
            value={essayContext}
            onChangeText={setEssayContext}
            placeholder="Prompt, school, word limit..."
          />

          <Text style={styles.label}>Your Essay</Text>
          <TextInput
            style={styles.multilineInput}
            multiline
            textAlignVertical="top"
            value={essay}
            onChangeText={setEssay}
            placeholder="Paste your essay here..."
            placeholderTextColor="#94A3B8"
          />
          <Text style={styles.metaText}>Word count: {wordCount} | Characters: {essay.length}</Text>

          <PrimaryButton
            label={isLoading ? 'Grading...' : 'Grade My Essay'}
            disabled={isLoading || !essay.trim()}
            onPress={() => void handleGradeEssay()}
          />

          {essayGrade ? <EssayGradingResults essayGrade={essayGrade} /> : null}
        </View>
      )}

      {errorMessage ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}
    </Screen>
  );
}

type LabeledInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
};

function LabeledInput({ label, value, onChangeText, placeholder = 'Enter response...' }: LabeledInputProps) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
      />
    </View>
  );
}

function PrimaryButton({ label, disabled, onPress }: { label: string; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.button, disabled && styles.buttonDisabled]} disabled={disabled} onPress={onPress}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  tabButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  tabText: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: '700',
  },
  tabTextActive: {
    color: colors.primary,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    backgroundColor: colors.surface,
    gap: 10,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 20,
  },
  inputWrap: {
    gap: 6,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    color: colors.text,
    fontSize: 14,
  },
  multilineInput: {
    minHeight: 220,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    color: colors.text,
    fontSize: 14,
  },
  metaText: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: '600',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  resultBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  resultTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  resultText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
  errorBox: {
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    padding: 10,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '600',
  },
});
