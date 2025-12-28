// app/game/record.tsx
import { useGame } from "@/components/game/state";
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import clapperAnim from "../../assets/clapper.json";

type CountWord = "LIGHTS" | "CAMERA" | "ACTION";
type Phase = CountWord | null;

const ACTION_BLUE = "#4DA3FF"; // soft electric blue

export default function RecordScreen() {
  const router = useRouter();
  const { slotId } = useLocalSearchParams<{ slotId: string }>();
  const { order, index, saveRecording, next, resetRunOnly } = useGame();

  const slot = useMemo(() => {
    return order.find((s) => s.id === slotId) ?? order[index];
  }, [order, slotId, index]);

  const insets = useSafeAreaInsets();

  const camRef = useRef<CameraView | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [permission, requestPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const [isReady, setIsReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Countdown UI state
  const [countText, setCountText] = useState<CountWord | null>(null);
  const [phase, setPhase] = useState<Phase>(null);
  const [overlayVisible, setOverlayVisible] = useState(false);

  const [showExit, setShowExit] = useState(false);

  // Animations
  const borderPulse = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const cueOpacity = useRef(new Animated.Value(0)).current;
  const [lightsTextMode, setLightsTextMode] = useState(false);
  const recBlink = useRef(new Animated.Value(1)).current;

  //Clapper
  const clapperRef = useRef<LottieView>(null);
  const [showClapper, setShowClapper] = useState(false);

  // HUD / timer
  const [remainingMs, setRemainingMs] = useState(0);
  const durationMs = useMemo(() => (slot?.maxSeconds ?? 3) * 1000, [slot?.maxSeconds]);

  const recordStartAtRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fake camera stats (visual only)
  const fakeISO = 800;
  const fakeFPS = 24;
  const fakeShutter = "180°";

  const pad2 = (n: number) => String(n).padStart(2, "0");

  const msToMSF = (ms: number, fps: number) => {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const frames = Math.floor(((clamped % 1000) / 1000) * fps);
return `${pad2(minutes)}:${pad2(seconds)}:${pad2(frames)}`;
};

const SAFE_TOP = 70;       // must match styles.safeFrame.top
const HEADROOM_Y = 110;    // must match styles.headroomLine.top
const TIME_BOX_H = 34;     // approx height of the timecode pill/text
const TIME_NUDGE = -0;

const actionScale = useRef(new Animated.Value(0.92)).current;

  const startHudTimer = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    recordStartAtRef.current = Date.now();
    setRemainingMs(durationMs);

    tickRef.current = setInterval(() => {
      const elapsed = Date.now() - recordStartAtRef.current;
      const rem = Math.max(0, durationMs - elapsed);
      setRemainingMs(rem);
      if (rem <= 0 && tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    }, 50);
  };

  const stopHudTimer = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const clearAllTimers = () => {
    for (const t of timersRef.current) clearTimeout(t);
    timersRef.current = [];
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    stopHudTimer();
  };

  const schedule = (msFromNow: number, fn: () => void) => {
    const t = setTimeout(fn, msFromNow);
    timersRef.current.push(t);
    return t;
  };

  const showWord = (word: CountWord, fadeInMs: number) => {
    setCountText(word);
    cueOpacity.stopAnimation();
    cueOpacity.setValue(0);
    Animated.timing(cueOpacity, {
      toValue: 1,
      duration: fadeInMs,
      useNativeDriver: true,
    }).start();
  };

  const fadeWordOut = (fadeOutMs: number) => {
    cueOpacity.stopAnimation();
    Animated.timing(cueOpacity, {
      toValue: 0,
      duration: fadeOutMs,
      useNativeDriver: true,
    }).start();
  };

  const resetCountdownUI = () => {
    setCountText(null);
    setPhase(null);
    setOverlayVisible(false);
    cueOpacity.stopAnimation();
    cueOpacity.setValue(0);
    flashOpacity.stopAnimation();
    flashOpacity.setValue(0);
    setLightsTextMode(false);
  };

  // Auto-request permissions (Expo Go friendly)
  useEffect(() => {
    if (permission && !permission.granted) requestPermission();
  }, [permission, requestPermission]);

  useEffect(() => {
    if (micPermission && !micPermission.granted) requestMicPermission();
  }, [micPermission, requestMicPermission]);

  // reset for each new slot
  useEffect(() => {
    startedRef.current = false;
    clearAllTimers();
    resetCountdownUI();
  }, [slotId]);

  //Animated RED Dot
  useEffect(() => {
  let loop: Animated.CompositeAnimation | null = null;

  if (isRecording) {
    recBlink.stopAnimation();
    recBlink.setValue(1);
    loop = Animated.loop(
      Animated.sequence([
        Animated.timing(recBlink, { toValue: 0.15, duration: 650, useNativeDriver: true }),
        Animated.timing(recBlink, { toValue: 1, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
  } else {
    recBlink.stopAnimation();
    recBlink.setValue(0.35); // dim when not recording (or set to 0)
  }

  return () => loop?.stop();
}, [isRecording, recBlink]);

  // Border pulse only while actually recording
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;

    if (isRecording) {
      borderPulse.setValue(0);
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(borderPulse, {
            toValue: 1,
            duration: 1800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(borderPulse, {
            toValue: 0,
            duration: 1800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
    } else {
      borderPulse.stopAnimation();
    }

    return () => loop?.stop();
  }, [isRecording, borderPulse]);

  // Main countdown + record timeline (single source of truth)
  useEffect(() => {
    const canRun =
      !!slot && isReady && permission?.granted && micPermission?.granted;
    if (!canRun) return;

    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;

    const startRecording = async () => {
      if (cancelled) return;
      if (!camRef.current) return;

      // ✅ EXACTLY when recording begins: hide overlay + clear ACTION
      setCountText(null);
      setPhase(null);
      setOverlayVisible(false);
      cueOpacity.stopAnimation();
      cueOpacity.setValue(0);

      try {
        setIsRecording(true);
        startHudTimer();

        if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
        stopTimerRef.current = setTimeout(() => {
          camRef.current?.stopRecording?.();
        }, durationMs);

        const video = await camRef.current.recordAsync();

        if (stopTimerRef.current) {
          clearTimeout(stopTimerRef.current);
          stopTimerRef.current = null;
        }

        if (video?.uri && slot) {
          await saveRecording(slot.id, video.uri);
        }

        setIsRecording(false);
        stopHudTimer();
        next();

        const nextIndex = index + 1;
        if (nextIndex >= order.length) router.replace("/game/editing" as any);
        else router.replace("/game/prompt" as any);
      } catch {
        setIsRecording(false);
        stopHudTimer();
        router.replace("/game/prompt" as any);
      }
    };

    // ---- Timeline (ms) ----
    setOverlayVisible(true);

    // LIGHTS
    schedule(0, () => {
      if (cancelled) return;

      setPhase("LIGHTS");
      setLightsTextMode(true);

      flashOpacity.stopAnimation();
      flashOpacity.setValue(1);
      Animated.sequence([
        Animated.delay(900),
        Animated.timing(flashOpacity, {
          toValue: 0,
          duration: 650,
          useNativeDriver: true,
        }),
      ]).start();

      showWord("LIGHTS", 220);
     
    });

    // fade LIGHTS out
    schedule(900, () => {
      if (cancelled) return;
      fadeWordOut(420);
    });

    // clear LIGHTS word after fade finishes
schedule(1400, () => {
  if (cancelled) return;
  setCountText(null);
});

    // beat after LIGHTS: remove word only
    schedule(1650, () => {
      if (cancelled) return;
      setShowClapper(true);
    });

    // CAMERA
    schedule(1600, () => {
      if (cancelled) return;
      setLightsTextMode(false);
      setPhase("CAMERA");
      showWord("CAMERA", 180);
    });

    // fade CAMERA out
    schedule(3050, () => {
      if (cancelled) return;
      fadeWordOut(260);
    });

    // small beat before ACTION
    schedule(3300, () => {
      if (cancelled) return;
      setCountText(null);
    });

    // ACTION pops
    schedule(4600, () => {
      if (cancelled) return;
      setPhase("ACTION");
      showWord("ACTION", 180);
actionScale.setValue(0.92);
Animated.spring(actionScale, {
  toValue: 1,
  friction: 4,
  tension: 120,
  useNativeDriver: true,
}).start();
    });

    // start recording
    schedule(5600, () => {
      if (cancelled) return;
      startRecording();
    });

    return () => {
      cancelled = true;
      clearAllTimers();
    };
  }, [
    slot,
    slotId,
    isReady,
    permission?.granted,
    micPermission?.granted,
    order.length,
    index,
    next,
    router,
    saveRecording,
    flashOpacity,
    cueOpacity,
    durationMs,
  ]);

  if (!permission?.granted) {
    return (
      <View style={styles.rootCenter}>
        <Text style={styles.textBig}>Camera permission needed</Text>
        <Pressable style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  if (!micPermission?.granted) {
    return (
      <View style={styles.rootCenter}>
        <Text style={styles.textBig}>Microphone permission needed</Text>
        <Pressable style={styles.btn} onPress={requestMicPermission}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <CameraView
        ref={camRef}
        style={styles.camera}
        facing="front"
        mode="video"
        onCameraReady={() => setIsReady(true)}
      />

      {/* WHITE FLASH (LIGHTS) - above scrim */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: "#fff",
            opacity: flashOpacity,
            zIndex: 70,
          },
        ]}
      />

      {/* EXIT CONFIRM MODAL */}
      <Modal
        visible={showExit}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExit(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Leave Set?</Text>
            <Text style={styles.modalBody}>You will lose all progress.</Text>

            <View style={styles.modalRow}>
              <Pressable
                style={styles.modalBtnGhost}
                onPress={() => setShowExit(false)}
              >
                <Text style={styles.modalBtnGhostText}>CANCEL</Text>
              </Pressable>

              <Pressable
                style={styles.modalBtn}
                onPress={() => {
                  startedRef.current = true;
                  clearAllTimers();
                  resetCountdownUI();
                  camRef.current?.stopRecording?.();

                  resetRunOnly();
                  setShowExit(false);
                  router.replace("/game" as any);
                }}
              >
                <Text style={styles.modalBtnText}>EXIT</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* RECORDING BORDER (only while recording) */}
      {isRecording && (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            styles.recordBorder,
            {
              opacity: borderPulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.6, 0.85],
              }),
            },
          ]}
        />
      )}

      {/* Exit button */}
      <Pressable
        style={[styles.exit, { top: insets.top + 12 }]}
        onPress={() => setShowExit(true)}
      >
        <Text style={styles.exitText}>✕</Text>
      </Pressable>

      
      {showClapper && (
  <View pointerEvents="none" style={styles.clapperWrap}>
    <LottieView
      ref={clapperRef}
      source={clapperAnim}
      loop={false}
      resizeMode="contain"
      autoPlay
      onAnimationFinish={() => {
        setShowClapper(false);
      }}
      style={styles.clapper}
    />
  </View>
)}

     {/* Countdown scrim */}
{overlayVisible && <View pointerEvents="none" style={styles.scrim} />}

{/* Countdown text */}
{overlayVisible && countText && (
  countText === "ACTION" ? (
    <View pointerEvents="none" style={styles.action3DWrap}>
      <Text
        style={[
          styles.action3DShadow,
          { transform: [{ translateX: 4 }, { translateY: 4 }] },
        ]}
      >
        ACTION
      </Text>
      <Text
        style={[
          styles.action3DShadow,
          { transform: [{ translateX: 2 }, { translateY: 2 }] },
        ]}
      >
        ACTION
      </Text>
      <Animated.Text
        style={[
          styles.action3DFront,
          { opacity: cueOpacity, transform: [{ scale: actionScale }] },
        ]}
      >
        ACTION
      </Animated.Text>
    </View>
  ) : (
    <Animated.Text
      pointerEvents="none"
      style={[
        styles.countText,
        { opacity: cueOpacity },
        lightsTextMode ? styles.actionTextLights : styles.actionTextCam,
      ]}
    >
      {countText}
    </Animated.Text>
  )
)}

      {/* FILM HUD + GUIDES (always on, visual only) */}
      <View pointerEvents="none" style={styles.hudWrap}>
        <View style={[styles.hudTop, { paddingTop: insets.top + 10 }]}>
          <View style={styles.hudLeft}>
            
            <Text style={[styles.hudMono, styles.hudDim]}>
              ISO {fakeISO}  {fakeFPS}FPS  SH {fakeShutter}
            </Text>
          </View>

          <View style={styles.hudRight}>
            <View style={styles.batt}>
              <View style={styles.battCap} />
              <View style={[styles.battFill, { width: "72%" }]} />
            </View>
          </View>
        </View>

{isRecording && (
  <View
    style={[
      styles.timecodeWrap,
      {
        top:
          SAFE_TOP +
          (HEADROOM_Y - SAFE_TOP) / 2 -
          TIME_BOX_H / 2 +
          TIME_NUDGE,
      },
    ]}
  >
    <Text
      style={[
        styles.timecodeText,
        remainingMs <= 1000 && styles.timecodeTextWarn,
      ]}
    >
      {msToMSF(remainingMs, fakeFPS)}
    </Text>
  </View>
)}

        <View style={styles.safeFrame} />
        <View style={styles.headroomLine} />

        <View style={styles.recBottomWrap}>
  <View style={[styles.recPill, isRecording && styles.recPillOn]}>
<Animated.View
  style={[
    styles.recDot,
    isRecording && styles.recDotOn,
    { opacity: recBlink },
  ]}
/>
    <Text style={styles.hudMono}>REC</Text>
  </View>
</View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },

  exit: {
    position: "absolute",
    right: 18,
    zIndex: 120,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  exitText: { color: "#fff", fontSize: 22, fontWeight: "900" },

  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.70)",
    zIndex: 60,
  },
  countText: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 72,
    fontWeight: "900",
    letterSpacing: 2,
    zIndex: 80,
  },
actionTextLights: {
  color: "#000",
  textShadowColor: "rgba(255,255,255,0.95)", // white neon glow
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 16,
},
  actionTextCam: { color: "#fff" },

  recordBorder: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: "#ff3b30",
    borderRadius: 0,
    zIndex: 99,
  },

  // HUD
  hudWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 55,
    opacity: 0.6,
  },
  hudTop: {
    position: "absolute",
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hudLeft: { gap: 8 },
  hudRight: { alignItems: "flex-end" },
  hudMono: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
  },
  hudDim: { opacity: 0.85 },

  recPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.65)",
  },
  recPillOn: { borderColor: "rgba(255,255,255,0.9)" },
  recDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  recDotOn: { backgroundColor: "#ff3b30" },

  batt: {
    width: 34,
    height: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    borderRadius: 3,
    padding: 2,
    position: "relative",
    marginRight: 64,
  },
  battCap: {
    position: "absolute",
    right: -4,
    top: 4,
    width: 3,
    height: 6,
    borderRadius: 1,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  battFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.75)",
  },

  timecodeWrap: {
  position: "absolute",
  left: 0,
  right: 0,
  alignItems: "center",
  },

  timecodeText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0.8,
    textShadowColor: "rgba(0,0,0,0.75)",  // adds perceived boldness
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
  },
  
  safeFrame: {
    position: "absolute",
    left: 12,
    right: 12,
    top: 70,
    bottom: 70,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.75)",
    borderRadius: 10,
  },
  headroomLine: {
    position: "absolute",
    left: 12,
    right: 12,
    top: 110,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.75)",
  },

   rootCenter: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  textBig: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  btn: {
    marginTop: 16,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnText: { fontWeight: "900", color: "#000" },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#111",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  modalTitle: { color: "#fff", fontSize: 18, fontWeight: "900" },
  modalBody: { color: "#aaa", marginTop: 8, fontSize: 14, fontWeight: "700" },
  modalRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  modalBtnGhost: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
  },
  modalBtnGhostText: { color: "#fff", fontWeight: "900" },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  modalBtnText: { color: "#000", fontWeight: "900" },
  timecodeTextWarn: {
  color: "#ff3b30",
},

recBottomWrap: {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 74,        // just under safeFrame bottom (safeFrame bottom=130)
  alignItems: "center",
},
clapperWrap: {
  position: "absolute",
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
  justifyContent: "center",
  alignItems: "center",
  zIndex: 85, // above scrim, below countdown text (adjust if desired)
},
clapper: {
  width: "100%",
  height: "100%",
},
action3DWrap: {
  position: "absolute",
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
  justifyContent: "center",
  alignItems: "center",
  zIndex: 80,
},

action3DShadow: {
  position: "absolute",
  fontSize: 82,
  fontWeight: "900",
  letterSpacing: 4,
color: "rgba(10, 30, 60, 0.9)", // deep blue shadow
},

action3DFront: {
  fontSize: 82,
  fontWeight: "900",
  letterSpacing: 4,
  color: ACTION_BLUE,
  textShadowColor: "rgba(77, 163, 255, 0.55)", // blue glow
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 14,
},
lightsGlowWrap: {
  position: "absolute",
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
  justifyContent: "center",
  alignItems: "center",
  zIndex: 80,
},

lightsGlowOuter: {
  position: "absolute",
  fontSize: 72,
  fontWeight: "900",
  letterSpacing: 2,
  color: "#000",
  textShadowColor: "rgba(255,255,255,0.85)",
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 28, // BIG glow
},

lightsGlowInner: {
  position: "absolute",
  fontSize: 72,
  fontWeight: "900",
  letterSpacing: 2,
  color: "#000",
  textShadowColor: "rgba(255,255,255,0.95)",
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 14, // tighter glow
},

lightsGlowFront: {
  fontSize: 72,
  fontWeight: "900",
  letterSpacing: 2,
  color: "#000",
},
});