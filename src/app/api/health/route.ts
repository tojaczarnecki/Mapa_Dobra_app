import { NextResponse } from "next/server";
import { validateRuntimeEnv } from "@/lib/config/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = validateRuntimeEnv();
  if (!config.valid) return NextResponse.json(
    { status: "unavailable", checks: { application: "ok", configuration: "failed", database: "not_checked" } },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", checks: { application: "ok", configuration: "ok", database: "ok" } }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("Health check database failed.");
    return NextResponse.json(
      { status: "unavailable", checks: { application: "ok", configuration: "ok", database: "failed" } },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

