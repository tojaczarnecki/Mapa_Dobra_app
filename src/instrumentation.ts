import { validateRuntimeEnv } from "@/lib/config/env";

export function register() {
  if (process.env.NODE_ENV !== "production" || process.env.NEXT_PHASE === "phase-production-build") return;
  const result = validateRuntimeEnv(process.env);
  if (!result.valid) throw new Error(`[config] Missing or invalid production configuration: ${result.errors.join(", ")}`);
}

