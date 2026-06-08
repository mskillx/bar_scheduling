import apiClient from "./client";
import type { AttendanceStatus, AttendanceStats } from "@/types/attendance";

export const attendanceApi = {
  today: () => apiClient.get<AttendanceStatus[]>("/attendance/today").then((r) => r.data),

  checkIn: (shiftId: number) =>
    apiClient.post<AttendanceStatus>(`/attendance/checkin/${shiftId}`).then((r) => r.data),

  checkOut: (shiftId: number) =>
    apiClient.post<AttendanceStatus>(`/attendance/checkout/${shiftId}`).then((r) => r.data),

  stats: () => apiClient.get<AttendanceStats[]>("/attendance/stats").then((r) => r.data),
};
