import { Injectable } from '@angular/core';
import {
  HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { UiService } from '../services/ui.service';
import { extractErrorMessage } from '../utils/error-utils';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private ui: UiService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((err: unknown) => {
        if (err instanceof HttpErrorResponse) {
          // Skip 401 - biarkan AuthInterceptor handle refresh token
          if (err.status === 401) {
            return throwError(() => err);
          }

          const msg = extractErrorMessage(err);
          this.ui.error(String(msg));
        } else {
          this.ui.error('Terjadi kesalahan tidak terduga');
        }
        return throwError(() => err);
      })
    );
  }
}
