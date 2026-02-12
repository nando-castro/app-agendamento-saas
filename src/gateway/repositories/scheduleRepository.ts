import type { Block, BusinessHourItem } from "@/pages/admin/AdminSchedulePage";
import type { AxiosPromise } from "axios";

export default interface IScheduleRepository {
  listarHorarios: () => AxiosPromise<BusinessHourItem[]>;
  listarBloqueios: (params: { from: string, to: string }) => AxiosPromise<Block[]>;
  editarHorarios: (items: { items: BusinessHourItem[] }) => AxiosPromise;
  criarBloqueios: (params: { startAt:string, endAt: string, reason?: string }) => AxiosPromise;
  deletarBloqueio: (id: string) => AxiosPromise;
}
