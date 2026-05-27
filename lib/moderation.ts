import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Submit a proposed change to the `pending_edits` queue. Authenticated
 * non-editors call this instead of writing directly to `people` /
 * `relationships`. Editors approve/reject from the admin queue.
 *
 * Generic payload shape (jsonb): for `insert`/`update` it holds the new column
 * values; for `delete` it can be null. `original_payload` carries a snapshot
 * of the row pre-edit so the admin can see a diff.
 */
export async function submitPending(
  sb: SupabaseClient,
  args: {
    submittedBy: string;
    entityType: "person" | "relationship" | "event";
    operation: "insert" | "update" | "delete";
    targetId?: string | null;
    payload?: Record<string, unknown> | null;
    originalPayload?: Record<string, unknown> | null;
    note?: string | null;
  },
): Promise<{ error: string | null }> {
  const { error } = await sb.from("pending_edits").insert({
    submitted_by: args.submittedBy,
    entity_type: args.entityType,
    operation: args.operation,
    target_id: args.targetId ?? null,
    payload: args.payload ?? null,
    original_payload: args.originalPayload ?? null,
    note: args.note ?? null,
  });
  return { error: error?.message ?? null };
}

/**
 * Apply an approved pending-edit row to the live tables. Returns null on
 * success, otherwise an error message. Called server-side by the admin
 * moderation page via a Server Action.
 */
export async function applyPendingEdit(
  sb: SupabaseClient,
  edit: {
    id: string;
    entity_type: "person" | "relationship" | "event";
    operation: "insert" | "update" | "delete";
    target_id: string | null;
    payload: Record<string, unknown> | null;
  },
  reviewerId: string,
  reviewNote: string | null,
): Promise<{ error: string | null }> {
  const table =
    edit.entity_type === "person" ? "people"
      : edit.entity_type === "relationship" ? "relationships"
      : "events";

  if (edit.operation === "insert") {
    if (!edit.payload) return { error: "Missing payload for insert." };
    const ins = await sb.from(table).insert(edit.payload);
    if (ins.error) return { error: ins.error.message };
  } else if (edit.operation === "update") {
    if (!edit.target_id || !edit.payload) return { error: "Missing target_id or payload for update." };
    const upd = await sb.from(table).update(edit.payload).eq("id", edit.target_id);
    if (upd.error) return { error: upd.error.message };
  } else if (edit.operation === "delete") {
    if (!edit.target_id) return { error: "Missing target_id for delete." };
    const del = await sb.from(table).delete().eq("id", edit.target_id);
    if (del.error) return { error: del.error.message };
  }

  const mark = await sb
    .from("pending_edits")
    .update({
      status: "approved",
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote,
    })
    .eq("id", edit.id);
  if (mark.error) return { error: mark.error.message };
  return { error: null };
}

export async function rejectPendingEdit(
  sb: SupabaseClient,
  editId: string,
  reviewerId: string,
  reviewNote: string | null,
): Promise<{ error: string | null }> {
  const { error } = await sb
    .from("pending_edits")
    .update({
      status: "rejected",
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote,
    })
    .eq("id", editId);
  return { error: error?.message ?? null };
}
