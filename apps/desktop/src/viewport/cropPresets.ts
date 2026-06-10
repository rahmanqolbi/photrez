export const CROP_PRESETS = [
  { label: "1:1", value: "1:1", aspect: { w: 1, h: 1 } },
  { label: "4:5", value: "4:5", aspect: { w: 4, h: 5 } },
  { label: "5:4", value: "5:4", aspect: { w: 5, h: 4 } },
  { label: "2:3", value: "2:3", aspect: { w: 2, h: 3 } },
  { label: "3:2", value: "3:2", aspect: { w: 3, h: 2 } },
  { label: "4:3", value: "4:3", aspect: { w: 4, h: 3 } },
  { label: "9:16", value: "9:16", aspect: { w: 9, h: 16 } },
  { label: "16:9", value: "16:9", aspect: { w: 16, h: 9 } },
  { label: "21:9", value: "21:9", aspect: { w: 21, h: 9 } },
] as const;

export const PILL_PRESETS = [
  { label: "1:1", value: "1:1", aspect: { w: 1, h: 1 } },
  { label: "4:3", value: "4:3", aspect: { w: 4, h: 3 } },
  { label: "16:9", value: "16:9", aspect: { w: 16, h: 9 } },
  { label: "3:2", value: "3:2", aspect: { w: 3, h: 2 } },
  { label: "21:9", value: "21:9", aspect: { w: 21, h: 9 } },
] as const;
