import apiClient from "./client";
import type { LoginRequest, TokenResponse, ChangePasswordRequest } from "@/types/auth";
import type { User } from "@/types/user";

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<TokenResponse>("/auth/login", data).then((r) => r.data),

  refresh: (refreshToken: string) =>
    apiClient
      .post<TokenResponse>("/auth/refresh", { refresh_token: refreshToken })
      .then((r) => r.data),

  logout: () => apiClient.post("/auth/logout"),

  me: () => apiClient.get<User>("/auth/me").then((r) => r.data),

  changePassword: (data: ChangePasswordRequest) =>
    apiClient.post("/auth/change-password", data).then((r) => r.data),
};
