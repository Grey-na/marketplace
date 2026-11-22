import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";
import { safeNext } from "@/lib/auth";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: `Log in | ${SITE_NAME}` };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;

  return (
    <AuthShell
      panelClass="bg-lavender"
      heading={<>Good to <em>see you</em> again.</>}
      text="Log in to see your cart, your orders and the shops you follow."
    >
      <LoginForm next={safeNext(next)} />
      <p className="mt-6 text-center text-sm">
        New here?{" "}
        <Link href="/register" className="font-semibold underline decoration-coral decoration-2 underline-offset-4">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}