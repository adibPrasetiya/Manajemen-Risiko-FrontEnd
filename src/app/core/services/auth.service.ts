import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { RefreshTokenResponse } from '../models/auth.model';

export type LoginRes = {
  message: string;
  data: {
    user: {
      id: string;
      username: string;
      email: string;
      roles: string[];
      hasProfile?: boolean;
      mustChangePassword?: boolean;
    };
    accessToken: string;
    refreshToken?: string; // kadang ada di body, tapi yang dipakai seharusnya cookie
  };
};

export type RegisterPayload = {
  username: string;
  name: string; // backend pakai "name"
  email: string;
  password: string;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  register(payload: RegisterPayload) {
    return this.http.post(`${this.base}/users`, payload, {
      withCredentials: true,
    });
  }

  // ✅ API baru: POST /users/login
  login(payload: {
    identifier: string;
    password: string;
  }): Observable<LoginRes> {
    return this.http
      .post<LoginRes>(`${this.base}/users/login`, payload, {
        withCredentials: true,
      })
      .pipe(
        tap((res) => {
          // ✅ 1 standar key saja
          localStorage.setItem('accessToken', res.data.accessToken);
          localStorage.setItem('email', res.data.user.email);
          localStorage.setItem('auth_username', res.data.user.username);
          localStorage.setItem('user_roles', JSON.stringify(res.data.user.roles));
        }),
      );
  }

  // ✅ API baru: POST /users/refresh-token (pakai cookie refreshToken)
  refreshToken(): Observable<ApiResponse<RefreshTokenResponse>> {
    return this.http
      .post<
        ApiResponse<RefreshTokenResponse>
      >(`${this.base}/users/refresh-token`, null, { withCredentials: true })
      .pipe(
        tap((r) => {
          localStorage.setItem('accessToken', r.data.accessToken);
        }),
        catchError((err) => {
          return throwError(() => err);
        }),
      );
  }

  // ✅ API baru: DELETE /users/me/logout
  logout() {
    return this.http
      .delete(`${this.base}/users/me/logout`, { withCredentials: true })
      .pipe(
        tap(() => {
          this.clearClientState();
        }),
        catchError((err) => {
          this.clearClientState();
          return throwError(() => err);
        }),
      );
  }

  // ✅ API baru: PATCH /users/me/password
  changePassword(currentPassword: string, newPassword: string) {
    return this.http.patch(
      `${this.base}/users/me/password`,
      { currentPassword, newPassword },
      { withCredentials: true },
    );
  }

  getAccessToken() {
    return localStorage.getItem('accessToken') ?? '';
  }

  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    return !!token && token.length > 0;
  }

  clearSession() {
    this.clearClientState();
    // optional: redirect to login
  }

  getUserRoles(): string[] {
    const roles = localStorage.getItem('user_roles');
    return roles ? JSON.parse(roles) : [];
  }

  hasRole(role: string): boolean {
    return this.getUserRoles().includes(role);
  }

  hasAnyRole(roles: string[]): boolean {
    const userRoles = this.getUserRoles();
    return roles.some(role => userRoles.includes(role));
  }

  private clearClientState() {
    localStorage.clear();
    sessionStorage.clear();
    this.clearCookies();
  }

  private clearCookies() {
    if (typeof document === 'undefined') return;
    const cookies = document.cookie.split(';');
    cookies.forEach((cookie) => {
      const name = cookie.split('=')[0]?.trim();
      if (!name) return;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    });
  }
}
