import { useMemo, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  analyzeResumeText,
  uploadResumeFile,
} from '@/app/features/resume-guidance/services/resume-guidance.service';
import { Screen } from '@/components/ui/Screen';
import { colors } from '@/constants/theme';

export default function ResumeGuidanceScreen() {
  const [resumeText, setResumeText] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    name: string;
    mimeType?: string;
    webFile?: File;
  } | null>(null);

  const wordCount = useMemo(() => resumeText.trim().split(/\s+/).filter(Boolean).length, [resumeText]);

  const pickResumeFile = async () => {
    setErrorMessage(null);

    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'text/plain',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || result.assets.length === 0) {
      return;
    }

    const asset = result.assets[0];
    const webFile = (asset as any).file as File | undefined;
    setSelectedFile({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType ?? undefined,
      webFile,
    });
  };

  const handleAnalyze = async () => {
    if (!selectedFile && !resumeText.trim()) {
      setErrorMessage('Please upload a resume file or paste your resume content first.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = selectedFile
        ? await uploadResumeFile(selectedFile)
        : await analyzeResumeText(resumeText.trim());
      setFeedback(result.feedback);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to analyze resume.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.card}>
        <Text style={styles.title}>Resume Guidance</Text>
        <Text style={styles.subtitle}>
          Upload your resume or paste text to get AI feedback on clarity, impact, and structure.
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>What gets analyzed</Text>
          <Text style={styles.infoText}>• Content relevance and impact</Text>
          <Text style={styles.infoText}>• Structure and readability</Text>
          <Text style={styles.infoText}>• Skills and accomplishment framing</Text>
          <Text style={styles.infoText}>• College application fit</Text>
        </View>

        <View style={styles.uploadRow}>
          <Pressable style={styles.secondaryButton} onPress={() => void pickResumeFile()}>
            <Text style={styles.secondaryButtonText}>Upload Resume</Text>
          </Pressable>
          {selectedFile ? (
            <Pressable style={styles.clearButton} onPress={() => setSelectedFile(null)}>
              <Text style={styles.clearButtonText}>Remove</Text>
            </Pressable>
          ) : null}
        </View>

        {selectedFile ? (
          <View style={styles.fileChip}>
            <Text style={styles.fileChipText}>{selectedFile.name}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Or Paste Resume Content</Text>
        <TextInput
          style={styles.textArea}
          multiline
          textAlignVertical="top"
          value={resumeText}
          onChangeText={setResumeText}
          placeholder="Paste your resume text here..."
          placeholderTextColor="#94A3B8"
        />
        <Text style={styles.meta}>Word count: {wordCount} | Characters: {resumeText.length}</Text>

        <Pressable style={[styles.button, isLoading && styles.buttonDisabled]} onPress={() => void handleAnalyze()} disabled={isLoading}>
          <Text style={styles.buttonText}>{isLoading ? 'Analyzing...' : 'Get Resume Feedback'}</Text>
        </Pressable>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}
      </View>

      {feedback ? (
        <View style={styles.card}>
          <Text style={styles.feedbackTitle}>AI Resume Feedback</Text>
          <Text style={styles.feedbackText}>{feedback}</Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 20,
  },
  infoBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    backgroundColor: colors.primarySoft,
    gap: 4,
  },
  infoTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  infoText: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
  },
  uploadRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  clearButton: {
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  clearButtonText: {
    color: '#991B1B',
    fontSize: 12,
    fontWeight: '700',
  },
  fileChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  fileChipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  textArea: {
    minHeight: 220,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    color: colors.text,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  meta: {
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
    fontSize: 14,
    fontWeight: '700',
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
  feedbackTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  feedbackText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 20,
  },
});
