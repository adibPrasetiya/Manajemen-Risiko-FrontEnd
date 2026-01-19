import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

type SessionUser = {
  id: string;
  username: string;
  email: string;
  name: string;
  isActive: boolean;
};

type SessionItem = {
  id: string;
  userId: string;
  deviceId: string;
  deviceName: string;
  userAgent: string;
  ipAddress: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  user?: SessionUser;
  isActive: boolean;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

type SessionsResponse = {
  message: string;
  data: SessionItem[];
  pagination: Pagination;
};

@Component({
  selector: 'app-session',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './session.component.html',
  styleUrl: './session.component.scss',
})
export class SessionComponent implements OnInit {
  private baseUrl = 'http://api.dev.simulasibimtekd31.com';
  private endpoint = '/sessions';

  loading = false;
  errorMsg = '';
  successMsg = '';

  actionLoadingId: string | null = null;
  revokeExpiredLoading = false;

  sessions: SessionItem[] = [];
  filtered: SessionItem[] = [];
  pagination: Pagination | null = null;

  // ===== Filter model (UI) =====
  fUsername = '';
  fEmail = '';
  fStatus = 'ALL'; // ALL | ACTIVE | EXPIRED
  fFrom = ''; // yyyy-mm-dd
  fTo = ''; // yyyy-mm-dd

  // pagination (API)
  page = 1;
  limit = 10;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchSessions(true);
  }

  private buildHeaders(): HttpHeaders | undefined {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('access_token');
    if (!token) return undefined;

    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  private buildParams(resetPage: boolean): HttpParams {
    if (resetPage) this.page = 1;

    let params = new HttpParams().set('page', String(this.page)).set('limit', String(this.limit));

    // Kalau backend kamu support filter param, bisa aktifkan ini:
    // if (this.fUsername.trim()) params = params.set('username', this.fUsername.trim());
    // if (this.fEmail.trim()) params = params.set('email', this.fEmail.trim());
    // if (this.fFrom) params = params.set('from', this.fFrom);
    // if (this.fTo) params = params.set('to', this.fTo);
    // if (this.fStatus === 'ACTIVE') params = params.set('isActive', 'true');
    // if (this.fStatus === 'EXPIRED') params = params.set('isActive', 'false');

    return params;
  }

  fetchSessions(resetPage: boolean): void {
    this.loading = true;
    this.errorMsg = '';
    this.successMsg = '';

    const headers = this.buildHeaders();
    const params = this.buildParams(resetPage);

    this.http.get<SessionsResponse>(`${this.baseUrl}${this.endpoint}`, { headers, params }).subscribe({
      next: (res) => {
        this.sessions = res.data ?? [];
        this.pagination = res.pagination ?? null;
        this.loading = false;

        // filter frontend
        this.applyClientFilters();
      },
      error: (err) => {
        console.error('Error fetching sessions:', err);
        this.loading = false;
        this.sessions = [];
        this.filtered = [];
        this.pagination = null;

        if (err?.status === 401) {
          this.errorMsg = 'HTTP 401: Token tidak ada/invalid. Pastikan accessToken tersedia di localStorage.';
          return;
        }
        this.errorMsg = `Gagal fetch sessions dari API (HTTP ${err?.status || 'unknown'}).`;
      },
    });
  }

  // ===== Filters =====
  applyFilters(): void {
    this.fetchSessions(true);
  }

  resetFilters(): void {
    this.fUsername = '';
    this.fEmail = '';
    this.fStatus = 'ALL';
    this.fFrom = '';
    this.fTo = '';
    this.fetchSessions(true);
  }

  private applyClientFilters(): void {
    const qUser = this.fUsername.trim().toLowerCase();
    const qEmail = this.fEmail.trim().toLowerCase();

    const fromDate = this.fFrom ? new Date(this.fFrom + 'T00:00:00') : null;
    const toDate = this.fTo ? new Date(this.fTo + 'T23:59:59') : null;

    this.filtered = (this.sessions ?? []).filter((s) => {
      // username/email
      if (qUser && !(s.user?.username || '').toLowerCase().includes(qUser)) return false;
      if (qEmail && !(s.user?.email || '').toLowerCase().includes(qEmail)) return false;

      // status
      const expired = this.isExpired(s.expiresAt);
      if (this.fStatus === 'ACTIVE' && (expired || !s.isActive)) return false;
      if (this.fStatus === 'EXPIRED' && !expired) return false;

      // created date
      const created = new Date(s.createdAt);
      if (fromDate && created < fromDate) return false;
      if (toDate && created > toDate) return false;

      return true;
    });
  }

  // ===== pagination controls =====
  prevPage(): void {
    if (!this.pagination?.hasPrevPage) return;
    this.page = Math.max(1, this.page - 1);
    this.fetchSessions(false);
  }

  nextPage(): void {
    if (!this.pagination?.hasNextPage) return;
    this.page = this.page + 1;
    this.fetchSessions(false);
  }

  // ===== UI helpers =====
  isExpired(expiresAt: string): boolean {
    return new Date(expiresAt).getTime() <= Date.now();
  }

  getStatusLabel(s: SessionItem): string {
    if (this.isExpired(s.expiresAt)) return 'Expired';
    return s.isActive ? 'Active' : 'Inactive';
  }

  getStatusClass(s: SessionItem): string {
    if (this.isExpired(s.expiresAt)) return 'red';
    return s.isActive ? 'green' : 'gray';
  }

  shortDeviceId(id: string): string {
    if (!id) return '';
    return id.length > 14 ? `${id.slice(0, 14)}...` : id;
  }

  // ===== Actions =====
  revokeSession(s: SessionItem): void {
    if (!s?.id) return;

    const ok = confirm(`Revoke session ini?\n\nDevice: ${s.deviceName}\nUser: ${s.user?.username || '-'}`);
    if (!ok) return;

    this.actionLoadingId = s.id;
    this.successMsg = '';
    this.errorMsg = '';

    const headers = this.buildHeaders();

    this.http.delete<{ message?: string }>(`${this.baseUrl}${this.endpoint}/${s.id}`, { headers }).subscribe({
      next: (res) => {
        this.successMsg = res?.message || 'Session berhasil direvoke.';
        this.actionLoadingId = null;
        this.fetchSessions(false);
      },
      error: (err) => {
        console.error('Error revoke session:', err);
        this.errorMsg = `Gagal revoke session (HTTP ${err?.status || 'unknown'}).`;
        this.actionLoadingId = null;
      },
    });
  }

  revokeAllExpired(): void {
    const ok = confirm('Revoke semua session yang Expired?');
    if (!ok) return;

    this.revokeExpiredLoading = true;
    this.successMsg = '';
    this.errorMsg = '';

    const headers = this.buildHeaders();

    this.http.delete<{ message?: string }>(`${this.baseUrl}${this.endpoint}/expired`, { headers }).subscribe({
      next: (res) => {
        this.successMsg = res?.message || 'Semua session expired berhasil direvoke.';
        this.revokeExpiredLoading = false;
        this.fetchSessions(true);
      },
      error: (err) => {
        console.error('Error revoke expired sessions:', err);
        this.errorMsg = `Gagal revoke expired sessions (HTTP ${err?.status || 'unknown'}).`;
        this.revokeExpiredLoading = false;
      },
    });
  }

  // ✅ ini yang bikin error kamu hilang
  trackById(_: number, item: SessionItem) {
    return item.id;
  }
}
