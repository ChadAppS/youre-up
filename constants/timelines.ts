import type { TimelineItem } from "@/components/game/state";
import { Asset } from "expo-asset";

export function buildTimeline(sceneId: string, variantId: string): TimelineItem[] {
  if (sceneId === "detective_mystery" && variantId === "v1") {
    return [
      { type: "creator", uri: Asset.fromModule(require("../assets/videos/1_Opening.mp4")).uri },
      { type: "slot", slotId: "santa_v1_1" },
      { type: "creator", uri: Asset.fromModule(require("../assets/videos/2_Middle.mp4")).uri },
      { type: "slot", slotId: "santa_v1_2" },
      { type: "creator", uri: Asset.fromModule(require("../assets/videos/3_Middle.mp4")).uri },
      { type: "slot", slotId: "santa_v1_3" },
      { type: "creator", uri: Asset.fromModule(require("../assets/videos/4_Ending.mp4")).uri },
    ];
  }

  if (sceneId === "detective_mystery" && variantId === "v2") {
    return [
      { type: "creator", uri: Asset.fromModule(require("../assets/videos/v2_1Open.mp4")).uri },
      { type: "slot", slotId: "date_v2_1" },
      { type: "creator", uri: Asset.fromModule(require("../assets/videos/v2_2M.mp4")).uri },
      { type: "slot", slotId: "date_v2_2" },
      { type: "creator", uri: Asset.fromModule(require("../assets/videos/v2_3M.mp4")).uri },
      { type: "slot", slotId: "date_v2_3" },
      { type: "creator", uri: Asset.fromModule(require("../assets/videos/v2_4Close.mp4")).uri },
      { type: "slot", slotId: "date_v2_4" },
    ];
  }

  return [];
}
