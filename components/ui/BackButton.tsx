import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function BackButton({
  label = "Back",
  to,
  style,
}: {
  label?: string;
  to?: string;
  style?: ViewStyle;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      style={[styles.btn, { top: insets.top + 12 }, style]}
      onPress={() => (to ? router.replace(to as any) : router.back())}
      hitSlop={12}
    >
      <Text style={styles.text}>←</Text>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
  position: "absolute",
  left: 14,
  zIndex: 9999,
  elevation: 9999, // Android
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  paddingVertical: 6,
  paddingHorizontal: 10,
  borderRadius: 999,
  backgroundColor: "rgba(0,0,0,0.6)",
},
  text: { color: "white", fontSize: 18, opacity: 0.9 },
  label: { color: "white", fontSize: 13, opacity: 0.85, letterSpacing: 0.3 },
});
