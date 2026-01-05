import { SCENE_1 } from "@/components/game/scene";

export type SceneDef = {
  id: string;
  seasonId: string;
  title: string;
  subtitle?: string;
  scene: typeof SCENE_1;
};

export const SCENES: SceneDef[] = [
  {
    id: SCENE_1.id,
    seasonId: "season_1",
    title: "Detective Mystery!",
    subtitle: "New version each time",
    scene: SCENE_1,
  },
] as const;
