export interface AttendanceStatus {
  shift_id: number;
  employee_id: number;
  shift_start: string;
  shift_end: string;
  check_in_at: string | null;
  check_out_at: string | null;
  attendance_id: number | null;
}

export interface AttendanceStats {
  period_label: "week" | "month";
  expected_hours: number;
  effective_hours: number;
}
