import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { attendanceApi } from "@/api/attendance";
import toast from "react-hot-toast";
import i18n from "@/i18n";

const ATTENDANCE_KEY = "attendance";

export function useAttendanceToday() {
  return useQuery({
    queryKey: [ATTENDANCE_KEY, "today"],
    queryFn: attendanceApi.today,
    refetchInterval: 30_000,
  });
}

export function useAttendanceStats() {
  return useQuery({
    queryKey: [ATTENDANCE_KEY, "stats"],
    queryFn: attendanceApi.stats,
    refetchInterval: 60_000,
  });
}

export function useCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shiftId: number) => attendanceApi.checkIn(shiftId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [ATTENDANCE_KEY] });
      toast.success(i18n.t("attendance.checkInSuccess"));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || i18n.t("attendance.checkInFailed"));
    },
  });
}

export function useCheckOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shiftId: number) => attendanceApi.checkOut(shiftId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [ATTENDANCE_KEY] });
      toast.success(i18n.t("attendance.checkOutSuccess"));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || i18n.t("attendance.checkOutFailed"));
    },
  });
}
