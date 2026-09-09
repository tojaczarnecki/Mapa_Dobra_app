import { NextResponse } from "next/server";
import { getSystemState, publicWriteBlockMessage } from "@/lib/system/settings";

export async function publicWriteBlockedResponse() {
  const state = await getSystemState();
  if (state.mode === "NORMAL") return null;

  return NextResponse.json(
    { ok: false, code: "PUBLIC_WRITES_DISABLED", message: publicWriteBlockMessage() },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
