export type UserRole = 'guest' | 'user' | 'admin';

export interface AuthSession {
  role: UserRole;
  username: string;
  name: string;
  loginTime: string;
}
