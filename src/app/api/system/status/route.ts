import { getSystemState } from "@/lib/system/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await getSystemState();
  return Response.json(
    {
      mode: state.mode,
      maintenanceTitle: state.maintenanceTitle,
      maintenanceMessage: state.maintenanceMessage,
      noticeEnabled: state.noticeEnabled,
      noticeText: state.noticeText,
      noticeLevel: state.noticeLevel,
      noticeDismissible: state.noticeDismissible,
      version: state.version,
      updatedAt: state.updatedAt,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
