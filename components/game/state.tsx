// components/game/state.tsx
import { SCENES } from "@/components/game/scenes";
import { shuffle } from "@/components/game/utils";
import { buildTimeline } from "@/constants/timelines";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type SceneAny = any;
type SlotAny = { id: string; shotLengthSeconds?: number } & Record<string, any>;
type VariantAny = { id: string; slots: SlotAny[] };

export type TimelineItem =
  | { type: "creator"; uri: string }
  | { type: "slot"; slotId: string };

export type GameState = {
  sceneId: string | null;
  seasonId: string;
  runId: string;
  timeline: TimelineItem[];
  setTimeline: (t: TimelineItem[]) => void;
  displaySceneNumber: string;
  bumpSceneNumber: () => void;

  scene: SceneAny;
  variant: VariantAny;
  order: SlotAny[];
  story: SlotAny[];

  index: number;
  recordings: Record<string, string>;

  setSeasonId: (id: string) => void;
  setSceneId: (id: string) => Promise<void>;
  replaySameScene: () => Promise<void>;
  resetRunOnly: () => void;
  resetAll: () => Promise<void>;
  saveRecording: (slotId: string, uri: string) => Promise<void>;
  next: () => void;

  cleanupRun: () => Promise<void>;
  saveLastRunBackup: () => Promise<void>;

    // Global transition bridge (covers nav + camera mount flashes)
  bridgeVisible: boolean;
  bridgeColor: string;
  showBridge: (color?: string) => void;
  hideBridge: () => void;
};

const Ctx = createContext<GameState | null>(null);

function bagKey(sceneId: string) {
  return `youreup_variant_bag_${sceneId}`;
}

function normalizeVariants(scene: SceneAny): VariantAny[] {
  if (scene?.variants && Array.isArray(scene.variants) && scene.variants.length > 0) return scene.variants;
  if (scene?.slots && Array.isArray(scene.slots)) return [{ id: "v1", slots: scene.slots }];
  return [{ id: "v1", slots: [] }];
}

async function pickNextVariantIndex(sceneId: string, variantCount: number) {
  if (!variantCount || variantCount < 1) return 0;

  const key = bagKey(sceneId);
  const raw = await AsyncStorage.getItem(key);

  let bag: number[] = [];
  try {
    bag = raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    bag = [];
  }

  if (!Array.isArray(bag) || bag.length === 0) {
    bag = Array.from({ length: variantCount }, (_, i) => i);
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
  }

  const picked = bag.pop() as number;
  await AsyncStorage.setItem(key, JSON.stringify(bag));
  return picked;
}

function extFromUri(uri: string) {
  const clean = uri.split("?")[0];
  const last = clean.split(".").pop();
  if (!last || last.length > 8) return "mp4";
  return last;
}

function makeFakeSceneNumber() {
  const num = Math.floor(Math.random() * 84) + 7; // 7–90
  const letters = "ABCDEFGHJKM"; // avoids I/O and after M
  const letter = letters[Math.floor(Math.random() * letters.length)];
  return `${num}${letter}`; // e.g. "12B"
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const makeRunId = () => Crypto.randomUUID();

  const [seasonId, setSeasonId] = useState("season_1");
  const [sceneId, _setSceneId] = useState(SCENES[0]?.id ?? "detective_mystery");
  const [variantIndex, setVariantIndex] = useState(0);

  const [runId, setRunId] = useState(() => makeRunId());
  const [seed, setSeed] = useState(0);
  const [index, setIndex] = useState(0);
  const [recordings, setRecordings] = useState<Record<string, string>>({});
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [displaySceneNumber, setDisplaySceneNumber] = useState(() => makeFakeSceneNumber());
  const bumpSceneNumber = () => setDisplaySceneNumber(makeFakeSceneNumber());

  const scene = useMemo(() => SCENES.find((s) => s.id === sceneId)?.scene ?? SCENES[0]?.scene, [sceneId]);
  const variants = useMemo(() => normalizeVariants(scene), [scene]);
  const variant = useMemo<VariantAny>(() => variants[variantIndex] ?? variants[0] ?? { id: "v1", slots: [] }, [variants, variantIndex]);
  const story = useMemo(() => variant?.slots ?? [], [variant]);
  const order = useMemo(() => shuffle(variant?.slots ?? []), [variant, seed]);

  const DOC_DIR = FileSystem.documentDirectory; // string | null
  const CACHE_DIR = FileSystem.cacheDirectory; // string | null
  const TEMP_ROOT = CACHE_DIR || DOC_DIR || null;

  const tempRunDir = TEMP_ROOT ? `${TEMP_ROOT}runs/${sceneId}/${runId}/` : null;
  const lastRunDir = DOC_DIR ? `${DOC_DIR}last_run/` : TEMP_ROOT ? `${TEMP_ROOT}last_run/` : null;

  const startNewRunForScene = async (nextSceneId?: string) => {
  const sid = nextSceneId ?? sceneId;

  const newRunId = makeRunId();
  setRunId(newRunId);
  setDisplaySceneNumber(makeFakeSceneNumber());

  const nextScene =
    SCENES.find((s) => s.id === sid)?.scene ?? SCENES[0]?.scene;

  const nextVariants = normalizeVariants(nextScene);
  const picked = await pickNextVariantIndex(sid, nextVariants.length);
  setVariantIndex(picked);

  const variant = nextVariants[picked] ?? nextVariants[0];

  // ✅ timeline drives final playback (creator + slot placeholders)
  //setTimeline(buildTimeline(sid, variant.id));

  setSeed((s) => s + 1);
  setIndex(0);
  setRecordings({});
};

useEffect(() => {
  // Keep timeline always synced to the currently active scene + variant
  if (!sceneId || !variant?.id) return;
  setTimeline(buildTimeline(sceneId, variant.id));
}, [sceneId, variant?.id]);

  const cleanupRun = async () => {
    if (!tempRunDir) return;
    try {
      const info = await FileSystem.getInfoAsync(tempRunDir);
      if (info.exists) await FileSystem.deleteAsync(tempRunDir, { idempotent: true });
    } catch {}
  };

  const setSceneId = async (id: string) => {
    await cleanupRun();
    _setSceneId(id);
    await startNewRunForScene(id);
  };

  const replaySameScene = async () => {
    await cleanupRun();
    await startNewRunForScene(sceneId);
  };

  const resetRunOnly = () => {
    setSeed((s) => s + 1);
    setIndex(0);
    setRecordings({});
  };

  const resetAll = async () => {
    await cleanupRun();
    _setSceneId(SCENES[0]?.id ?? "detective_mystery");
    setVariantIndex(0);
    setSeasonId("season_1");
    setRunId(makeRunId());
    setSeed((s) => s + 1);
    setIndex(0);
    setRecordings({});
    setDisplaySceneNumber(makeFakeSceneNumber());
  };

  const saveRecording = async (slotId: string, uri: string) => {
    // MVP-safe: keep URI always. Copy only if file:// and temp dir exists.
    if (!tempRunDir || !uri.startsWith("file://")) {
      setRecordings((r) => ({ ...r, [slotId]: uri }));
      return;
    }

    try {
      await FileSystem.makeDirectoryAsync(tempRunDir, { intermediates: true });
      const ext = extFromUri(uri);
      const dest = `${tempRunDir}${slotId}.${ext}`;
      await FileSystem.copyAsync({ from: uri, to: dest });
      setRecordings((r) => ({ ...r, [slotId]: dest }));
    } catch {
      setRecordings((r) => ({ ...r, [slotId]: uri }));
    }
  };

  const saveLastRunBackup = async () => {
    if (!lastRunDir) return;

    try {
      const info = await FileSystem.getInfoAsync(lastRunDir);
      if (info.exists) await FileSystem.deleteAsync(lastRunDir, { idempotent: true });

      await FileSystem.makeDirectoryAsync(lastRunDir, { intermediates: true });

      const keys = Object.keys(recordings);
      for (const slotId of keys) {
        const from = recordings[slotId];
        const ext = extFromUri(from);
        const to = `${lastRunDir}${slotId}.${ext}`;
        await FileSystem.copyAsync({ from, to });
      }

      const manifest = { savedAt: Date.now(), sceneId, variantId: variant?.id ?? "v1", runId, slots: keys };
      await FileSystem.writeAsStringAsync(`${lastRunDir}manifest.json`, JSON.stringify(manifest, null, 2));
    } catch {}
  };

   const [bridgeVisible, setBridgeVisible] = useState(false);
   const [bridgeColor, setBridgeColor] = useState("#fff"); // default white

const showBridge = (color = "#fff") => {
  setBridgeColor(color);
  setBridgeVisible(true);
};

const hideBridge = () => {
  setBridgeVisible(false);
};

  const next = () => {
    setIndex((i) => {
      const max = order.length;
      if (max === 0) return 0;
      return Math.min(i + 1, max);
    });
  };

  const value: GameState = {
    sceneId,
    seasonId,
    runId,
    scene,
    variant,
    order,
    story,
    index,
    recordings,
    setSeasonId,
    setSceneId,
    replaySameScene,
    resetRunOnly,
    resetAll,
    saveRecording,
    next,
    cleanupRun,
    saveLastRunBackup,
    bridgeVisible,
    bridgeColor,
    showBridge,
    hideBridge,
    timeline,
    setTimeline,
    displaySceneNumber,
    bumpSceneNumber,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGame() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useGame must be used inside GameProvider");
  return v;

}