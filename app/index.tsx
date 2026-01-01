import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const bg = require("../assets/images/splashscreens/YULogo_SplashScreen.png");

export default function Splash() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Fade in the tap text
  const fade = useRef(new Animated.Value(0)).current;

  // Gentle pulse for the tap text
  const pulse = useRef(new Animated.Value(1)).current;

  // Light sweep across the tap text (a highlight band)
  const sweep = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(fade, {
      toValue: 1,
      duration: 850,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    // Pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.06,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Sweep loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(1400),
        Animated.timing(sweep, {
          toValue: -1,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.delay(600),
      ])
    ).start();
  }, [fade, pulse, sweep]);

  const sweepTranslateX = sweep.interpolate({
    inputRange: [-1, 1],
    outputRange: [-220, 250], // width of sweep travel; tweak if needed
  });

  return (
    <ImageBackground
      source={bg}
      style={[styles.bg, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      resizeMode="cover"
    >
      <Pressable style={styles.pressable} onPress={() => router.replace("/home" as any)}>
        <View style={styles.stage}>
          <Animated.View style={[styles.tapWrap, { opacity: fade, transform: [{ scale: pulse }] }]}>
            {/* Light sweep overlay */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.sweepBand,
                {
                  transform: [{ translateX: sweepTranslateX }, { rotateZ: "-12deg" }],
                },
              ]}
            />

            <Text style={styles.tapText}>Tap anywhere to start!</Text>
          </Animated.View>
        </View>
      </Pressable>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  pressable: { flex: 1 },

  // Lowers the text (cinematic placement)
  stage: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 180, // 👈 lower/raise the tap prompt here
  },

  tapWrap: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    overflow: "hidden", // IMPORTANT so the sweep band clips nicely
    backgroundColor: "rgba(0,0,0,0.28)", // optional: makes it readable over bright bg
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
  },

  tapText: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 20, // 👈 size here
    fontWeight: "800",
    letterSpacing: 0.6,
    textAlign: "center",
  },

  // The moving highlight band
  sweepBand: {
    position: "absolute",
    top: -20,
    bottom: -20,
    width: 70,
    backgroundColor: "rgba(255,255,255,0.22)",
    opacity: 0.9,
  },
});