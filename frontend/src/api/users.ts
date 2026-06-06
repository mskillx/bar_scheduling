import apiClient from './client'
import type { User, UserCreate, UserUpdate } from '@/types/user'

export const usersApi = {
  list: () => apiClient.get<User[]>('/users/').then((r) => r.data),

  get: (id: number) => apiClient.get<User>(`/users/${id}`).then((r) => r.data),

  create: (data: UserCreate) => apiClient.post<User>('/users/', data).then((r) => r.data),

  update: (id: number, data: UserUpdate) =>
    apiClient.put<User>(`/users/${id}`, data).then((r) => r.data),

  disable: (id: number) => apiClient.delete(`/users/${id}`),
}
