import { api } from "@/lib/api";
import type IServiceRepository from "../repositories/serviceRepository";

const serviceService: IServiceRepository = {
  listar: (params) => api.get(`/services`, { params }),
};

export default serviceService;
