import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SEASONS } from "@/components/game/seasons";
import { useGame } from "@/components/game/state";
import { BackButton } from "@/components/ui/BackButton";

export default function SeasonsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setSeasonId } = useGame();

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <Text style={styles.h1}>SEASONS</Text>
      <Text style={styles.h2}>Pick a pack</Text>
      <BackButton to="/home" label="Home" />

      <View style={styles.list}>
        {(SEASONS ?? []).map((s) => (
          <Pressable
            key={s.id}
            style={styles.card}
            onPress={() => {
              setSeasonId(s.id);
              router.replace("/game" as any);
            }}
          >
            <Text style={styles.title}>{s.title}</Text>
            {!!s.subtitle && <Text style={styles.sub}>{s.subtitle}</Text>}
          </Pressable>
        ))}
      </View>
      <Text style={styles.footer}>More seasons coming soon…</Text>

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000", paddingHorizontal: 18 },
  h1: { color: "#fff", fontSize: 34, fontWeight: "900", letterSpacing: 2 },
  h2: { color: "#aaa", marginTop: 6, fontSize: 16, fontWeight: "700" },

  list: { marginTop: 18, gap: 12 },
  card: {
    backgroundColor: "#111",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  title: { color: "#fff", fontSize: 20, fontWeight: "900" },
  sub: { color: "#aaa", marginTop: 6, fontSize: 14, fontWeight: "700" },
  footer: { marginTop: 18, color: "#666", fontWeight: "700" },
});