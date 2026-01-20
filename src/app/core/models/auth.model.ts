import { User } from './user.model';

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
}

export interface RegisterRequest {
  username: string;
  name: string;
  email: string;
  password: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
}
