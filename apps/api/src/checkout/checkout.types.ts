export type CreateReservationInput = {
  eventId?: string;
  items?: Array<{
    tierId?: string;
    quantity?: number | string;
  }>;
};

export type SimulatePaymentInput = {
  scenario?: 'APPROVED' | 'DECLINED';
};
