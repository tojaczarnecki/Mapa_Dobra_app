import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin/session";
import { getWebPushPublicKey, isWebPushConfigured } from "@/lib/push/web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ available: false }, { status: 401 });
  return NextResponse.json({ available: isWebPushConfigured(), publicKey: getWebPushPublicKey() });
}
