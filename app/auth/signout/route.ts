import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Sign-out endpoint. Triggered by a form POST from the header. Clears the
 * Supabase session cookies and redirects back to where the user came from.
 */
export async function POST(request: NextRequest) {
  const { origin } = new URL(request.url);
  const referer = request.headers.get("referer");
  const redirectTo = referer && referer.startsWith(origin) ? referer : `${origin}/`;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.redirect(redirectTo, { status: 303 });

  const response = NextResponse.redirect(redirectTo, { status: 303 });
  const supabase = createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  await supabase.auth.signOut();
  return response;
}
