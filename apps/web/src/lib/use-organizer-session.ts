"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "./use-auth-session";

export function useOrganizerSession() {
  const router = useRouter();
  const auth = useAuthSession();
  const isOrganizer = auth.session?.user.role === "ORGANIZER";

  useEffect(() => {
    if (!auth.isReady || isOrganizer) {
      return;
    }

    router.replace(auth.session ? "/" : "/login");
  }, [auth.isReady, auth.session, isOrganizer, router]);

  return { ...auth, isOrganizer };
}
