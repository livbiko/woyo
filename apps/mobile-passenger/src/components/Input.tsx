import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { T } from '../theme';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  style?: ViewStyle;
}

export default function Input({ label, error, style, ...props }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrapper, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrap, focused && styles.inputWrapFocused, error && styles.inputWrapError]}>
        <TextInput
          style={styles.input}
          placeholderTextColor={T.muted}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e)  => { setFocused(false); props.onBlur?.(e); }}
          {...props}
        />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:         { marginBottom: 12 },
  label:           { color: T.sub, fontSize: 13, marginBottom: 6, fontWeight: T.semi },
  inputWrap:       { borderRadius: T.r12, borderWidth: 1.5, borderColor: T.border, backgroundColor: T.card, paddingHorizontal: 16 },
  inputWrapFocused:{ borderColor: T.teal },
  inputWrapError:  { borderColor: T.danger },
  input:           { height: 52, color: T.text, fontSize: 15 },
  error:           { color: T.danger, fontSize: 12, marginTop: 4 },
});
