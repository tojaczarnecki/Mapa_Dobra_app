import type { InformationState } from "@/generated/prisma/enums";

export type EmergencyAnswer = InformationState | null;

export function canContinueFromEmergency(answer: EmergencyAnswer) {
  return answer !== null;
}

export function isTerminalEmergency(answer: EmergencyAnswer) {
  return answer === "YES";
}

export function restoreEmergencyAnswer(data: unknown): { answer: EmergencyAnswer; selected: boolean } {
  if (!data || typeof data !== "object") return { answer: null, selected: false };
  const value = data as { emergencyAnswer?: unknown; emergencyAnswerSelected?: unknown };
  const selected = value.emergencyAnswerSelected === true;
  const answer = value.emergencyAnswer;
  if (!selected || !["YES", "NO", "UNKNOWN"].includes(answer as string)) {
    return { answer: null, selected: false };
  }
  return { answer: answer as InformationState, selected: true };
}
