import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin/session";
import { sendPushToAdminUser } from "@/lib/push/subscriptions";

export const runtime = "nodejs";

export async function POST() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const result = await sendPushToAdminUser(admin.user.id, {
    title: "Dobra Mapa",
    body: "Powiadomienia działają na tym urządzeniu.",
    url: "/admin/moje-miejsca",
    tag: "admin-push-test",
  });
  return NextResponse.json(result);
}
