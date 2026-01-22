import { Injectable } from '@angular/core';
import {
  HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { UiService } from '../services/ui.service';
import { extractErrorMessage } from '../utils/error-utils';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  // Endpoints that should NOT trigger redirect on 403 profile errors
  private readonly profileExemptEndpoints = [
    '/users/me/profiles',
    '/users/me/profile-requests',
    '/unit-kerja',
    '/users/me/logout',
  ];

  constructor(
    private ui: UiService,
    private router: Router
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((err: unknown) => {
        if (err instanceof HttpErrorResponse) {
          // Skip 401 - biarkan AuthInterceptor handle refresh token
          if (err.status === 401) {
            return throwError(() => err);
          }

          // Handle 403 with special profile-related flags
          if (err.status === 403) {
            const errorBody = err.error;

            // Check if this endpoint is exempt from redirect handling
            const isExemptEndpoint = this.profileExemptEndpoints.some(
              (endpoint) => req.url.includes(endpoint)
            );

            if (!isExemptEndpoint) {
              // Handle mustCreateProfile flag - redirect to create profile page
              if (errorBody?.mustCreateProfile === true) {
                this.ui.info(
                  'Silakan lengkapi profile Anda terlebih dahulu.',
                  'Profile Diperlukan'
                );
                this.router.navigate(['/auth/create-profile']);
                return throwError(() => err);
              }

              // Handle mustVerifyProfile flag - redirect to waiting verification page
              if (errorBody?.mustVerifyProfile === true) {
                this.ui.infoPersistent(
                  'Profile Anda sedang dalam proses verifikasi. Kami akan memberitahu Anda setelah proses selesai.',
                  'Menunggu Verifikasi'
                );
                this.router.navigate(['/auth/waiting-verification']);
                return throwError(() => err);
              }
            }

            if (Array.isArray(errorBody?.details) && errorBody.details.length > 0) {
              return throwError(() => err);
            }

            const profileNotFound = String(errorBody?.message || '').toLowerCase();
            const isProfileRequestMissing =
              req.url.includes('/users/me/profile-requests') &&
              (profileNotFound.includes('profile tidak ditemukan') ||
                profileNotFound.includes('profil tidak ditemukan'));

          if (isProfileRequestMissing) {
            return throwError(() => err);
          }

          // For other 403 errors, show the error message
          let msg = extractErrorMessage(err);
          const msgLower = String(msg).toLowerCase();
          if (
            msgLower.includes('profile tidak ditemukan') ||
            msgLower.includes('profil tidak ditemukan')
          ) {
            msg = 'Profil anda ditolak silahkan buat ulang profill';
          }
          this.ui.error(String(msg));
          return throwError(() => err);
        }

          if (Array.isArray(err.error?.details) && err.error.details.length > 0) {
            return throwError(() => err);
          }

          const profileNotFound = String(err.error?.message || '').toLowerCase();
          const isProfileRequestMissing =
            req.url.includes('/users/me/profile-requests') &&
            (profileNotFound.includes('profile tidak ditemukan') ||
              profileNotFound.includes('profil tidak ditemukan'));

          if (isProfileRequestMissing) {
            return throwError(() => err);
          }

          let msg = extractErrorMessage(err);
          const msgLower = String(msg).toLowerCase();
          if (
            msgLower.includes('profile tidak ditemukan') ||
            msgLower.includes('profil tidak ditemukan')
          ) {
            msg = 'Profil anda ditolak silahkan buat ulang profill';
          }
          this.ui.error(String(msg));
        } else {
          this.ui.error('Terjadi kesalahan tidak terduga');
        }
        return throwError(() => err);
      })
    );
  }
}
