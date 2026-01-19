import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import {
  Observable,
  throwError,
  BehaviorSubject,
  catchError,
  switchMap,
  filter,
  take,
} from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  constructor(private auth: AuthService) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    const token = localStorage.getItem('accessToken');

    const isAuthFreeEndpoint =
      req.url.includes('/users/login') ||
      req.url.endsWith('/users') ||
      req.url.includes('/users/refresh-token');

    let authReq = req;

    if (token && !isAuthFreeEndpoint) {
      authReq = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      });
    }

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status !== 401 || isAuthFreeEndpoint) {
          return throwError(() => error);
        }

        console.log('Token expired, attempting refresh...');

        // === HANDLE 401 WITH REFRESH QUEUE ===
        if (!this.isRefreshing) {
          this.isRefreshing = true;
          this.refreshTokenSubject.next(null);

          return this.auth.refreshToken().pipe(
            switchMap((res) => {
              const newToken = res?.data?.accessToken;
              this.isRefreshing = false;

              if (!newToken) {
                this.auth.clearSession();
                return throwError(() => error);
              }

              localStorage.setItem('accessToken', newToken);
              this.refreshTokenSubject.next(newToken);

              const retryReq = req.clone({
                setHeaders: { Authorization: `Bearer ${newToken}` },
              });

              return next.handle(retryReq);
            }),
            catchError((refreshError) => {
              this.isRefreshing = false;
              this.auth.clearSession();
              return throwError(() => refreshError);
            }),
          );
        }

        // === WAIT FOR REFRESH TO COMPLETE ===
        return this.refreshTokenSubject.pipe(
          filter((token) => token !== null),
          take(1),
          switchMap((token) => {
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${token}` },
            });
            return next.handle(retryReq);
          }),
        );
      }),
    );
  }
}
