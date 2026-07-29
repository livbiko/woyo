import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { T } from '../theme';

export default function LoadingOverlay() {
  return (
    <View style={styles.overlay}>
      <ActivityIndicator size="large" color={T.teal} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,12,20,0.88)', alignItems: 'center', justifyContent: 'center', zIndex: 99 },
});
