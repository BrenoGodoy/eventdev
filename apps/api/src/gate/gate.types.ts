export type ValidateTicketInput = {
  eventId?: string;
  qrPayload?: string;
  publicCode?: string;
};

export type GateValidationStatus =
  'VALID' | 'INVALID' | 'ALREADY_USED' | 'WRONG_EVENT';
