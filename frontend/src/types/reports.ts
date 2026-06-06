export interface EmployeeHours {
  employee_id: number
  first_name: string
  last_name: string
  total_hours: number
}

export interface HoursReport {
  employees: EmployeeHours[]
  total_hours: number
}

export interface WeeklyReport {
  week_start: string
  total_hours: number
  employees: EmployeeHours[]
}

export interface MonthlyReport {
  month: string
  total_hours: number
  employees: EmployeeHours[]
}
