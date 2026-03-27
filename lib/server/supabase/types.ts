export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AuthType =
  | "GOOGLE"
  | "APPLE"
  | "EMAIL_OTP"
  | "PHONE_OTP"
  | "EMAIL_PW";

export type RoleName = "SUPERADMIN" | "DEPTADMIN" | "EDITOR" | "USER";
export type Status = "ACTIVE" | "INACTIVE";
export type Priority = "LOW" | "MEDIUM" | "HIGH";

export interface RoleRow {
  id: string;
  title: RoleName;
  description: string | null;
  created_at: string;
}

export interface OtpRow {
  id: string;
  credential: string;
  otp: string;
  limit: number;
  is_email: boolean;
  restricted_time: string | null;
  created_at: string;
  expires_at: string;
  updated_at: string;
}

export interface AuthLoginAttemptRow {
  id: string;
  identifier: string;
  ip_address: string;
  attempts: number;
  penalty_level: number;
  blocked_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRow {
  id: string;
  auth_user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  password: string | null;
  role_id: string;
  phone_no: string | null;
  status: Status;
  image: string | null;
  auth_method: AuthType;
  provider_id: string | null;
  refresh_token: string | null;
  reset_token: string | null;
  reset_token_exp: string | null;
  is_temporary: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSessionRow {
  id: string;
  session_id: string;
  user_id: string;
  device_info: Json | null;
  ip_address: string | null;
  refresh_token_hash: string;
  refresh_token_encrypted: string | null;
  created_at: string;
  expires_at: string;
  last_used_at: string | null;
  revoked: boolean;
}

export interface TodoRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  priority: Priority;
  due_date: string | null;
  created_at: string;
  is_completed: boolean;
  updated_at?: string | null;
}

export interface UserWithRole extends UserRow {
  role: RoleRow | null;
}

type TableDefinition<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      tbl_role: TableDefinition<RoleRow>;
      tbl_otp: TableDefinition<OtpRow>;
      tbl_auth_login_attempt: TableDefinition<AuthLoginAttemptRow>;
      tbl_users: TableDefinition<UserRow>;
      tbl_user_session: TableDefinition<UserSessionRow>;
      tbl_todos: TableDefinition<TodoRow>;
    };
    Views: Record<string, never>;
    Functions: {
      handle_auth_login_failure: {
        Args: {
          p_identifier: string;
          p_ip_address: string;
          p_max_attempts?: number;
          p_penalty_steps?: number[];
        };
        Returns: undefined;
      };
    };
    Enums: {
      AuthType: AuthType;
      RoleName: RoleName;
      Status: Status;
      Priority: Priority;
    };
    CompositeTypes: Record<string, never>;
  };
}
