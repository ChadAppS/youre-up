export type SeasonDef = {
  id: string;
  title: string;
  subtitle?: string;
  sceneIds: string[];
};

export const SEASONS: SeasonDef[] = [
  {
    id: "season_1",
    title: "Season 1",
    subtitle: "4 scenes • Party pack",
    sceneIds: ["scene_1"],
  },
] as const;
