import { Suspense } from "react";
import { cookies } from "next/headers";
import { TemplatesBrowser } from "@/components/templates/TemplatesBrowser";

export const metadata = { title: "MiniStudio" };

export default async function Page() {
  const signedIn = (await cookies()).getAll().some((c) => c.name.endsWith("better-auth.session_token"));
  return (
    <Suspense>
      <TemplatesBrowser signedIn={signedIn} />
    </Suspense>
  );
}
