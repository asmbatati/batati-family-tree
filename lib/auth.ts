import { getServerSupabase } from "@/lib/supabase/server";

/**
 * The currently-signed-in user, or null. Safe to call when Supabase env vars
 * are missing — returns null instead of throwing.
 */
export async function getCurrentUser() {
  const sb = await getServerSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data.user ?? null;
}

/**
 * True if the signed-in user is listed in public.editors. Used to gate write
 * UI; the database also enforces this via RLS, so this check is a UX
 * convenience — not a security boundary.
 */
export async function isEditor(): Promise<boolean> {
  const sb = await getServerSupabase();
  if (!sb) return false;
  const { data: userData } = await sb.auth.getUser();
  const user = userData.user;
  if (!user) return false;
  const { data, error } = await sb
    .from("editors")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  return !error && !!data;
}

/**
 * Returns the `people.id` this user has claimed as themselves, or null if
 * they haven't gone through the welcome-claim flow yet.
 */
export async function getClaimedPersonId(): Promise<string | null> {
  const sb = await getServerSupabase();
  if (!sb) return null;
  const { data: userData } = await sb.auth.getUser();
  const user = userData.user;
  if (!user) return null;
  const { data, error } = await sb
    .from("user_people")
    .select("person_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { person_id: string | null }).person_id ?? null;
}

/**
 * Aggregated viewer state — one round-trip captures everything the UI needs to
 * decide what to show. `canSuggest` is true for any authenticated non-editor:
 * they can submit edits/events to the moderation queue.
 */
export type ViewerContext = {
  user: { id: string; email: string | null } | null;
  isEditor: boolean;
  claimedPersonId: string | null;
  canSuggest: boolean;
};

export async function getViewerContext(): Promise<ViewerContext> {
  const sb = await getServerSupabase();
  if (!sb) return { user: null, isEditor: false, claimedPersonId: null, canSuggest: false };
  const { data: userData } = await sb.auth.getUser();
  const u = userData.user;
  if (!u) return { user: null, isEditor: false, claimedPersonId: null, canSuggest: false };
  const [editorRes, claimRes] = await Promise.all([
    sb.from("editors").select("user_id").eq("user_id", u.id).maybeSingle(),
    sb.from("user_people").select("person_id").eq("user_id", u.id).maybeSingle(),
  ]);
  const editor = !editorRes.error && !!editorRes.data;
  const claimedPersonId = !claimRes.error && claimRes.data ? (claimRes.data as { person_id: string | null }).person_id ?? null : null;
  return {
    user: { id: u.id, email: u.email ?? null },
    isEditor: editor,
    claimedPersonId,
    canSuggest: !editor, // non-editor authenticated users → moderation queue
  };
}
