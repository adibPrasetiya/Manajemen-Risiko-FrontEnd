import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap, catchError, throwError } from 'rxjs';

type LoginRes = {
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
    refreshToken?: string;
  };
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  // ✅ base URL kamu
  private base = 'http://api.dev.simulasibimtekd31.com';

  constructor(private http: HttpClient) {}

  register(payload: { username: string; name: string; email: string; password: string }) {
  return this.http.post(`${this.base}/users`, payload, { withCredentials: true });
}
  login(payload: { identifier: string; password: string }): Observable<LoginRes> {
    return this.http.post<LoginRes>(`${this.base}/users`, payload, { withCredentials: true }).pipe(
      tap((res) => {
        localStorage.setItem('access_token', res.data.accessToken);
        localStorage.setItem('auth_username', res.data.user.username);
      })
    );
  }

  refreshToken() {

    return this.http.post<{ data: { accessToken: string } }>(
      `${this.base}/user/refresh-token`,
      {},
      { withCredentials: true }
    ).pipe(
      tap((r) => localStorage.setItem('access_token', r.data.accessToken))
    );
  }

  logout() {
    // doc kamu ada POST /user/logout
    return this.http.post(`${this.base}/user/logout`, {}, { withCredentials: true }).pipe(
      tap(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('auth_username');
        localStorage.removeItem('user_profile');
      })
    );
  }

  // ✅ fallback: PUT /user/password (doc A) -> kalau 404 coba PATCH /users/me/password (doc B)
  changePassword(currentPassword: string, newPassword: string) {
    return this.http.put(
      `${this.base}/user/password`,
      { currentPassword, newPassword },
      { withCredentials: true }
    ).pipe(
      catchError((err) => {
        if (err?.status === 404) {
          return this.http.patch(
            `${this.base}/users/me/password`,
            { currentPassword, newPassword },
            { withCredentials: true }
          );
        }
        return throwError(() => err);
      })
    );
  }

  getAccessToken() {
    return localStorage.getItem('access_token') ?? '';
  }
}
