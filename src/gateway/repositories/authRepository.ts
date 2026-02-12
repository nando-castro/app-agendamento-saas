import type { IAuthLoginRequest, IAuthLoginResponse, IAuthRegisterRequest } from "@/@types/auth";
import type { AxiosPromise } from "axios";

export default interface IAuthRepository {
  login: (params: IAuthLoginRequest) => AxiosPromise<IAuthLoginResponse>;
  register: (params: IAuthRegisterRequest) => AxiosPromise;
}
