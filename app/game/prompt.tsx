import type { LookDir } from "@/components/game/scene";
import { useGame } from "@/components/game/state";
import { useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Dimensions, Easing, ImageBackground, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const lightupAnim = require("../../assets/lottie/lightupset.json");

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  bgImage: {
  opacity: 1,
},
bgVignette: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: "rgba(0,0,0,0.15)",
},
// “Ink” blue used in the reference art
blueValue: {
  position: "absolute",
  color: "#1b2f57",
  fontWeight: "900",
  letterSpacing: 1,
},

bluePillText: {
  position: "absolute",
  color: "#1b2f57",
  fontWeight: "900",
  letterSpacing: 1,
  textTransform: "uppercase",
  textAlign: "center",
},

scriptYellow: {
  color: "#f2d27a",
  fontWeight: "900",
  textAlign: "center",
  letterSpacing: 0.8,
  fontSize: 30,
},

pageBlue: {
  position: "absolute",
  color: "rgba(255,255,255,0.75)",
  fontWeight: "900",
  letterSpacing: 1,
},
scriptBoxHit: {
  width: "100%",
},
scriptInnerPad: {
  width: "100%",
  paddingHorizontal: 36,  // 👈 now this works again
},

scriptTextBlock: {
  width: "100%",         // THIS is the key: forces wrapping inside the box
  flexShrink: 1,
},

  skin: { flex: 1, alignItems: "center", justifyContent: "center" },
  frame: { width: "100%", aspectRatio: 1170 / 2532, position: "relative", zIndex: 10 },
  val: { position: "absolute", color: "#0b1d3a", fontWeight: "900" },
  pillText: { position: "absolute", color: "#0b1d3a", fontWeight: "900", textAlign: "center" },
  scriptText: { position: "absolute", color: "#f2d27a", fontWeight: "900", textAlign: "center" },
  pageText: { position: "absolute", color: "rgba(255,255,255,0.65)", fontWeight: "900", textAlign: "center" },

  sceneVal: { left: "26%", top: "24.2%", fontSize: 30 },
  takeVal: { right: "16%", top: "24.2%", fontSize: 30 },
  charVal: { left: "34%", top: "30.3%", width: "42%", fontSize: 28 },
  typeVal: { left: "42%", top: "35.7%", width: "42%", fontSize: 28 },
  lenVal: { left: "44%", top: "41.3%", width: "42%", fontSize: 26 },
  dirVal: { fontSize: 26 },
  scriptVal: { position: "absolute",
    top: "58%",
    left: "0%",
    right: "2%",
    height: "12%", 
    alignItems: "center",
    justifyContent: "center", 
    overflow: "hidden", // IMPORTANT
   },
  pageVal: { left: "41%", right: "0%", bottom: "14.2%", fontSize: 20 },

ctaInkWrap: {
  position: "absolute",
  left: "24%",
  right: "24%",
  top: "74.0%",
  height: "7.2%",
  justifyContent: "center",
  alignItems: "center",
},
ctaInkBtn: {
  width: "100%",
  height: "100%",
  justifyContent: "center",
  alignItems: "center",
},

ctaInkHit: {
  width: "100%",
  height: "100%",
  justifyContent: "center",
  alignItems: "center",
},

ctaInkPressed: {
  transform: [{ scale: 0.98 }],
  opacity: 0.92,
},

ctaInkText: {
  color: "#335392ff",
  fontWeight: "800",
  letterSpacing: 2,
  fontSize: 22,
  textAlign: "center",
  textShadowColor: "rgba(0,0,0,0.25)",
  textShadowOffset: { width: 0.7, height: 0.7 },
  textShadowRadius: 0.8,
},
// the “stamp plate”
ctaInkPlate: {
  paddingVertical: 12,
  paddingHorizontal: 18,
  borderRadius: 14,
  backgroundColor: "rgba(255,255,255,0.90)",
  borderWidth: 2,
  borderColor: "rgba(27,47,87,0.55)",             // ink border
  // tiny “pressed into paper” shadow
  shadowColor: "#000",
  shadowOpacity: 0.12,
  shadowRadius: 5,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
},

  exit: {
    position: "absolute",
    right: 18,
    zIndex: 999,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  exitText: { color: "#fff", fontSize: 22, fontWeight: "900" },
  arrowWrap: {
  position: "absolute",
  top: "44%",          // tune to match your design
  width: "14%",
  height: "10%",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 50,
},
arrowLeft: { left: "6%" },
arrowRight: { right: "6%" },
arrowCenter: { left: "41%" }, // centered-ish in frame

arrowRow: {
  position: "absolute",
  left: "45.5%",
  top: "47.1%",
  width: "45%",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
},

arrowGlyphInline: {
  fontSize: 34,
  fontWeight: "800",
  color: "#151664ff",
  textShadowColor: "#0a1630",
  textShadowOffset: { width: 1, height: 1 },
  textShadowRadius: 1,
  marginRight: 10,
},
arrowGlyph: {
  marginRight: 8,
  fontSize: 26,
  lineHeight: 26,
  fontWeight: "900",
  color: "#151664ff",
  includeFontPadding: false,
  textAlign: "center",
  textShadowColor: "#0a1630",
  textShadowOffset: { width: 1, height: 1 },
  textShadowRadius: 1,
},

dirRow: {
  position: "absolute",
  left: "37.1%",
  top: "47.4%",
  // ✅ no fixed width; it will shrink-wrap the pill
},

dirText: {
  width: "100%",
  textAlign: "center",
  fontSize: 26,              // or keep using your dirVal fontSize
  includeFontPadding: false,
},
dirPill: {
  flexDirection: "row",
  alignItems: "center",
  alignSelf: "flex-start", // shrink-wrap content
},
});

const modalStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  card: {
    position: "absolute",
    left: 20,
    right: 20,
    top: "40%",
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(10, 22, 48, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  title: { color: "#fff", fontSize: 18, fontWeight: "900", marginBottom: 6 },
  body: { color: "rgba(255,255,255,0.8)", fontSize: 14, fontWeight: "700", marginBottom: 14 },
  row: { flexDirection: "row", gap: 10, justifyContent: "flex-end" },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
  btnGhost: { backgroundColor: "rgba(255,255,255,0.10)" },
  btnGhostText: { color: "#fff", fontWeight: "900" },
  btnDanger: { backgroundColor: "rgba(255,80,80,0.90)" },
  btnDangerText: { color: "#0a1630", fontWeight: "900" },
});

function AutoFitOutlinedText({
  text,
  maxFontSize = 38,
  minFontSize = 12,
  maxLines = 3,
  maxHeight,
  outlineColor = "#0a1630",
  outlineWidth = 2,
  style,
  onReady,
}: {
  text: string;
  maxFontSize?: number;
  minFontSize?: number;
  maxLines?: number;
  maxHeight?: number;
  outlineColor?: string;
  outlineWidth?: number;
  style?: any;
  onReady?: () => void;
}) {
  const [fontSize, setFontSize] = useState(maxFontSize);
  const readyRef = useRef(false);

  useEffect(() => {
    setFontSize(maxFontSize);
    readyRef.current = false;
  }, [text, maxFontSize]);

  const lineHeight = Math.round(fontSize * 1.0);
  const baseStyle = useMemo(
    () => [
      style,
      {
        fontSize,
        lineHeight,
        width: "100%",
        textAlign: "center",
        includeFontPadding: false, // android: reduces weird baseline padding
      },
    ],
    [style, fontSize, lineHeight]
  );

  const common = {
    numberOfLines: maxLines,
    ellipsizeMode: "clip" as const, // we shrink until ellipsis disappears
  };

    const onLayoutMain = (e: any) => {
    const lines = e?.nativeEvent?.lines ?? [];
    const tooManyLines = lines.length > maxLines;

// Detect ellipsis on iOS/Android (usually ends with …)
const last = lines[maxLines - 1]?.text ?? "";
const hasEllipsis = last.endsWith("…") || last.endsWith("...");

// ✅ NEW: vertical fit check (box height)
const neededHeight = lines.length * lineHeight;
const availableHeight = typeof maxHeight === "number"
  ? (maxHeight - outlineWidth * 2) // small safety margin
  : undefined;

const tooTall = availableHeight != null && neededHeight > availableHeight;

if ((tooManyLines || hasEllipsis || tooTall) && fontSize > minFontSize) {
  setFontSize((s) => Math.max(minFontSize, s - 1));
  return;
}


    // ✅ stable now
    if (!readyRef.current) {
      readyRef.current = true;
      onReady?.();
    }
  };

  return (
  <View style={{ width: "100%", position: "relative", overflow: "hidden" }}>
      {/* Outline clones (NO onTextLayout here) */}
      <Text {...common} style={[...baseStyle, { position: "absolute", left: outlineWidth, top: outlineWidth, color: outlineColor }]}>{text}</Text>
      <Text {...common} style={[...baseStyle, { position: "absolute", left: -outlineWidth, top: outlineWidth, color: outlineColor }]}>{text}</Text>
      <Text {...common} style={[...baseStyle, { position: "absolute", left: outlineWidth, top: -outlineWidth, color: outlineColor }]}>{text}</Text>
      <Text {...common} style={[...baseStyle, { position: "absolute", left: -outlineWidth, top: -outlineWidth, color: outlineColor }]}>{text}</Text>

      {/* Main fill (this one drives measurement) */}
      <Text {...common} onTextLayout={onLayoutMain} style={baseStyle}>
        {text}
      </Text>
    </View>
  );
}

  const directionLabelFromArrow = (dir?: LookDir) => {
  switch (dir) {
    case "LEFT":
      return "LEFT";
    case "RIGHT":
      return "RIGHT";
    case "UP":
      return "UP";
    case "DOWN":
      return "DOWN";
    case "DOWN_LEFT":
      return "DOWN-LEFT";
    case "DOWN_RIGHT":
      return "DOWN-RIGHT";
    case "UP_RIGHT":
      return "UP-RIGHT";
    case "UP_LEFT":
      return "UP-LEFT";
    case "CAMERA":
    default:
      return "CAMERA";
  }
};
const arrowGlyphFromDir = (dir?: LookDir) => {
  switch (dir) {
    case "LEFT":
      return "←";
    case "RIGHT":
      return "→";
    case "UP":
      return "↑";
    case "DOWN":
      return "↓";
    case "DOWN_LEFT":
      return "↙";
    case "DOWN_RIGHT":
      return "↘";
    case "UP_RIGHT":
      return "↗";
    case "UP_LEFT":
      return "↖";
    case "CAMERA":
    default:
      return "•"; // or "◎" if you want
  }
};



export default function PromptScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { order, index, resetRunOnly, displaySceneNumber, bumpSceneNumber } = useGame();
  const [showExit, setShowExit] = useState(false);
  const [navigating, setNavigating] = useState(false);

  const pulse = useRef(new Animated.Value(0)).current;
  const [pageReady, setPageReady] = useState(false);
  const pageOpacity = useRef(new Animated.Value(0)).current;


   const promptOut = useRef(new Animated.Value(0)).current; // 0 visible -> 1 hidden
const setIn = useRef(new Animated.Value(0)).current;     // 0 hidden -> 1 visible
const lights = useRef(new Animated.Value(0)).current;    // 0 off -> 1 on
const flash = useRef(new Animated.Value(0)).current;     // 0 -> 1 -> 0
  
const navigatingRef = useRef(false);
const slot = order?.[index];

const [transitioning, setTransitioning] = useState(false);

const [playLightup, setPlayLightup] = useState(false);
const lightupRef = useRef<LottieView>(null);
const [scriptBoxHeight, setScriptBoxHeight] = useState<number>(0);

const mountedRef = useRef(true);
const whiteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
useEffect(() => {
  return () => {
    if (whiteTimerRef.current) {
      clearTimeout(whiteTimerRef.current);
      whiteTimerRef.current = null;
    }
    transIn.stopAnimation();
    transGlow.stopAnimation();
    slideX.stopAnimation();
  };
}, []);

useEffect(() => {
  bumpSceneNumber();
}, [index]);

useEffect(() => {
  mountedRef.current = true;
  return () => {
    mountedRef.current = false;
  };
}, []);


// overlay: 0 hidden -> 1 shown
const transIn = useRef(new Animated.Value(0)).current;
// lights glow: 0 off -> 1 on
const transGlow = useRef(new Animated.Value(0)).current;

useEffect(() => {
  if (!pageReady) return;

  Animated.timing(pageOpacity, {
    toValue: 1,
    duration: 160,
    easing: Easing.out(Easing.quad),
    useNativeDriver: true,
  }).start();
}, [pageReady, pageOpacity]);

useEffect(() => {
  setPageReady(false);
  pageOpacity.setValue(0);
}, [slot?.id]);

useEffect(() => {
  if (!playLightup) return;

  // Wait 1 frame so the LottieView is mounted before playing
  requestAnimationFrame(() => {
    // 30 frames @ 30fps = frames 0..29
    lightupRef.current?.play?.(0, 29);
  });
}, [playLightup]);

useEffect(() => {
  const loop = Animated.loop(
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ])
  );
  loop.start();
  return () => loop.stop();
}, [pulse]);

  useEffect(() => {
  if (!slot) {
    router.replace("/game/final" as any);
    }
}, [slot, router]);

const SCREEN_W = Dimensions.get("window").width;
const slideX = useRef(new Animated.Value(0)).current;

if (!slot) return null; // or show a loader, or navigate away

const ctaScale = pulse.interpolate({
  inputRange: [0, 1],
  outputRange: [1, 1.05],
});

const dirArrow = (slot.lookDirection ?? "CAMERA") as LookDir;
const dirText = directionLabelFromArrow(dirArrow);

const safeIndex = Math.min(index, Math.max(0, (order?.length ?? 0) - 1));

const goToRecord = () => {
  if (transitioning || navigatingRef.current || !slot) return;

  navigatingRef.current = true;
  setTransitioning(true);

  // reset overlay anims
  transIn.stopAnimation();
  transGlow.stopAnimation();
  transIn.setValue(0);
  transGlow.setValue(0);

  setPlayLightup(false);

  slideX.stopAnimation();
  slideX.setValue(0);

  // 1) Prompt UI slides left
  Animated.timing(slideX, {
    toValue: -SCREEN_W,
    duration: 260,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  }).start();

  // 2) Overlay comes in from right
  Animated.timing(transIn, {
    toValue: 1,
    duration: 260,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  }).start(({ finished }) => {
    if (!finished) return;

    // 3) Play lights-on animation
    setPlayLightup(true);

    // 4) After ~1s → white
    whiteTimerRef.current = setTimeout(() => {
      Animated.timing(transGlow, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished: f2 }) => {
        if (!f2) return;

        // ⏳ Guarantee white is fully painted before route swap
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            router.replace(`/game/record?slotId=${slot.id}&fromWhite=1`);
          });
        });
      });
    }, 1100);
  });
};

  return (
  <ImageBackground
    source={require("../../assets/ui/promptscreen_bg.png")}
    resizeMode={Platform.OS === "android" ? "cover" : "repeat"}
    style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    imageStyle={styles.bgImage}
  >
    <View pointerEvents="none" style={styles.bgVignette} />
 
   
{/* 2) Prompt UI slides left (ONLY this moves) */}
<Animated.View
  style={{
    flex: 1,
    width: "100%",
    opacity: pageOpacity,
    transform: [{ translateX: slideX }],
  }}
>
  <ImageBackground
    source={require("../../assets/ui/prompt_skin.png")}
    resizeMode="contain"
    style={styles.skin}
  >
        
        {/* EVERYTHING that uses % positions MUST be inside this frame */}
        <View style={styles.frame}>
          
          {/* CTA */}
          <Animated.View style={[styles.ctaInkWrap, { transform: [{ scale: ctaScale }] }]}>
            <Pressable
              disabled={showExit || transitioning || !pageReady}
              onPress={goToRecord}
              style={({ pressed }) => [styles.ctaInkBtn, pressed && styles.ctaInkPressed]}
            >
             
              <View style={styles.ctaInkPlate}>
                <Text style={styles.ctaInkText}>HEAD TO SET</Text>
              </View>
            </Pressable>
          </Animated.View>


          {/* Scene / Take values */}
          <Text style={[styles.blueValue, styles.sceneVal]}>{displaySceneNumber}</Text>
          <Text style={[styles.blueValue, styles.takeVal]}>{1}</Text>

          {/* Pills */}
          <Text style={[styles.bluePillText, styles.charVal]}>{(slot as any).character ?? "You"}</Text>
          <Text style={[styles.bluePillText, styles.typeVal]}>{slot.type.replace("_", " ")}</Text>
          <Text style={[styles.bluePillText, styles.lenVal]}>{`${slot.shotLengthSeconds} SECONDS`}</Text>

<View style={styles.dirRow}>
  <View style={styles.dirPill}>
    <Text style={styles.arrowGlyph}>{arrowGlyphFromDir(dirArrow)}</Text>
    <Text style={styles.dirText}>{dirText}</Text>
  </View>
</View>



          {/* Script */}
          <View
  style={[styles.scriptVal, styles.scriptBoxHit]}
  onLayout={(e) => setScriptBoxHeight(e.nativeEvent.layout.height)}
>
  <View style={styles.scriptInnerPad}>
    <AutoFitOutlinedText
      text={slot.prompt}
      maxFontSize={38}
      minFontSize={12}
      maxLines={3}
      maxHeight={scriptBoxHeight}   // ✅ ADD THIS LINE
      outlineColor="#0a1630"
      outlineWidth={2}
      style={styles.scriptYellow}
      onReady={() => setPageReady(true)}
    />
  </View>
</View>


          {/* Page */}
          <Text style={[styles.pageBlue, styles.pageVal]}>{`PAGE ${safeIndex + 1}/${order.length}`}</Text>

        </View>
      </ImageBackground>
    </Animated.View>
    
    {/* Exit is outside (fine) */}
<Pressable
  disabled={transitioning}
  onPress={() => setShowExit(true)}
  style={[
    styles.exit,
    { top: insets.top + 12 },
    transitioning && { opacity: 0.35 },
  ]}
>
  <Text style={styles.exitText}>✕</Text>
</Pressable>


    {/* Modal */}
    <Modal visible={showExit} transparent animationType="fade" onRequestClose={() => setShowExit(false)}>
      {/* Backdrop: tap to cancel */}
  <Pressable style={modalStyles.backdrop} onPress={() => setShowExit(false)} />

  {/* Dialog */}
  <View style={modalStyles.card}>
    <Text style={modalStyles.title}>Leave Set?</Text>
    <Text style={modalStyles.body}>You will lose all progress.</Text>

    <View style={modalStyles.row}>
      <Pressable style={[modalStyles.btn, modalStyles.btnGhost]} onPress={() => setShowExit(false)}>
        <Text style={modalStyles.btnGhostText}>Keep Rolling</Text>
      </Pressable>

      <Pressable
        style={[modalStyles.btn, modalStyles.btnDanger]}
        onPress={() => {
          setShowExit(false);
          resetRunOnly?.();         // if you have it
          router.replace("/home" as any); // or wherever “home” is
        }}
      >
        <Text style={modalStyles.btnDangerText}>Exit Scene</Text>
      </Pressable>
    </View>
  </View>
</Modal>
{/* ================= TRANSITION OVERLAY ================= */}
<Animated.View
  pointerEvents={transitioning ? "auto" : "none"}
  style={[
    StyleSheet.absoluteFillObject,
    {
      zIndex: 9999,
      opacity: transIn,
      transform: [
        {
          translateX: transIn.interpolate({
            inputRange: [0, 1],
            outputRange: [SCREEN_W, 0], // comes from right
          }),
        },
      ],
    },
  ]}
>
  {/* Base frame: lights off */}
  <ImageBackground
    source={require("../../assets/images/movieset_lightsoff.png")}
    resizeMode="cover"
    style={StyleSheet.absoluteFillObject}
  />

  {/* Lights turning on (Lottie) */}
 {playLightup && (
    <LottieView
      ref={lightupRef}
      source={lightupAnim}
      autoPlay={false}
      loop={false}
      resizeMode="cover"
      style={StyleSheet.absoluteFillObject}
    />
  )}

  {/* White cover (hides route change) */}
  <Animated.View
    pointerEvents="none"
    style={[
      StyleSheet.absoluteFillObject,
      {
        backgroundColor: "#fff",
        opacity: transGlow.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
        }),
      },
    ]}
  />
</Animated.View>
{/* ================= END TRANSITION OVERLAY ================= */}
  </ImageBackground>
  );
}