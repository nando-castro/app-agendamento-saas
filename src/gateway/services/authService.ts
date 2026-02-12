import { api } from "@/lib/api";
import type IAuthRepository from "../repositories/authRepository";

const pathApi = "/auth";

const authService: IAuthRepository = {
  login: (params) => api.post(`${pathApi}/login`, params),
  register: (params) => api.post(`${pathApi}/register`, params),
};

export default authService;
