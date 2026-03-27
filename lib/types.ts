export type Priority = "LOW" | "MEDIUM" | "HIGH";

export interface ApiResponseEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthCheckResult {
  is_exists: boolean;
  is_admin: boolean;
}

export interface Todo {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  due_date: string | null;
  is_completed: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_no: string | null;
  status: string;
  auth_method: string;
  image: string | null;
  image_url: string | null;
  role: {
    id: string;
    title: string;
    description: string | null;
  };
  created_at: string;
  updated_at: string;
}

export interface LoginPayload {
  email: string;
  otp: string;
  first_name?: string;
  last_name?: string;
}

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";
