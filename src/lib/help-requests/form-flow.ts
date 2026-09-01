export const HELP_REQUEST_STEP_COUNT = 4;
export const HELP_REQUEST_FORM_TYPE = "help-request-v3";

export type HelpRequestStep = 1 | 2 | 3 | 4;

export function restoreHelpRequestStep(value: unknown): HelpRequestStep {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > HELP_REQUEST_STEP_COUNT) return 1;
  return value as HelpRequestStep;
}

export function stripHelpRequestContact<T extends Record<string, unknown>>(data: T) {
  const draft = { ...data } as T & Record<string, unknown>;
  delete draft.reporterName;
  delete draft.reporterPhone;
  delete draft.reporterEmail;
  return draft as Omit<T, "reporterName" | "reporterPhone" | "reporterEmail">;
}
