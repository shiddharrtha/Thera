const TIPS = [
  'Scan fields in the morning when lighting is even for better weed detection.',
  'Walk at a steady pace along crop rows — about one row per second works well.',
  'Re-scan fields after rain once foliage dries; wet leaves can affect stress readings.',
  'Target spray only flagged acres to cut chemical use and protect healthy crop areas.',
  'Compare reports over time in Timeline to spot worsening weed or stress trends early.',
  'Keep GPS enabled during scans so problem areas map accurately to your field.',
];

export function pickNotificationTip(seed: number): string {
  const index = Math.abs(seed) % TIPS.length;
  return TIPS[index]!;
}
