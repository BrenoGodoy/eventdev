"use client";

import { AuthSession } from "../../lib/auth";
import { CustomerHome } from "./CustomerHome";
import { GateHome } from "./GateHome";
import { OrganizerHome } from "./OrganizerHome";
import { PublicHome } from "./PublicHome";
import { RoleHomeStatus } from "./RoleHomeShared";

type RoleHomeProps = {
  isReady: boolean;
  session: AuthSession | null;
};

export function RoleHome({ isReady, session }: RoleHomeProps) {
  if (!isReady) {
    return (
      <RoleHomeStatus
        error={false}
        eyebrow="Sua EventDev"
        title="Preparando sua Home"
      />
    );
  }

  if (!session) {
    return <PublicHome />;
  }

  if (session.user.role === "CUSTOMER") {
    return <CustomerHome session={session} />;
  }

  if (session.user.role === "ORGANIZER") {
    return <OrganizerHome session={session} />;
  }

  return <GateHome session={session} />;
}
