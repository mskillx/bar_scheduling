export type UserRole = "admin" | "employee";

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  active: boolean;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
  hourly_rate?: number | null;
  hire_date?: string | null;
  employee_id?: number | null;
}

export interface UserCreate {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: UserRole;
  hourly_rate?: number;
}

export interface UserUpdate {
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: UserRole;
  active?: boolean;
  hourly_rate?: number;
}
