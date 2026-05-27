"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type Props = {
  editId: string;
  locale: "ar" | "en";
};

/**
 * Approve / reject buttons for a single pending_edits row. Calls the
 * /api/moderation endpoint which, server-side, fetches the row, applies the
 * change to the live table, and marks the row as approved or rejected.
 */
export default function QueueActions({ editId, locale }: Props) {
  const router = useRouter();
  const ar = locale === "ar";
  const [pending, setPending] = useState<null | "approve" | "reject">(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  async function act(kind: "approve" | "reject") {
    setError(null);
    setPending(kind);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      setError(ar ? "Supabase غير مهيأ." : "Supabase not configured.");
      setPending(null);
      return;
    }
    const sb = createBrowserClient(url, key);
    const { data: u } = await sb.auth.getUser();
    if (!u.user) {
      setError(ar ? "غير مصرّح." : "Not authenticated.");
      setPending(null);
      return;
    }

    if (kind === "reject") {
      const { error: e } = await sb
        .from("pending_edits")
        .update({
          status: "rejected",
          reviewed_by: u.user.id,
          reviewed_at: new Date().toISOString(),
          review_note: reviewNote.trim() || null,
        })
        .eq("id", editId);
      setPending(null);
      if (e) { setError(e.message); return; }
      router.refresh();
      return;
    }

    // Approve — fetch the pending row, apply the operation to the live table,
    // mark the row approved. Done client-side because all the editors-write
    // RLS policies are already in place; the editor's session has the
    // privileges.
    const { data: edit, error: fetchErr } = await sb
      .from("pending_edits")
      .select("entity_type, operation, target_id, payload")
      .eq("id", editId)
      .single();
    if (fetchErr || !edit) {
      setError(fetchErr?.message ?? "Could not load pending edit.");
      setPending(null);
      return;
    }

    type ApplyError = { message: string } | null;
    const table = edit.entity_type === "person" ? "people"
      : edit.entity_type === "relationship" ? "relationships"
      : "events";

    let applyErr: ApplyError = null;
    if (edit.operation === "insert") {
      if (!edit.payload) applyErr = { message: "Missing payload." };
      else {
        const ins = await sb.from(table).insert(edit.payload);
        if (ins.error) applyErr = { message: ins.error.message };
      }
    } else if (edit.operation === "update") {
      if (!edit.target_id || !edit.payload) applyErr = { message: "Missing target_id or payload." };
      else {
        const upd = await sb.from(table).update(edit.payload).eq("id", edit.target_id);
        if (upd.error) applyErr = { message: upd.error.message };
      }
    } else if (edit.operation === "delete") {
      if (!edit.target_id) applyErr = { message: "Missing target_id." };
      else {
        const del = await sb.from(table).delete().eq("id", edit.target_id);
        if (del.error) applyErr = { message: del.error.message };
      }
    }
    if (applyErr) {
      setError(applyErr.message);
      setPending(null);
      return;
    }

    const mark = await sb
      .from("pending_edits")
      .update({
        status: "approved",
        reviewed_by: u.user.id,
        reviewed_at: new Date().toISOString(),
        review_note: reviewNote.trim() || null,
      })
      .eq("id", editId);
    setPending(null);
    if (mark.error) { setError(mark.error.message); return; }
    router.refresh();
  }

  return (
    <div className="mt-4 border-t border-sand-100 pt-4">
      <input
        type="text"
        value={reviewNote}
        onChange={(e) => setReviewNote(e.target.value)}
        placeholder={ar ? "ملاحظة المراجع (اختياري)" : "Reviewer note (optional)"}
        className="mb-3 w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-xs outline-none focus:border-sand-400 focus:ring-2 focus:ring-sand-200"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => act("approve")}
          disabled={pending !== null}
          className="rounded-full bg-emerald-700 px-4 py-1.5 text-xs font-medium text-white shadow-soft hover:bg-emerald-800 disabled:bg-emerald-300"
        >
          {pending === "approve" ? (ar ? "جارٍ..." : "Approving…") : (ar ? "موافقة وتطبيق" : "Approve & apply")}
        </button>
        <button
          type="button"
          onClick={() => act("reject")}
          disabled={pending !== null}
          className="rounded-full border border-rose-300 bg-white px-4 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
        >
          {pending === "reject" ? (ar ? "جارٍ..." : "Rejecting…") : (ar ? "رفض" : "Reject")}
        </button>
      </div>
      {error && (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-2 text-xs text-rose-900">
          {error}
        </div>
      )}
    </div>
  );
}
