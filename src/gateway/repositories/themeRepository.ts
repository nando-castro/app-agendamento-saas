import type { AxiosPromise } from "axios";

export default interface IThemeRepository {
  listar: () => AxiosPromise<any>;
  atualizar: (payload: any) => AxiosPromise<any>;
  resetar: () => AxiosPromise<any>;
}
