import { Injectable } from '@angular/core';
import {
  HttpEvent, HttpHandler, HttpInterceptor, HttpRequest
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { UiService } from '../services/ui.service';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  constructor(private ui: UiService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    this.ui.showLoading();
    return next.handle(req).pipe(finalize(() => this.ui.hideLoading()));
  }
}
