import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import LoginForm from "@/components/auth/LoginForm";

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;
  const t = getDictionary(locale);

  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl text-sand-900">{t.auth.loginTitle}</h1>
      <p className="mt-2 text-sand-700">{t.auth.loginSubtitle}</p>

      <div className="mt-8 rounded-3xl border border-sand-200 bg-white/80 p-6 shadow-soft">
        <LoginForm
          locale={locale}
          supabaseConfigured={supabaseConfigured}
          dict={{
            emailLabel: t.auth.emailLabel,
            emailPlaceholder: t.auth.emailPlaceholder,
            sendLink: t.auth.sendLink,
            sending: t.auth.sending,
            linkSent: t.auth.linkSent,
            linkSentHint: t.auth.linkSentHint,
            notConfigured: t.auth.notConfigured,
          }}
        />
      </div>
    </div>
  );
}
