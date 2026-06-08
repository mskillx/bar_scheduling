import apiClient from "./client";
import type { Shift, ShiftCreate, ShiftUpdate, ShiftTemplate } from "@/types/shift";

export const shiftsApi = {
  list: (params?: { start?: string; end?: string; employee_id?: number }) =>
    apiClient.get<Shift[]>("/shifts/", { params }).then((r) => r.data),

  get: (id: number) => apiClient.get<Shift>(`/shifts/${id}`).then((r) => r.data),

  create: (data: ShiftCreate) => apiClient.post<Shift>("/shifts/", data).then((r) => r.data),

  update: (id: number, data: ShiftUpdate) =>
    apiClient.put<Shift>(`/shifts/${id}`, data).then((r) => r.data),

  delete: (id: number) => apiClient.delete(`/shifts/${id}`),

  listTemplates: () => apiClient.get<ShiftTemplate[]>("/templates/").then((r) => r.data),
};
