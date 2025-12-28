export type SlotType = "REACTION" | "ONE_WORD" | "LINE" | "IMPROV";

export type Slot = {
  id: string;
  type: SlotType;
  prompt: string;
  example?: string;
  maxSeconds: number;

  character?: string; // "Customer"
  sceneNumber?: string; // "12B" (or derive from scene)
  directionArrow?: LookDir;

   // Optional prompt-screen metadata (no impact on record screen)
  duration?: string;        // e.g. "2 seconds"
  mood?: string;            // e.g. "serious"
  tone?: string;            // e.g. "dry"
  direction?: string;       // e.g. "Lean in closer."
};

export type Variant = {
  id: string;
  title?: string;
  slots: Slot[]; // story order
};

export type Scene = {
  id: string;
  variants: Variant[];
};

export type LookDir =
  | "LEFT"
  | "RIGHT"
  | "CAMERA"
  | "UP"
  | "DOWN"
  | "DOWN_LEFT"
  | "DOWN_RIGHT"
  | "UP_LEFT"
  | "UP_RIGHT";

export const SCENE_1: Scene = {
  id: "detective_mystery",
  variants: [
    {
      id: "v1",
      title: "Variant 1",
      slots: [
        { id: "dm_v1_1", 
          character: "Customer",
          type: "LINE", 
          maxSeconds: 3,
          prompt: "Say: “Where were you last night?”", 
          sceneNumber: "2",
          directionArrow: "LEFT"
        },
        { id: "dm_v1_2", 
          character: "Myself",
          type: "REACTION", 
          prompt: "React: shocked", 
          maxSeconds: 2,
          duration: "2 seconds",
          mood: "surprised",
          tone: "silent",
          sceneNumber: "2A",
          direction: "Let it register before reacting.", 
          directionArrow: "UP"
        },
        { id: "dm_v1_3",
          sceneNumber: "2B",
          character: "Ugly Man", 
          type: "ONE_WORD", 
          prompt: "Say one word: “Lies.”", 
          maxSeconds: 2,
          duration: "2 seconds",
          mood: "accusing",
          tone: "quiet",
          direction: "Lower your voice.",
          directionArrow: "DOWN_RIGHT"
        },
      ],
    },
    {
      id: "v2",
      title: "Variant 2",
      slots: [
        { id: "dm_v2_1", 
          type: "LINE", 
          prompt: "Say SaySay: “You’re sweating. That’s interesting.” And then cry your little heart out fool", 
          maxSeconds: 3,
          directionArrow: "CAMERA",
        },

        { id: "dm_v2_2", 
          type: "REACTION", 
          prompt: "React: suspicious man", 
          maxSeconds: 2,
          directionArrow: "RIGHT" },

        { id: "dm_v2_3", 
          type: "IMPROV", 
          prompt: "Improv: defend yourself in 2 seconds or the man will punch your face open bro! I'm", 
          maxSeconds: 2,
          directionArrow: "UP_LEFT" },
      ],
    },
  ],
};
