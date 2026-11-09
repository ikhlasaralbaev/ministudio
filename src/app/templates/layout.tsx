import { cookies } from "next/headers";
import Link from "next/link";
import { LangSwitch, Logo } from "@/components/ui";
import { TemplatesHeaderLinks } from "@/components/templates/TemplatesHeaderLinks";

/** Public: the gallery can be browsed without an account, so it has its own slim header instead of the app shell. */
export default async function Layout({ children }: { children: React.ReactNode }) {
  const signedIn = (await cookies()).getAll().some((c) => c.name.endsWith("better-auth.session_token"));
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="glass sticky top-0 z-30 flex h-12 shrink-0 items-center gap-3 border-b border-line px-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Logo size={26} />
          <span className="hidden sm:inline">MiniStudio</span>
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <LangSwitch />
          <TemplatesHeaderLinks signedIn={signedIn} />
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
