import apiClient from './client'
import type { HoursReport, WeeklyReport, MonthlyReport } from '@/types/reports'

export const reportsApi = {
  hours: (start: string, end: string) =>
    apiClient.get<HoursReport>('/reports/hours', { params: { start, end } }).then((r) => r.data),

  weekly: (weekStart: string) =>
    apiClient.get<WeeklyReport>('/reports/weekly', { params: { week_start: weekStart } }).then((r) => r.data),

  monthly: (year: number, month: number) =>
    apiClient.get<MonthlyReport>('/reports/monthly', { params: { year, month } }).then((r) => r.data),
}
