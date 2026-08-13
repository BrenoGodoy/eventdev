import { UserRole } from "./auth";

export const roleNavigation: Record<
  UserRole,
  { label: string; profileImage: string }
> = {
  ORGANIZER: {
    label: "Ir para o painel do organizador",
    profileImage: "/profiles/organizer.png",
  },
  CUSTOMER: {
    label: "Ir para o painel do cliente",
    profileImage: "/profiles/customer.png",
  },
  GATE: {
    label: "Ir para o painel da portaria",
    profileImage: "/profiles/gate.png",
  },
};
