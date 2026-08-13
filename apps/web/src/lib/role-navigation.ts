import { UserRole } from "./auth";

export const roleNavigation: Record<
  UserRole,
  { label: string; profileImage: string; href: string }
> = {
  ORGANIZER: {
    label: "Ir para o painel do organizador",
    profileImage: "/profiles/organizer.png",
    href: "/organizador/eventos",
  },
  CUSTOMER: {
    label: "Ir para o painel do cliente",
    profileImage: "/profiles/customer.png",
    href: "/meus-ingressos",
  },
  GATE: {
    label: "Ir para o painel da portaria",
    profileImage: "/profiles/gate.png",
    href: "/#painel",
  },
};
