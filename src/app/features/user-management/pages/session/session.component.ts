import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal.component';

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
  total?: number;
  totalItems?: number;
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
  imports: [CommonModule, FormsModule, ConfirmModalComponent],
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

  confirmOpen = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmDetails: string[] = [];
  confirmConfirmText = 'OK';
  confirmAction: 'revoke-one' | 'revoke-all' | 'info' | null = null;
  pendingSession: SessionItem | null = null;

  sessions: SessionItem[] = [];
  filtered: SessionItem[] = [];
  pagination: Pagination | null = null;

  // ===== Summary Counts (Session Stats) =====
  totalSessions = 0;
  totalActive = 0;
  totalExpired = 0;

  // ===== Filter model (UI) =====
  fUsername = '';
  fEmail = '';
  fStatus = 'ALL'; // ALL | ACTIVE | EXPIRED
  fFrom = ''; // yyyy-mm-dd
  fTo = ''; // yyyy-mm-dd

  // pagination (API)
  page = 1;
  limit = 10;
  limitOptions = [10, 25, 50, 100];

  // advanced filter toggle
  showAdvancedFilters = false;

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

    // Kolom utama (username & status) tetap dikirim jika tersedia
    if (this.fUsername.trim()) params = params.set('username', this.fUsername.trim());
    if (this.fStatus === 'ACTIVE') params = params.set('isActive', 'true');
    if (this.fStatus === 'EXPIRED') params = params.set('isActive', 'false');

    // Sisanya disimpan di advanced filters
    if (this.fEmail.trim()) params = params.set('email', this.fEmail.trim());
    if (this.fFrom) params = params.set('from', this.fFrom);
    if (this.fTo) params = params.set('to', this.fTo);

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
        // normalisasi total / totalItems agar konsisten dengan komponen users
        this.pagination = res.pagination
          ? {
              ...res.pagination,
              totalItems: res.pagination.totalItems ?? (res.pagination as any).total ?? 0,
            }
          : null;
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
        this.totalSessions = 0;
        this.totalActive = 0;
        this.totalExpired = 0;

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

  toggleAdvancedFilters(): void {
    this.showAdvancedFilters = !this.showAdvancedFilters;
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

    this.refreshSessionStats(this.filtered);
  }

  private refreshSessionStats(list: SessionItem[]): void {
    this.totalSessions = list.length;
    this.totalActive = list.filter((s) => !this.isExpired(s.expiresAt) && s.isActive).length;
    this.totalExpired = list.filter((s) => this.isExpired(s.expiresAt)).length;
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

  goToPage(pageNum: number): void {
    if (pageNum < 1 || pageNum > (this.pagination?.totalPages ?? 1)) return;
    this.page = pageNum;
    this.fetchSessions(false);
  }

  onLimitChange(): void {
    this.page = 1;
    this.fetchSessions(true);
  }

  getPageNumbers(): number[] {
    if (!this.pagination) return [];

    const total = this.pagination.totalPages;
    const current = this.pagination.page;
    const pages: number[] = [];

    pages.push(1);

    let start = Math.max(2, current - 1);
    let end = Math.min(total - 1, current + 1);

    if (start > 2) pages.push(-1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < total - 1) pages.push(-1);
    if (total > 1) pages.push(total);

    return pages;
  }

  getShowingStart(): number {
    if (!this.pagination) return 0;
    return (this.pagination.page - 1) * this.limit + 1;
  }

  getShowingEnd(): number {
    if (!this.pagination) return 0;
    const total = this.pagination.totalItems ?? this.pagination.total ?? 0;
    return Math.min(this.pagination.page * this.limit, total);
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

    this.confirmTitle = 'Revoke Session';
    this.confirmMessage = 'Revoke session ini?';
    this.confirmDetails = [
      `Device: ${s.deviceName}`,
      `User: ${s.user?.username || '-'}`,
    ];
    this.confirmConfirmText = 'Revoke';
    this.confirmAction = 'revoke-one';
    this.pendingSession = s;
    this.confirmOpen = true;
  }

  revokeAllExpired(): void {
    this.confirmTitle = 'Revoke Expired Sessions';
    this.confirmMessage = 'Revoke semua session yang expired?';
    this.confirmDetails = [];
    this.confirmConfirmText = 'Revoke All';
    this.confirmAction = 'revoke-all';
    this.pendingSession = null;
    this.confirmOpen = true;
  }

  closeConfirm(): void {
    this.confirmOpen = false;
    this.confirmAction = null;
    this.pendingSession = null;
  }

  confirmActionProceed(): void {
    if (this.confirmAction === 'revoke-one' && this.pendingSession) {
      const target = this.pendingSession;
      this.closeConfirm();
      this.performRevokeSession(target);
      return;
    }

    if (this.confirmAction === 'revoke-all') {
      this.closeConfirm();
      this.performRevokeAllExpired();
      return;
    }

    this.closeConfirm();
  }

  private performRevokeSession(s: SessionItem): void {
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

  private performRevokeAllExpired(): void {
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
