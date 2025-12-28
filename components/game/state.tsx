import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system";
import React, { createContext, useContext, useMemo, useState } from "react";

import { SCENES } from "@/components/game/scenes";
import { shuffle } from "@/components/game/utils";

type SceneAny = any;

type VariantAny = {
  id: string;
  slots: any[];
};

type SlotAny = any;

type GameState = {
  // identity
  sceneId: string;
  seasonId: string;
  runId: string;

  // content
  scene: SceneAny;
  variant: VariantAny;
  order: SlotAny[];
  story: SlotAny[];

  // progress
  index: number;
  recordings: Record<string, string>; // slotId -> local uri (temp)

  // actions
  setSeasonId: (id: string) => void;
  setSceneId: (id: string) => Promise<void>;
  replaySameScene: () => Promise<void>;
  resetRunOnly: () => void;
  resetAll: () => Promise<void>;

  saveRecording: (slotId: string, uri: string) => Promise<void>;
  next: () => void;

  // temp / safety net
  cleanupRun: () => Promise<void>;
  saveLastRunBackup: () => Promise<void>; // overwrites last run backup
};

const Ctx = createContext<GameState | null>(null);

function bagKey(sceneId: string) {
  return `youreup_variant_bag_${sceneId}`;
}

function normalizeVariants(scene: SceneAny): VariantAny[] {
  if (scene?.variants && Array.isArray(scene.variants) && scene.variants.length > 0) {
    return scene.variants;
  }
  if (scene?.slots && Array.isArray(scene.slots)) {
    return [{ id: "v1", slots: scene.slots }];
  }
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
    // shuffle
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
  }

  const picked = bag.pop() as number;
  await AsyncStorage.setItem(key, JSON.stringify(bag));
  return picked;
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const makeRunId = () => Crypto.randomUUID();

  const [seasonId, setSeasonId] = useState("season_1");
  const [sceneId, _setSceneId] = useState(SCENES[0]?.id ?? "scene_1");
  const [variantIndex, setVariantIndex] = useState(0);

  const [runId, setRunId] = useState<string>(() => makeRunId());
  const [seed, setSeed] = useState(0);

  const [index, setIndex] = useState(0);
  const [recordings, setRecordings] = useState<Record<string, string>>({});

  const scene = useMemo(() => {
    return SCENES.find((s) => s.id === sceneId)?.scene ?? SCENES[0]?.scene;
  }, [sceneId]);

  const variants = useMemo(() => normalizeVariants(scene), [scene]);
  const variant = useMemo(() => variants[variantIndex] ?? variants[0] ?? { id: "v1", slots: [] }, [variants, variantIndex]);

  const story = useMemo(() => (variant?.slots ? variant.slots : []), [variant]);
  const order = useMemo(() => shuffle(variant?.slots ? variant.slots : []), [variant, seed]);

// TS-safe directory access (fixes "cacheDirectory/documentDirectory does not exist")
// Directory access (never throw; some environments can return undefined)
const DOC_DIR =
  (FileSystem as any).documentDirectory ??
  (FileSystem as any).documentDirectory;

const CACHE_DIR =
  (FileSystem as any).cacheDirectory ??
  (FileSystem as any).cacheDirectory;

// Prefer cache for temp; fall back to doc; if neither exists, run in "memory only"
const TEMP_ROOT: string | undefined = (CACHE_DIR as string | undefined) ?? (DOC_DIR as string | undefined);

const tempRunDir: string | null = TEMP_ROOT ? `${TEMP_ROOT}runs/${sceneId}/${runId}/` : null;
const lastRunDir: string | null = (DOC_DIR as string | undefined)
  ? `${DOC_DIR}last_run/`
  : TEMP_ROOT
    ? `${TEMP_ROOT}last_run/`
    : null;

    // --- core run start (new runId + new variant + clean state) ---
  const startNewRunForScene = async (nextSceneId?: string) => {
    const sid = nextSceneId ?? sceneId;

    // new identity
    const newRunId = makeRunId();
    setRunId(newRunId);

    // choose next variant (no-repeat bag)
    const nextScene = SCENES.find((s) => s.id === sid)?.scene ?? SCENES[0]?.scene;
    const nextVariants = normalizeVariants(nextScene);
    const picked = await pickNextVariantIndex(sid, nextVariants.length);
    setVariantIndex(picked);

    // reset run state
    setSeed((s) => s + 1);
    setIndex(0);
    setRecordings({});
  };

  const resetRunOnly = () => {
    // keep same runId + variant, but wipe progress/order
    setSeed((s) => s + 1);
    setIndex(0);
    setRecordings({});
  };

  const cleanupRun = async () => {
  if (!tempRunDir) return;
  try {
    const info = await FileSystem.getInfoAsync(tempRunDir);
    if (info.exists) {
      await FileSystem.deleteAsync(tempRunDir, { idempotent: true });
    }
  } catch {}
};
  
  const setSceneId = async (id: string) => {
    // leaving previous run -> cleanup temp
    await cleanupRun();

    _setSceneId(id);
    await startNewRunForScene(id);
  };

  const replaySameScene = async () => {
    // Play Again should be a NEW variant (you requested this)
    await cleanupRun();
    await startNewRunForScene(sceneId);
  };

  const resetAll = async () => {
    await cleanupRun();
    _setSceneId(SCENES[0]?.id ?? "scene_1");
    setVariantIndex(0);
    setSeasonId("season_1");
    // new run id + cleared run
    setRunId(makeRunId());
    setSeed((s) => s + 1);
    setIndex(0);
    setRecordings({});
  };

  const saveRecording = async (slotId: string, uri: string) => {
  // TEMP only (not "saved"). If filesystem dirs unavailable, keep raw uri in memory.
  if (!tempRunDir) {
    setRecordings((r) => ({ ...r, [slotId]: uri }));
    return;
  }

  try {
    await FileSystem.makeDirectoryAsync(tempRunDir, { intermediates: true });

    const ext = uri.split(".").pop() || "mp4";
    const dest = `${tempRunDir}${slotId}.${ext}`;

    await FileSystem.copyAsync({ from: uri, to: dest });

    setRecordings((r) => ({ ...r, [slotId]: dest }));
  } catch {
    setRecordings((r) => ({ ...r, [slotId]: uri }));
  }
};

  const saveLastRunBackup = async () => {
    // Safety net: keep ONLY the last run (overwrite each time).
    // Copies the TEMP run folder into documentDirectory/last_run/
    if (!lastRunDir) return;
    try {
      // wipe old
      const info = await FileSystem.getInfoAsync(lastRunDir);
      if (info.exists) {
        await FileSystem.deleteAsync(lastRunDir, { idempotent: true });
      }
      await FileSystem.makeDirectoryAsync(lastRunDir, { intermediates: true });

      // copy each recorded file into last_run/
      const keys = Object.keys(recordings);
      for (const slotId of keys) {
        const from = recordings[slotId];
        const ext = from.split(".").pop() || "mp4";
        const to = `${lastRunDir}${slotId}.${ext}`;
        await FileSystem.copyAsync({ from, to });
      }

      // store a tiny manifest for debugging / later resume
      const manifest = {
        savedAt: Date.now(),
        sceneId,
        runId,
        variantId: variant?.id ?? "v1",
        slots: keys,
      };
      await FileSystem.writeAsStringAsync(`${lastRunDir}manifest.json`, JSON.stringify(manifest, null, 2));
    } catch {}
  };

  const next = () => setIndex((i) => i + 1);

  return (
    <Ctx.Provider
      value={{
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
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useGame() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useGame must be used inside GameProvider");
  return v;
}
