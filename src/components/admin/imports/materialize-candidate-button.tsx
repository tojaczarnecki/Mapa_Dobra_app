"use client";

import { useActionState } from "react";
import Link from "next/link";
import { FilePlus2 } from "lucide-react";
import { materializeCandidateAction, type MaterializeCandidateActionState } from "@/app/admin/(protected)/importy/actions";

const initialState: MaterializeCandidateActionState = { ok: false, message: "" };

export function MaterializeCandidateButton({ candidateId, batchId }: { candidateId: string; batchId: string }) {
  const [state, action, pending] = useActionState(materializeCandidateAction, initialState);
  return <div><form action={action}><input type="hidden" name="candidateId" value={candidateId} /><input type="hidden" name="batchId" value={batchId} /><button type="submit" disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-3 text-sm font-bold text-[#10231e] hover:bg-brand-strong hover:text-white disabled:cursor-wait disabled:opacity-60"><FilePlus2 aria-hidden="true" size={17} />{pending ? "Tworzę szkic..." : "Utwórz jako szkic"}</button></form>{state.ok && state.placeId ? <p className="mt-2 text-xs font-semibold text-brand-strong">{state.message} <Link href={`/admin/miejsca/${state.placeId}`} className="underline">Otwórz szkic</Link></p> : state.ok ? <p className="mt-2 text-xs font-semibold text-urgent">{state.message}</p> : state.message ? <p className="mt-2 text-xs font-semibold text-urgent">{state.message}</p> : null}</div>;
}
