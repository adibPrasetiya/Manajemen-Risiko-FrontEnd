import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type AppError = {
  message: string;
  status?: number;
  url?: string;
  time: number;
};

@Injectable({ providedIn: 'root' })
export class ErrorService {
  private readonly _errors = new BehaviorSubject<AppError[]>([]);
  readonly errors$ = this._errors.asObservable();

  push(message: string, meta?: Partial<AppError>) {
    const item: AppError = {
      message,
      status: meta?.status,
      url: meta?.url,
      time: Date.now(),
    };

    const current = this._errors.value;
    this._errors.next([item, ...current].slice(0, 3)); // simpan max 3
  }

  remove(time: number) {
    this._errors.next(this._errors.value.filter((e) => e.time !== time));
  }

  clear() {
    this._errors.next([]);
  }
}
