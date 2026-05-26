"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { Locale } from "@/lib/i18n/config";

type Props = {
  locale: Locale;
  supabaseConfigured: boolean;
  dict: {
    emailLabel: string;
    emailPlaceholder: string;
    sendLink: string;
    sending: string;
    linkSent: string;
    linkSentHint: string;
    notConfigured: string;
  };
};

type Status = "idle" | "sending" | "sent" | "error";

export default function LoginForm({ locale, supabaseConfigured, dict }: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setStatus("sending");

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      setError(dict.notConfigured);
      setStatus("error");
      return;
    }

    const sb = createBrowserClient(url, key);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(`/${locale}`)}`;
    const { error: signInError } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    if (signInError) {
      setError(signInError.message);
      setStatus("error");
      return;
    }

    setStatus("sent");
  }

  if (!supabaseConfigured) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        {dict.notConfigured}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-sand-700">
          {dict.emailLabel}
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={dict.emailPlaceholder}
          disabled={status === "sending" || status === "sent"}
          className="mt-1 w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-sand-900 placeholder:text-sand-400 outline-none focus:border-sand-400 focus:ring-2 focus:ring-sand-200 disabled:bg-sand-50"
        />
      </div>

      <button
        type="submit"
        disabled={status === "sending" || status === "sent" || !email}
        className="w-full rounded-full bg-sand-700 px-4 py-2.5 text-sm font-medium text-white shadow-soft hover:bg-sand-800 disabled:cursor-not-allowed disabled:bg-sand-300"
      >
        {status === "sending" ? dict.sending : status === "sent" ? dict.linkSent : dict.sendLink}
      </button>

      {status === "sent" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          {dict.linkSentHint}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          {error}
        </div>
      )}
    </form>
  );
}
