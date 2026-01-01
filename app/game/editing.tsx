import { useGame } from "@/components/game/state";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function EditingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const reel = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  const { recordings, story } = useGame();
  const ready = story.length > 0 && story.every((s) => !!recordings[s.id]);

  // 1) Start animations once
  useEffect(() => {
    const reelLoop = Animated.loop(
      Animated.timing(reel, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    );

    reelLoop.start();
    pulseLoop.start();

    return () => {
      reelLoop.stop();
      pulseLoop.stop();
    };
  }, [reel, pulse]);

  // 2) Navigate when clips are ready
  useEffect(() => {
    if (!ready) return;

    const t = setTimeout(() => {
      router.replace("/game/final" as any);
    }, 600);

    return () => clearTimeout(t);
  }, [ready, router]);

  const rotate = reel.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const textOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.65, 1],
  });

  const waiting = !ready;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <Text style={styles.title}>EDITING ROOM</Text>

      <View style={styles.center}>
        <Animated.View style={[styles.reel, { transform: [{ rotate }] }]}>
          <View style={styles.reelDot} />
          <View style={[styles.reelDot, { top: 10, left: 54 }]} />
          <View style={[styles.reelDot, { top: 54, left: 54 }]} />
          <View style={[styles.reelDot, { top: 54, left: 10 }]} />
        </Animated.View>

        <Animated.Text style={[styles.subtitle, { opacity: textOpacity }]}>
          {waiting ? "Waiting on cast members…" : "Editing your scene…"}
        </Animated.Text>

        <Text style={styles.note}>Get ready for the premiere.</Text>
      </View>

      <View style={styles.bottom}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { opacity: textOpacity }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "black" },
  title: { color: "white", fontSize: 16, letterSpacing: 2, textAlign: "center" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },

  reel: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: "white",
    opacity: 0.9,
    alignItems: "center",
    justifyContent: "center",
  },
  reelDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "white",
    top: 10,
    left: 10,
    opacity: 0.9,
  },

  subtitle: { color: "white", fontSize: 18, letterSpacing: 0.5 },
  note: { color: "white", opacity: 0.55, fontSize: 13 },

  bottom: { paddingHorizontal: 26 },
  progressTrack: { height: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)", overflow: "hidden" },
  progressFill: { height: 6, width: "100%", backgroundColor: "white" },
});
