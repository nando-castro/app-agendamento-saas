import { api } from "@/lib/api";
import type IBookingRepository from "../repositories/bookingsRepository";

const bookingService: IBookingRepository = {
  listarBookings: (params) => api.get(`/bookings`, { params }),
};

export default bookingService;
