export type Service = {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
  active: boolean;
  signalPercentOverride?: number | null;
};

export type AvailabilityResponse = {
  date: string;
  timezone: string;
  serviceId: string;
  durationMinutes: number;
  slotIntervalMinutes: number;
  slots: Array<{ startAt: string; endAt: string }>;
};

export type Booking = {
  id: string;
  code: string;
  startAt: string;
  endAt: string;
  status: string;
  signalAmountCents: number;
  totalPriceCents: number;
  service: { id: string; name: string; durationMinutes: number; priceCents: number };
  customer: { id: string; name: string; phone: string; email?: string | null };
  createdAt: string;
  expiresAt?: string | null;
};

export type BookingLink = {
  id: string;
  token: string;
  active: boolean;
  serviceId?: string | null;
  createdAt: string;
  service?: { id: string; name: string } | null;
};
