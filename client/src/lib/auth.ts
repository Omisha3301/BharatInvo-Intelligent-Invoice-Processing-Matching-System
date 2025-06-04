import { User } from "@/types";

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  role: string;
}

export function setAuthToken(token: string) {
  localStorage.setItem('token', token);
}

export function getAuthToken(): string | null {
  return localStorage.getItem('token');
}

export function removeAuthToken() {
  localStorage.removeItem('token');
}

export function setCurrentUser(user: User) {
  localStorage.setItem('user', JSON.stringify(user));
}

export function getCurrentUser(): User | null {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function removeCurrentUser() {
  localStorage.removeItem('user');
}

export function logout() {
  removeAuthToken();
  removeCurrentUser();
}
