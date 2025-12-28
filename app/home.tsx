import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.header}>
        <Text style={styles.brand}>YOU’RE UP!</Text>

        {/* Settings icon placeholder */}
        <Pressable
          style={styles.settingsBtn}
          onPress={() => router.push("/settings" as any)}
          hitSlop={10}
        >
          <Text style={styles.settingsText}>⚙︎</Text>
        </Pressable>
      </View>

      <Text style={styles.tagline}>Make a scene. Steal the moment.</Text>

      <View style={styles.stack}>
        <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => router.push("/game/seasons" as any)}>
          <Text style={[styles.btnText, styles.btnTextDark]}>NEW SCENE</Text>
        </Pressable>

        <Pressable style={[styles.btn, styles.btnAlt]} onPress={() => router.push("/join" as any)}>
          <Text style={styles.btnText}>JOIN SCENE</Text>
        </Pressable>

        <Pressable style={[styles.btn, styles.btnAlt]} onPress={() => router.push("/saved" as any)}>
          <Text style={styles.btnText}>SAVED SCENES</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "black", paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { color: "white", fontSize: 18, letterSpacing: 2, fontWeight: "700" },
  settingsBtn: { padding: 6 },
  settingsText: { color: "white", opacity: 0.85, fontSize: 18 },

  tagline: { color: "white", opacity: 0.65, marginTop: 12, marginBottom: 26, fontSize: 14 },

  stack: { gap: 12, marginTop: 8 },

  btn: {
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  btnPrimary: { backgroundColor: "white", borderColor: "white" },
  btnAlt: { backgroundColor: "rgba(255,255,255,0.06)" },

  btnText: { color: "white", fontSize: 14, letterSpacing: 1.5, fontWeight: "700" },
  btnTextDark: { color: "black" },
});
