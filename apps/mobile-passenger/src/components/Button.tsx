import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { T } from '../theme';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  style?: ViewStyle;
}

export default function Button({ label, onPress, loading, disabled, variant = 'primary', style }: Props) {
  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';
  const isDanger  = variant === 'danger';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        styles.base,
        isPrimary && styles.primary,
        isOutline && styles.outline,
        variant === 'ghost' && styles.ghost,
        isDanger  && styles.danger,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary || isDanger ? T.bg : T.teal} size="small" />
      ) : (
        <Text style={[styles.label, !isPrimary && !isDanger && styles.labelAlt]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base:     { height: 54, borderRadius: T.rFull, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  primary:  { backgroundColor: T.teal },
  outline:  { borderWidth: 1.5, borderColor: T.teal, backgroundColor: T.tealDim },
  ghost:    { backgroundColor: 'transparent' },
  danger:   { backgroundColor: T.danger },
  disabled: { opacity: 0.45 },
  label:    { color: T.bg, fontWeight: T.xbold, fontSize: 16, letterSpacing: 0.2 },
  labelAlt: { color: T.teal },
});
