import type { Booking } from "@/lib/types";
import type { AxiosPromise } from "axios";

export default interface IBookingRepository {
  listarBookings: (params: { from: string; to: string }) => AxiosPromise<Booking[]>;
}
