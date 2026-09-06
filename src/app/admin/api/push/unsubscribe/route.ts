import { NextResponse } from "next/server";
import { unsubscribeAdminDevice } from "@/lib/push/subscriptions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 }); }
  const result = await unsubscribeAdminDevice(body && typeof body === "object" ? (body as { endpoint?: unknown }).endpoint : null);
  return NextResponse.json(result.ok ? result : { error: result.error }, { status: result.status });
}
