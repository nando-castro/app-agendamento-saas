import type { AxiosPromise } from "axios";

export default interface IServiceRepository {
  listar: (params: any) => AxiosPromise<any[]>;
}
