import { api } from "@/lib/api";
import type IScheduleRepository from "../repositories/scheduleRepository";

const pathApi = "/schedule";

const scheduleService: IScheduleRepository = {
  listarHorarios: () => api.get(`${pathApi}/business-hours`),
  listarBloqueios: (params) => api.get(`${pathApi}/blocks`, { params }),
  editarHorarios: (items) => api.put(`${pathApi}/business-hours`, items),
  criarBloqueios: (params) => api.post(`${pathApi}/blocks`, params),
  deletarBloqueio: (id) => api.delete(`${pathApi}/blocks/${id}`),
};

export default scheduleService;
