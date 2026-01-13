import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, switchMap, catchError } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = localStorage.getItem('accessToken') ?? '';

    const isAuthFreeEndpoint =
      req.url.includes('/users/login') ||
      req.url.endsWith('/users') || // register
      req.url.includes('/users/refresh-token');

    const authReq =
      token && !isAuthFreeEndpoint
        ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
        : req;

    return next.handle(authReq).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status !== 401 || isAuthFreeEndpoint) {
          return throwError(() => err);
        }

        return this.auth.refreshToken().pipe(
          switchMap((res) => {
            const newToken = res?.data?.accessToken;
            if (!newToken) return throwError(() => err);

            localStorage.setItem('accessToken', newToken);

            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${newToken}` },
            });

            return next.handle(retryReq);
          }),
          catchError((e2) => {
            localStorage.removeItem('accessToken');
            return throwError(() => e2);
          })
        );
      })
    );
  }
}
