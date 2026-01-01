import { useGame } from "@/components/game/state";
import { useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

export default function FinalScreen() {
  const router = useRouter();

  const { recordings, story, replaySameScene, resetRunOnly, saveLastRunBackup, cleanupRun } = useGame();

  const uris = useMemo(
    () => story.map((s) => recordings[s.id]).filter(Boolean) as string[],
    [recordings, story]
  );

  const [i, setI] = useState(0);
  const [done, setDone] = useState(false);
  const backedUpRef = useRef(false);

  // ✅ Create ONE player for the lifetime of this screen
  const player = useVideoPlayer("", (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.25;
  });

  // ✅ When i changes, swap the source
  useEffect(() => {
    const nextUri = uris[i];
    if (!nextUri) return;

    setDone(false);

    try {
      player.replace(nextUri);
      player.currentTime = 0;
      player.play();
    } catch {}
  }, [i, uris, player]);

  // ✅ Pause on unmount (prevents weird “released” timing issues on Android)
  useEffect(() => {
    return () => {
      try { player.pause(); } catch {}
    };
  }, [player]);

  useEffect(() => {
    if (backedUpRef.current) return;
    if (uris.length === 0) return;

    backedUpRef.current = true;
    saveLastRunBackup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uris.length]);

  // ✅ End detection (keep your interval, but don’t depend on uri/safeUri)
  useEffect(() => {
    if (uris.length === 0) return;

    const t = setInterval(() => {
      const duration = (player as any).duration as number | undefined;
      const currentTime = (player as any).currentTime as number | undefined;

      if (!duration || currentTime == null) return;

      if (currentTime >= duration - 0.05) {
        if (i < uris.length - 1) setI((x) => x + 1);
        else {
          setDone(true);
          try { player.pause(); } catch {}
        }
      }
    }, 200);

    return () => clearInterval(t);
  }, [i, uris.length, player]);

  // ✅ If no clips, show placeholder and DON’T render VideoView
  if (uris.length === 0) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: "#fff", fontWeight: "900" }}>PREPARING PREMIERE…</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <VideoView
        style={StyleSheet.absoluteFill}
        player={player}
        contentFit="cover"
        surfaceType={Platform.OS === "android" ? "textureView" : undefined}
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
