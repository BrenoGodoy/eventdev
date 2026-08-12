export type AuthRole = 'ORGANIZER' | 'CUSTOMER' | 'GATE';

export type DemoUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: AuthRole;
  scenario: string;
};

export const DEMO_USERS: DemoUser[] = [
  {
    id: 'usr_organizer_001',
    name: 'Organizador Elite',
    email: 'organizer@elite.dev',
    password: 'Elite123!',
    role: 'ORGANIZER',
    scenario: 'Publicacao e acompanhamento de eventos',
  },
  {
    id: 'usr_customer_001',
    name: 'Cliente Demo',
    email: 'cliente1@elite.dev',
    password: 'Elite123!',
    role: 'CUSTOMER',
    scenario: 'Compra, carteira de ingressos e compartilhamento',
  },
  {
    id: 'usr_gate_001',
    name: 'Portaria Elite',
    email: 'portaria@elite.dev',
    password: 'Elite123!',
    role: 'GATE',
    scenario: 'Scanner e validacao de entrada',
  },
];
