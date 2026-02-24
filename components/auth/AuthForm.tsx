import { Link } from 'expo-router';
import { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '@/constants/theme';
import { Screen } from '@/components/ui/Screen';

type AuthLink = {
  href:
    | '/(auth)/login'
    | '/(auth)/signup'
    | '/(auth)/signup-counselor'
    | '/(auth)/forgot-password'
    | '/(auth)/reset-password';
  label: string;
};

type AuthScaffoldProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  primaryActionLabel: string;
  onPrimaryAction?: () => void | Promise<void>;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  successMessage?: string | null;
  footerLinks?: AuthLink[];
}>;

type AuthFieldProps = {
  label: string;
  placeholder: string;
  secureTextEntry?: boolean;
  value: string;
  onChangeText: (value: string) => void;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'number-pad';
};

export function AuthScaffold({
  title,
  subtitle,
  primaryActionLabel,
  onPrimaryAction,
  isSubmitting = false,
  errorMessage = null,
  successMessage = null,
  footerLinks = [],
  children,
}: AuthScaffoldProps) {
  return (
    <Screen>
      <View style={styles.shell}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <View style={styles.form}>{children}</View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

        <Pressable
          style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
          onPress={onPrimaryAction}
          disabled={isSubmitting}
        >
          <Text style={styles.primaryButtonText}>
            {isSubmitting ? 'Please wait...' : primaryActionLabel}
          </Text>
        </Pressable>

        {footerLinks.length > 0 ? (
          <View style={styles.footerLinks}>
            {footerLinks.map((link) => (
              <Link key={`${link.href}-${link.label}`} href={link.href} style={styles.link}>
                {link.label}
              </Link>
            ))}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

export function AuthField({
  label,
  placeholder,
  secureTextEntry = false,
  value,
  onChangeText,
  autoCapitalize = 'none',
  keyboardType = 'default',
}: AuthFieldProps) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        placeholder={placeholder}
        keyboardType={keyboardType}
        style={styles.input}
        placeholderTextColor="#94A3B8"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.mutedText,
  },
  form: {
    gap: 12,
    marginTop: 4,
  },
  fieldWrap: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.text,
    backgroundColor: '#FFFFFF',
  },
  primaryButton: {
    marginTop: 2,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '600',
  },
  successText: {
    color: '#15803D',
    fontSize: 14,
    fontWeight: '600',
  },
  footerLinks: {
    marginTop: 4,
    gap: 8,
  },
  link: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
