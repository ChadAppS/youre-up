import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useEventListener } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";

import { useGame } from "@/components/game/state";
import * as NavigationBar from "expo-navigation-bar";
import { Platform } from "react-native";

export default function FinalScreen() {
  const router = useRouter();

  const { recordings, story, replaySameScene, resetRunOnly, saveLastRunBackup, cleanupRun } = useGame();

  const uris = useMemo(
    () => story.map((s) => recordings[s.id]).filter(Boolean) as string[],
    [recordings, story]
  );

  const [i, setI] = useState(0);
  const [done, setDone] = useState(false);

  const uri = uris[i] ?? null;
  const backedUpRef = useRef(false);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    let active = true;

    (async () => {
      try {
        // Hide the 3-button bar; allow swipe to reveal temporarily
        await NavigationBar.setBehaviorAsync("overlay-swipe");
        await NavigationBar.setVisibilityAsync("hidden");
      } catch {}
    })();

    return () => {
      active = false;
      // Restore when leaving Final
      NavigationBar.setVisibilityAsync("visible").catch(() => {});
      NavigationBar.setBehaviorAsync("inset-swipe").catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (uris.length === 0) router.replace("/game");
  }, [uris.length, router]);

  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.25;
    p.play();
  });

  useEffect(() => {
    if (!uri) return;
    setDone(false);
    player.replace(uri);
    player.currentTime = 0;
    player.play();
  }, [i]);

  useEffect(() => {
  if (backedUpRef.current) return;
  if (uris.length === 0) return;

  backedUpRef.current = true;
  saveLastRunBackup();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [uris.length]);

  useEventListener(player, "timeUpdate", ({ currentTime }) => {
    const duration = (player as any).duration as number | undefined;
    if (!duration) return;

    if (currentTime >= duration - 0.05) {
      if (i < uris.length - 1) setI((x) => x + 1);
      else {
        setDone(true);
        player.pause();
      }
    }
  });

   if (!uri) return null;

  return (
    <View style={styles.root}>
      <VideoView
        style={StyleSheet.absoluteFill}
        player={player}
        contentFit="cover"
        surfaceType="textureView"
        nativeControls={false}
      />

      {done && (
        <View style={[styles.footer, { paddingBottom: 32 }]}>
          <Pressable
            style={styles.doneBtn}
            onPress={async () => {
              await cleanupRun();
              setI(0);
              setDone(false);
              await replaySameScene();
              await new Promise((r) => setTimeout(r, 50));
              router.replace(`/game/prompt?run=${Date.now()}` as any);
            }}
          >
            <Text style={styles.doneText}>PLAY AGAIN</Text>
          </Pressable>

          <Pressable
            style={styles.leaveBtn}
            onPress={async () => {
              await cleanupRun();
              resetRunOnly();
              router.replace("/game" as any);
            }}
          >
            <Text style={styles.leaveText}>LEAVE SET</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    gap: 12,
    zIndex: 20,
  },
  footerText: { color: "#fff", fontWeight: "900" },

  leaveBtn: {
  backgroundColor: "rgba(255,255,255,0.15)",
  paddingHorizontal: 16,
  paddingVertical: 10,
  borderRadius: 12,
},
leaveText: { color: "#fff", fontWeight: "900" },

  doneBtn: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  doneText: { color: "#000", fontWeight: "900" },
});
