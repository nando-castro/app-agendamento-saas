export interface IAuthLoginRequest {
  email: string;
  password: string;
}

export interface IAuthLoginResponse {
  accessToken: string;
}

export interface IAuthRegisterRequest {
  tenantName: string;
  tenantSlug: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}
