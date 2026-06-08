import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { shiftsApi } from "@/api/shifts";
import type { ShiftCreate, ShiftUpdate } from "@/types/shift";
import toast from "react-hot-toast";
import i18n from "@/i18n";

export const SHIFTS_KEY = "shifts";

export function useShifts(params?: { start?: string; end?: string; employee_id?: number }) {
  return useQuery({
    queryKey: [SHIFTS_KEY, params],
    queryFn: () => shiftsApi.list(params),
  });
}

export function useCreateShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ShiftCreate) => shiftsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SHIFTS_KEY] });
      toast.success(i18n.t("shift.created"));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || i18n.t("shift.failedCreate"));
    },
  });
}

export function useUpdateShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ShiftUpdate }) => shiftsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SHIFTS_KEY] });
      toast.success(i18n.t("shift.updated"));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || i18n.t("shift.failedUpdate"));
    },
  });
}

export function useDeleteShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => shiftsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SHIFTS_KEY] });
      toast.success(i18n.t("shift.deleted"));
    },
    onError: () => toast.error(i18n.t("shift.failedDelete")),
  });
}

export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: shiftsApi.listTemplates,
  });
}
