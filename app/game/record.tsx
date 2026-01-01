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
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import clapperAnim from "../../assets/lottie/clapper.json";


type CountWord = "LIGHTS" | "CAMERA" | "ACTION";
type Phase = CountWord | null;

const ACTION_BLUE = "#4DA3FF"; // soft electric blue
const PROMPT_H = 110;       // fixed prompt box height (tweak if you want)
const NAV_PAD = 0;        // gap above system nav/home indicator
const PROMPT_GAP = 3;   // little breathing room above icons
const REC_GAP = 14;        // gap between REC and prompt

function AutoFitPromptText({ text }: { text: string }) {
  const [fontSize, setFontSize] = useState(26);
  const readyRef = useRef(false);

  useEffect(() => {
    setFontSize(26);
    readyRef.current = false;
  }, [text]);

  return (
    <Text
      style={{
        color: "rgba(255,255,255,1)",
        fontWeight: "900",
        textAlign: "center",
        fontSize,
        lineHeight: Math.round(fontSize * 1.15),
      }}
      numberOfLines={3}
      ellipsizeMode="clip"
      onTextLayout={(e) => {
        if (readyRef.current) return;
        const lines = e?.nativeEvent?.lines ?? [];
        const last = lines[2]?.text ?? "";
        const hasEllipsis = last.endsWith("…") || last.endsWith("...");

        if ((lines.length > 3 || hasEllipsis) && fontSize > 14) {
          setFontSize((s) => s - 1);
          return;
        }

        readyRef.current = true;
      }}
    >
      {text}
    </Text>
  );
}

export default function RecordScreen() {
  const router = useRouter();
  const { slotId, fromWhite } = useLocalSearchParams<{ slotId: string; fromWhite?: string }>();
  const cameFromWhite = fromWhite === "1";
  const { order, index, saveRecording, next, resetRunOnly, hideBridge } = useGame();

  const slot = useMemo(() => {
    return order.find((s) => s.id === slotId) ?? order[index];
  }, [order, slotId, index]);

  const insets = useSafeAreaInsets();

  const camRef = useRef<CameraView | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [hudVisible, setHudVisible] = useState(true);

  const [permission, requestPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const [isReady, setIsReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Countdown UI state
  const [countText, setCountText] = useState<CountWord | null>(null);
  const [phase, setPhase] = useState<Phase>(null);
  const [overlayVisible, setOverlayVisible] = useState(false);

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
  const silhouette = require("../../assets/ui/Silhouette.png");

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
const TIME_NUDGE = 0;

const actionScale = useRef(new Animated.Value(0.92)).current;
const entryWhite = useRef(new Animated.Value(cameFromWhite ? 1 : 0)).current; // start fully white
const [entryDone, setEntryDone] = useState(false);  // gate countdown until fade completes
const entryFinishedRef = useRef(false);

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
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
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
    entryFinishedRef.current = false;
    clearAllTimers();
    resetCountdownUI();
    setRemainingMs(durationMs);
    // hard reset visual overlay state
  setOverlayVisible(false);
  setCountText(null);
  setPhase(null);
    setShowClapper(false);
     setEntryDone(false);
  entryWhite.stopAnimation();
  entryWhite.setValue(cameFromWhite ? 1 : 0);

  // keep flash off by default; it’s only used by your LIGHTS flash
  flashOpacity.stopAnimation();
  flashOpacity.setValue(0);

  setIsReady(false);
  }, [slotId, cameFromWhite]);

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
    !!slot &&
    isReady &&
    entryDone &&
    permission?.granted &&
    micPermission?.granted;

  if (!canRun) return;
  if (startedRef.current) return;
  startedRef.current = true;
  setOverlayVisible(true);

  let cancelled = false;

  // ✅ DEFINE THIS FIRST (before any schedule() calls use it)
  const startRecording = async () => {
    if (cancelled) return;
    if (!camRef.current) return;
    const cam: any = camRef.current;

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
        cam.stopRecording?.();
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

      const nextIndex = index + 1;
      next();
      if (nextIndex >= order.length) router.replace("/game/editing" as any);
      else router.replace("/game/prompt" as any);
    } catch {
      setIsRecording(false);
      stopHudTimer();
      router.replace("/game/prompt" as any);
    }
  };

  // ---- Normal timeline ----
setOverlayVisible(true);

// LIGHTS (flash + text)
schedule(0, () => {
  if (cancelled) return;

  setPhase("LIGHTS");
  setLightsTextMode(true);
  showWord("LIGHTS", 220);

  // Whole screen fades from white → transparent ONLY when coming from prompt bridge
  if (cameFromWhite) {
    entryWhite.stopAnimation();
    entryWhite.setValue(1);
    Animated.timing(entryWhite, {
      toValue: 0,
      duration: 850,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }
});

// fade LIGHTS out
schedule(900, () => {
  if (cancelled) return;
  fadeWordOut(420);
});

// clear LIGHTS word after fade
schedule(1400, () => {
  if (cancelled) return;
  setCountText(null);
});

// CAMERA + clapper
schedule(1600, () => {
  if (cancelled) return;
  setLightsTextMode(false);
  setPhase("CAMERA");
  showWord("CAMERA", 180);
});

schedule(1650, () => {
  if (cancelled) return;
  setShowClapper(true);
});

// fade CAMERA out
schedule(3050, () => {
  if (cancelled) return;
  fadeWordOut(260);
});

// clear CAMERA
schedule(3300, () => {
  if (cancelled) return;
  setCountText(null);
});

// ACTION pop
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
  entryDone,
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
    <View style={styles.root}>
      <CameraView
  ref={camRef}
  style={styles.camera}
  facing="front"
  mode="video"
  onCameraReady={() => {
    setIsReady(true);

    // Start white ONLY when coming from the prompt white bridge
    if (cameFromWhite) {
      entryWhite.stopAnimation();
      entryWhite.setValue(1);
    } else {
      entryWhite.stopAnimation();
      entryWhite.setValue(0);
    }

    // Let the countdown timeline run
    entryFinishedRef.current = true;
    setEntryDone(true);

    // If you have hideBridge in state, this is safe:
    hideBridge?.();
  }}
/>

<View
  pointerEvents="none" style={styles.silhouetteWrap}>
  <Image source={silhouette} style={styles.silhouette} />
</View>

{/* ENTRY WHITE COVER */}
<Animated.View
  pointerEvents="none"
  style={[
    StyleSheet.absoluteFillObject,
    {
      backgroundColor: "#fff",
      opacity: entryWhite,
      zIndex: 1000,
      elevation: 1000,
    },
  ]}
/>

{/* LIGHTS TEXT ABOVE WHITE (fades with it) */}
{phase === "LIGHTS" && (
  <Animated.View
    pointerEvents="none"
    style={[
      StyleSheet.absoluteFillObject,
      {
        opacity: entryWhite,
        zIndex: 1001,
        elevation: 1001,
        justifyContent: "center",
        alignItems: "center",
      },
    ]}
  >
    <Text style={styles.lightsOnWhiteText}>LIGHTS</Text>
  </Animated.View>
)}

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
      <Text style={[styles.action3DShadow, { transform: [{ translateX: 4 }, { translateY: 4 }] }]}>
        ACTION
      </Text>
      <Text style={[styles.action3DShadow, { transform: [{ translateX: 2 }, { translateY: 2 }] }]}>
        ACTION
      </Text>
      <Animated.Text style={[styles.action3DFront, { opacity: cueOpacity, transform: [{ scale: actionScale }] }]}>
        ACTION
      </Animated.Text>
    </View>
  ) : countText === "LIGHTS" ? (
    cameFromWhite ? null : (
    <Animated.View
    pointerEvents="none"
    style={[styles.lightsGlowWrap, { opacity: cueOpacity }]}
  >
    <Text style={styles.lightsGlowOuter}>LIGHTS</Text>
    <Text style={styles.lightsGlowInner}>LIGHTS</Text>
    <Text style={styles.lightsGlowFront}>LIGHTS</Text>
  </Animated.View>
    )
  ) : (
    <Animated.Text
      pointerEvents="none"
      style={[
        styles.countText,
        { opacity: cueOpacity },
        styles.actionTextCam, // CAMERA stays white
      ]}
    >
      {countText}
    </Animated.Text>
  )
)}


      {/* FILM HUD + GUIDES (always on, visual only) */}
      <View pointerEvents="none" style={styles.hudWrap}>
        <View style={[styles.hudTop, { top: insets.top + 10 }]}>
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

         {/* PROMPT (fixed box, pinned above system bottom area) */}
<View
  pointerEvents="none"
  style={[
    styles.promptWrap,
    { bottom: insets.bottom + NAV_PAD + PROMPT_GAP },
  ]}
>
  <View style={styles.promptBox}>
    <AutoFitPromptText text={slot?.prompt ?? ""} />
  </View>
</View>

{hudVisible && (
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

<View
  style={[
    styles.safeFrame,
    {
      bottom:
        (insets.bottom + NAV_PAD + PROMPT_GAP) +
        PROMPT_H +
        REC_GAP -
        10,
    },
  ]}
/>
        <View style={styles.headroomLine} />

<View
  style={[
    styles.recBottomWrap,
    {
      bottom:
        insets.bottom +
        NAV_PAD +
        PROMPT_GAP +
        PROMPT_H +
        REC_GAP,
    },
  ]}
>
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
  camera: { ...StyleSheet.absoluteFillObject },

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
    zIndex: 90,
    opacity: 0.7,
  },
  hudTop: {
    position: "absolute",
    top: 0,
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
    fontSize: 15,
    fontWeight: "900",
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
  },
  hudDim: { opacity: 0.85 },

  recPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.65)",
  },
  recPillOn: { borderColor: "rgba(255,255,255,0.9)" },
  recDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
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
    marginRight: 15,
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
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 0.8,
    textShadowColor: "rgba(0,0,0,0.75)",  // adds perceived boldness
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
  },
  timecodeTextWarn: {
  color: "#ff3b30",
},
  
  safeFrame: {
    position: "absolute",
    left: 12,
    right: 12,
    top: 70,
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

recBottomWrap: {
  position: "absolute",
  left: 0,
  right: 0,
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
silWrap: {
  ...StyleSheet.absoluteFillObject,
  zIndex: 40,
  opacity: 0.35,
},
silhouetteWrap: {
  position: "absolute",
  top: "5%",
  left: "0%",
  width: "100%",
  height: "100%",
  zIndex: 40,
},

silhouette: {
  width: "100%",
  height: "100%",
  resizeMode: "cover",
  opacity: 0.35,
},
promptWrap: {
  position: "absolute",
  left: 18,
  right: 18,
  zIndex: 95,
},

promptBox: {
  height: PROMPT_H,                // fixed box height
  borderRadius: 14,
  backgroundColor: "rgba(0,0,0,0.75)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.35)",
  paddingHorizontal: 14,
  paddingVertical: 10,
  justifyContent: "center",
  overflow: "hidden",
},

promptText: {
  color: "#fff",
  fontWeight: "900",
  letterSpacing: 0.2,
},
lightsOnWhiteText: {
  fontSize: 72,
  fontWeight: "900",
  letterSpacing: 2,
  color: "#000",
},
});