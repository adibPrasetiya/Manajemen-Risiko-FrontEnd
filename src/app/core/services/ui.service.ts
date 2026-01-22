import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type UiToastMode = 'success' | 'error' | 'info';

export type UiToast = {
  mode: UiToastMode;
  message: string;
  title?: string;
  time: number;
  durationMs: number;
  persist?: boolean;
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

  clearToast() {
    this._toast.next(null);
  }

  /**
   * Toast akan tampil:
   * - kalau sedang loading: ditunda sampai loading selesai (halus, no stutter)
   * - auto hide setelah durationMs
   */
  toast(
    mode: UiToastMode,
    message: string,
    title?: string,
    durationMs = 1400,
    persist = false
  ) {
    const payload: UiToast = {
      mode,
      message,
      title,
      time: Date.now(),
      durationMs,
      persist,
    };

    const emit = () => {
      this._toast.next(payload);

      if (!persist) {
        window.setTimeout(() => {
          const current = this._toast.value;
          if (current?.time === payload.time) this._toast.next(null);
        }, durationMs);
      }
    };

    // ✅ kalau masih loading, tunggu selesai dulu biar gak "stutter"
    if (this._loading.value) {
      const check = window.setInterval(() => {
        if (!this._loading.value) {
          window.clearInterval(check);
          // sedikit delay biar overlay benar-benar hilang
          window.setTimeout(emit, 80);
        }
      }, 50);
      return;
    }

    emit();
  }

  success(message: string, title = 'Sukses', durationMs = 1400) {
    this.toast('success', message, title, durationMs);
  }
  error(message: string, title = 'Error', durationMs = 2200, persist = true) {
    this.toast('error', message, title, durationMs, persist);
  }
  info(message: string, title = 'Info', durationMs = 1400, persist = false) {
    this.toast('info', message, title, durationMs, persist);
  }
  infoPersistent(message: string, title = 'Info') {
    this.toast('info', message, title, 0, true);
  }
}
