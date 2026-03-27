"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { LoadingScreen } from "@/components/ui/loading-screen";

export function ProtectedShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [router, status]);

  if (status !== "authenticated") {
    return (
      <LoadingScreen
        title="Checking your session"
        subtitle="We are validating your saved tokens before we load your workspace."
      />
    );
  }

  return <>{children}</>;
}
