import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

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
  login(payload: { identifier: string; password: string }): Observable<LoginRes> {
    return this.http
      .post<LoginRes>(`${this.base}/users/login`, payload, { withCredentials: true })
      .pipe(
        tap((res) => {
          // ✅ 1 standar key saja
          localStorage.setItem('accessToken', res.data.accessToken);
          localStorage.setItem('auth_username', res.data.user.username);
        })
      );
  }

  // ✅ API baru: POST /users/refresh-token (pakai cookie refreshToken)
  refreshToken(): Observable<{ message: string; data: { accessToken: string } }> {
    return this.http
      .post<{ message: string; data: { accessToken: string } }>(
        `${this.base}/users/refresh-token`,
        null,
        { withCredentials: true }
      )
      .pipe(
        tap((r) => {
          localStorage.setItem('accessToken', r.data.accessToken);
        })
      );
  }

  // ✅ API baru: DELETE /users/me/logout
  logout() {
    return this.http
      .delete(`${this.base}/users/me/logout`, { withCredentials: true })
      .pipe(
        tap(() => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('auth_username');
          localStorage.removeItem('user_profile');
        })
      );
  }

  // ✅ API baru: PATCH /users/me/password
  changePassword(currentPassword: string, newPassword: string) {
    return this.http.patch(
      `${this.base}/users/me/password`,
      { currentPassword, newPassword },
      { withCredentials: true }
    );
  }

  getAccessToken() {
    return localStorage.getItem('accessToken') ?? '';
  }
}
