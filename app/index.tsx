import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Splash() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      onPress={() => router.replace("/home" as any)}
    >
      <View style={styles.center}>
        <Text style={styles.title}>YOU’RE UP!</Text>
        <Text style={styles.tap}>Tap anywhere to begin</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "black" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  title: { color: "white", fontSize: 34, letterSpacing: 3, fontWeight: "700" },
  tap: { color: "white", opacity: 0.65, fontSize: 14, letterSpacing: 0.5 },
});
