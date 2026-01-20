import { Injectable } from '@angular/core';
import {HttpInterceptor, HttpRequest, HttpHandler, HttpEvent} from '@angular/common/http';
import { Observable, finalize } from 'rxjs';
import { UiService } from '../services/ui.service';
@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  constructor(private ui: UiService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    this.ui.showLoading();
    return next.handle(req).pipe(finalize(() => this.ui.hideLoading()));
  }
}
