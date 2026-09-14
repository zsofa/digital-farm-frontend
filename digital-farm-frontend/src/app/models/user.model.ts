export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}