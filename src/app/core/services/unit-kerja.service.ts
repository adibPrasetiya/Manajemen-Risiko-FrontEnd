import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export type UnitKerja = {
  id: string;
  name: string;
  code: string;
  email: string;
};

@Injectable({ providedIn: 'root' })
export class UnitKerjaService {
  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  search(name: string) {
    const q = (name ?? '').trim();
    const url = q
      ? `${this.base}/unit-kerja?name=${encodeURIComponent(q)}&page=1&limit=10`
      : `${this.base}/unit-kerja?page=1&limit=10`;

    return this.http
      .get<any>(url)
      .pipe(map((res) => (res?.data ?? []) as UnitKerja[]));
  }
}
