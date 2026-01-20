import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private base = 'http://api.dev.simulasibimtekd31.com';

  constructor(private http: HttpClient) {}

  createProfile(payload: { jabatan: string; unitKerjaId: string; nomorHp?: string }) {
    return this.http.post(`${this.base}/users/me/profiles`, payload);
  }
}
