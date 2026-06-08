export type ShiftStatus = "scheduled" | "completed" | "cancelled";

export interface Shift {
  id: number;
  employee_id: number;
  start_datetime: string;
  end_datetime: string;
  notes?: string | null;
  status: ShiftStatus;
  created_by: number;
  created_at: string;
  updated_at: string;
  employee_name?: string | null;
  employee_first_name?: string | null;
  employee_last_name?: string | null;
}

export interface ShiftCreate {
  employee_id: number;
  start_datetime: string;
  end_datetime: string;
  notes?: string;
  status?: ShiftStatus;
}

export interface ShiftCreateMulti extends Omit<ShiftCreate, "employee_id"> {
  employee_ids: number[];
}

export interface ShiftUpdate {
  employee_id?: number;
  start_datetime?: string;
  end_datetime?: string;
  notes?: string;
  status?: ShiftStatus;
}

export interface ShiftTemplate {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  created_at: string;
}
