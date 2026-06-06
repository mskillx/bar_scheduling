import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { shiftsApi } from '@/api/shifts'
import type { ShiftCreate, ShiftUpdate } from '@/types/shift'
import toast from 'react-hot-toast'

export const SHIFTS_KEY = 'shifts'

export function useShifts(params?: { start?: string; end?: string; employee_id?: number }) {
  return useQuery({
    queryKey: [SHIFTS_KEY, params],
    queryFn: () => shiftsApi.list(params),
  })
}

export function useCreateShift() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ShiftCreate) => shiftsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SHIFTS_KEY] })
      toast.success('Shift created')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create shift')
    },
  })
}

export function useUpdateShift() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ShiftUpdate }) => shiftsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SHIFTS_KEY] })
      toast.success('Shift updated')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update shift')
    },
  })
}

export function useDeleteShift() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => shiftsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SHIFTS_KEY] })
      toast.success('Shift deleted')
    },
    onError: () => toast.error('Failed to delete shift'),
  })
}

export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: shiftsApi.listTemplates,
  })
}
