import type { AxiosPromise } from "axios";

export default interface IDashboardRepository {
  listar: (params: any) => AxiosPromise<any[]>;
}
