import { api } from '../lib/api'
import type { LoginResponse, RegisterPayload, UserResponse } from '../lib/types'

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { email, password }),
  register: (data: RegisterPayload) =>
    api.post<LoginResponse>('/auth/register', data),
  me: () => api.get<UserResponse>('/auth/me'),
}
