import { GameProvider, useGame } from "@/components/game/state";
import { Stack } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";

function BridgeOverlay() {
  const { bridgeVisible, bridgeColor, hideBridge } = useGame();
  const opacity = useRef(new Animated.Value(0)).current;
  const [mountedVisible, setMountedVisible] = useState(false);

  useEffect(() => {
    if (bridgeVisible) {
      setMountedVisible(true);
      opacity.stopAnimation();
      opacity.setValue(1); // instant on
    } else {
      opacity.stopAnimation();
      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMountedVisible(false);
      });
    }
  }, [bridgeVisible, opacity]);

  // safety: if it stays on too long, force hide once
  useEffect(() => {
    if (!bridgeVisible) return;
    const t = setTimeout(() => hideBridge(), 1200);
    return () => clearTimeout(t);
  }, [bridgeVisible, hideBridge]);

  if (!mountedVisible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        {
          backgroundColor: bridgeColor,
          opacity,
          zIndex: 999999,
        },
      ]}
    />
  );
}

export default function GameLayout() {
  return (
    <GameProvider>
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#fff" },
            animation: "none", // still keep this
          }}
        />
        <BridgeOverlay />
      </View>
    </GameProvider>
  );
}
