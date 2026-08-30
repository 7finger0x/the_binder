import type { Condition } from "./cards";

const MULTIPLIERS: Record<Condition, number> = {
  NM: 1,
  LP: 0.85,
  MP: 0.7,
  HP: 0.5,
  DMG: 0.3,
  Graded: 1,
};

export function conditionMultiplier(condition: string): number {
  if (condition in MULTIPLIERS) return MULTIPLIERS[condition as Condition];
  return 1;
}
