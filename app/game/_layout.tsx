import { GameProvider } from "@/components/game/state";
import { Stack } from "expo-router";

export default function GameLayout() {
  return (
    <GameProvider>
      <Stack 
        screenOptions={{ 
          headerShown: false, 
          contentStyle: { backgroundColor: "#000" },
          animation: "none",         // ✅ kill transition blink 
          }} />
    </GameProvider>
  );
}
