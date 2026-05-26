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
