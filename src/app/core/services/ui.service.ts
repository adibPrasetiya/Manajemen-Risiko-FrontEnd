import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type UiToastMode = 'success' | 'error' | 'info';

export type UiToast = {
  mode: UiToastMode;
  message: string;
  time: number;
};

@Injectable({ providedIn: 'root' })
export class UiService {
  private loadingCount = 0;

  private readonly _loading = new BehaviorSubject<boolean>(false);
  readonly loading$ = this._loading.asObservable();

  private readonly _toast = new BehaviorSubject<UiToast | null>(null);
  readonly toast$ = this._toast.asObservable();

  showLoading() {
    this.loadingCount++;
    if (this.loadingCount === 1) this._loading.next(true);
  }

  hideLoading() {
    this.loadingCount = Math.max(0, this.loadingCount - 1);
    if (this.loadingCount === 0) this._loading.next(false);
  }

  // toast otomatis hilang
  toast(mode: UiToastMode, message: string, durationMs = 1400) {
    const payload: UiToast = { mode, message, time: Date.now() };
    this._toast.next(payload);

    window.setTimeout(() => {
      // hanya clear kalau toast masih yang sama
      const current = this._toast.value;
      if (current?.time === payload.time) this._toast.next(null);
    }, durationMs);
  }

  success(message: string) { this.toast('success', message); }
  error(message: string) { this.toast('error', message, 2200); }
  info(message: string) { this.toast('info', message); }
}
