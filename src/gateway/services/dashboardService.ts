import { api } from "@/lib/api";
import type IDashboardRepository from "../repositories/dashboardRepository";

const dashboardService: IDashboardRepository = {
  listar: (params) => api.get(`/dashboard`, { params }),
};

export default dashboardService;
