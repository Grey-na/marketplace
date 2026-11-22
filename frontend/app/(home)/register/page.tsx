import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import RegisterForm from "@/components/auth/RegisterForm";
import { safeNext } from "@/lib/auth";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: `Create an account | ${SITE_NAME}` };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;

  return (
    <AuthShell
      panelClass="bg-mint"
      heading={<>Join the <em>small shop</em> party.</>}
      text="Shop from independent makers, or open your own shop and get discovered."
    >
      <RegisterForm next={safeNext(next)} />
      <p className="mt-6 text-center text-sm">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold underline decoration-coral decoration-2 underline-offset-4">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}