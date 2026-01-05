export type SlotType = "REACTION" | "ONE_WORD" | "LINE" | "IMPROV";

export type Slot = {
  id: string;
  type: SlotType;
  prompt: string;
  shotLengthSeconds: number;
  character?: string; // "Customer"
  lookDirection?: LookDir;
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
        { id: "santa_v1_1", 
          character: "Cashier",
          type: "ONE_WORD", 
          shotLengthSeconds: 1.7,
          prompt: "One Word: (A gift you would get your lover)", 
          lookDirection: "LEFT"
        },
        { id: "santa_v1_2", 
          character: "Cashier",
          type: "REACTION", 
          prompt: "React: Shocked", 
          shotLengthSeconds: 1.2,
          lookDirection: "UP"
        },
        { id: "santa_v1_3",
          character: "Cashier", 
          type: "ONE_WORD", 
          prompt: "Say: (A number)", 
          shotLengthSeconds: 1.7,
          lookDirection: "DOWN_RIGHT"
        },
      ],
    },
    {
      id: "v2",
      title: "Variant 2",
      slots: [
        { id: "date_v2_1", 
          type: "LINE", 
          prompt: "Say: “I live with my mom in __(Location)__", 
          shotLengthSeconds: 3,
          lookDirection: "CAMERA",
        },

        { id: "date_v2_2", 
          type: "REACTION", 
          prompt: "React: Sexy Wink", 
          shotLengthSeconds: 1.3,
          lookDirection: "RIGHT" },

        { id: "date_v2_3", 
          type: "IMPROV", 
          prompt: "Improv about where you would live if you wanted to make sure no one ever find you", 
          shotLengthSeconds: 5,
          lookDirection: "UP_LEFT" },

          { id: "date_v2_4", 
          type: "IMPROV", 
          prompt: "Perform a dance", 
          shotLengthSeconds: 4,
          lookDirection: "CAMERA",
        },
      ],
    },
  ],
};
