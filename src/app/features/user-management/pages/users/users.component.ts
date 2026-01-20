import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import {
  HttpClient,
  HttpHeaders,
  HttpParams,
} from '@angular/common/http';

import {
  EditUserModalComponent,
  EditUserData,
  EditUserResult,
} from '../../components/edit-user-modal/edit-user-modal.component';

type UserItem = {
  id: string;
  username: string;
  name: string;
  email: string;
  isActive: boolean;
  isVerified: boolean;
  roles: string[];
  createdAt: string;
  updatedAt: string;
};

type Pagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

type UsersResponse = {
  message: string;
  data: UserItem[];
  pagination: Pagination;
};

type PatchUserPayload = {
  email: string;
  name: string;
  isActive: boolean;
  isVerified: boolean;
  roles: string[];
};

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, EditUserModalComponent],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class UsersComponent implements OnInit {
  private baseUrl = 'http://api.dev.simulasibimtekd31.com';
  private endpoint = '/users';

  loading = false;
  errorMsg = '';

  users: UserItem[] = [];
  pagination: Pagination | null = null;

  // ===== Summary Counts (User Stats) =====
  totalUsers = 0;
  totalActive = 0;
  totalInactive = 0;

  // ===== Filter Model (UI) =====
  fName = '';
  fUsername = '';
  fRole = 'ALL';
  fActive = 'ALL'; // ALL | ACTIVE | INACTIVE
  fVerified = 'ALL'; // ALL | VERIFIED | UNVERIFIED

  // Advanced filter toggle
  showAdvancedFilters = false;

  // dropdown role (diisi dari response)
  roleOptions: string[] = ['ALL'];

  // pagination
  page = 1;
  limit = 10;

  // Items per page options
  limitOptions = [10, 25, 50, 100];

  // ===== Edit Modal =====
  showEditModal = false;
  editError = '';
  selectedUser: EditUserData | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchUsers(true);
  }

  private buildHeaders(): HttpHeaders | undefined {
    const token =
      localStorage.getItem('accessToken') || localStorage.getItem('access_token');
    if (!token) return undefined;

    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  // Build query params ke backend (sesuai tab Params di Postman)
  private buildParams(resetPage: boolean): HttpParams {
    if (resetPage) this.page = 1;

    let params = new HttpParams()
      .set('page', String(this.page))
      .set('limit', String(this.limit));

    if (this.fName.trim()) params = params.set('name', this.fName.trim());
    if (this.fUsername.trim()) params = params.set('username', this.fUsername.trim());

    if (this.fRole !== 'ALL') params = params.set('role', this.fRole);

    if (this.fActive === 'ACTIVE') params = params.set('isActive', 'true');
    if (this.fActive === 'INACTIVE') params = params.set('isActive', 'false');

    if (this.fVerified === 'VERIFIED') params = params.set('isVerified', 'true');
    if (this.fVerified === 'UNVERIFIED') params = params.set('isVerified', 'false');

    return params;
  }

  // Params khusus untuk Stats: mengikuti filter (name/username/role/verified)
  // tapi active di-override agar bisa hitung total/active/inactive.
  private buildStatsParams(activeOverride: 'true' | 'false' | null): HttpParams {
    let params = new HttpParams().set('page', '1').set('limit', '1');

    if (this.fName.trim()) params = params.set('name', this.fName.trim());
    if (this.fUsername.trim()) params = params.set('username', this.fUsername.trim());
    if (this.fRole !== 'ALL') params = params.set('role', this.fRole);

    if (this.fVerified === 'VERIFIED') params = params.set('isVerified', 'true');
    if (this.fVerified === 'UNVERIFIED') params = params.set('isVerified', 'false');

    if (activeOverride) params = params.set('isActive', activeOverride);

    return params;
  }

  private refreshUserStats(): void {
    const headers = this.buildHeaders();

    const total$ = this.http
      .get<UsersResponse>(`${this.baseUrl}${this.endpoint}`, {
        headers,
        params: this.buildStatsParams(null),
      })
      .pipe(
        map((r) => r?.pagination?.totalItems ?? 0),
        catchError(() => of(0))
      );

    const active$ = this.http
      .get<UsersResponse>(`${this.baseUrl}${this.endpoint}`, {
        headers,
        params: this.buildStatsParams('true'),
      })
      .pipe(
        map((r) => r?.pagination?.totalItems ?? 0),
        catchError(() => of(0))
      );

    const inactive$ = this.http
      .get<UsersResponse>(`${this.baseUrl}${this.endpoint}`, {
        headers,
        params: this.buildStatsParams('false'),
      })
      .pipe(
        map((r) => r?.pagination?.totalItems ?? 0),
        catchError(() => of(0))
      );

    forkJoin({ total: total$, active: active$, inactive: inactive$ }).subscribe((r) => {
      this.totalUsers = r.total;
      this.totalActive = r.active;
      this.totalInactive = r.inactive;
    });
  }

  fetchUsers(resetPage: boolean): void {
    this.loading = true;
    this.errorMsg = '';

    const headers = this.buildHeaders();
    const params = this.buildParams(resetPage);

    this.http
      .get<UsersResponse>(`${this.baseUrl}${this.endpoint}`, { headers, params })
      .subscribe({
        next: (res) => {
          this.users = res.data ?? [];
          this.pagination = res.pagination ?? null;
          this.buildRoleOptions();

          // ✅ update stats berdasarkan filter saat ini (name/username/role/verified)
          this.refreshUserStats();

          this.loading = false;
        },
        error: (err) => {
          console.error('Error fetching users:', err);
          this.loading = false;
          this.users = [];
          this.pagination = null;

          // reset stats biar ga nyangkut angka lama
          this.totalUsers = 0;
          this.totalActive = 0;
          this.totalInactive = 0;

          if (err?.status === 401) {
            this.errorMsg =
              'HTTP 401: Token tidak ada/invalid. Pastikan accessToken tersedia di localStorage.';
            return;
          }

          this.errorMsg = `Gagal fetch users dari API (HTTP ${err?.status || 'unknown'}).`;
        },
      });
  }

  buildRoleOptions(): void {
    const set = new Set<string>();
    for (const u of this.users) {
      for (const r of u.roles || []) set.add(r);
    }
    this.roleOptions = ['ALL', ...Array.from(set).sort()];
  }

  applyFilters(): void {
    this.fetchUsers(true);
  }

  resetFilters(): void {
    this.fName = '';
    this.fUsername = '';
    this.fRole = 'ALL';
    this.fActive = 'ALL';
    this.fVerified = 'ALL';
    this.showAdvancedFilters = false;
    this.fetchUsers(true);
  }

  toggleAdvancedFilters(): void {
    this.showAdvancedFilters = !this.showAdvancedFilters;
  }

  // Check if any advanced filter is active
  hasActiveAdvancedFilters(): boolean {
    return this.fRole !== 'ALL' || this.fActive !== 'ALL' || this.fVerified !== 'ALL';
  }

  // pagination controls
  prevPage(): void {
    if (!this.pagination?.hasPrevPage) return;
    this.page = Math.max(1, this.page - 1);
    this.fetchUsers(false);
  }

  nextPage(): void {
    if (!this.pagination?.hasNextPage) return;
    this.page = this.page + 1;
    this.fetchUsers(false);
  }

  goToPage(pageNum: number): void {
    if (pageNum < 1 || pageNum > (this.pagination?.totalPages ?? 1)) return;
    this.page = pageNum;
    this.fetchUsers(false);
  }

  onLimitChange(): void {
    this.page = 1;
    this.fetchUsers(true);
  }

  // Generate page numbers for pagination
  getPageNumbers(): number[] {
    if (!this.pagination) return [];

    const total = this.pagination.totalPages;
    const current = this.pagination.page;
    const pages: number[] = [];

    // Always show first page
    pages.push(1);

    // Calculate range around current page
    let start = Math.max(2, current - 1);
    let end = Math.min(total - 1, current + 1);

    // Add ellipsis indicator (-1) if there's a gap after first page
    if (start > 2) {
      pages.push(-1);
    }

    // Add pages around current
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    // Add ellipsis indicator (-1) if there's a gap before last page
    if (end < total - 1) {
      pages.push(-1);
    }

    // Always show last page if more than 1 page
    if (total > 1) {
      pages.push(total);
    }

    return pages;
  }

  // Calculate showing range
  getShowingStart(): number {
    if (!this.pagination) return 0;
    return (this.pagination.page - 1) * this.limit + 1;
  }

  getShowingEnd(): number {
    if (!this.pagination) return 0;
    return Math.min(this.pagination.page * this.limit, this.pagination.totalItems);
  }

  // ===================== EDIT USER (MODAL) =====================
  editUser(u: UserItem): void {
    this.editError = '';
    this.selectedUser = {
      id: u.id,
      email: u.email ?? '',
      name: u.name ?? '',
      isActive: !!u.isActive,
      isVerified: !!u.isVerified,
      roles: u.roles ?? [],
    };
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editError = '';
    this.selectedUser = null;
  }

  onSaveUser(result: EditUserResult): void {
    const headers = this.buildHeaders();
    if (!headers) {
      this.editError = 'Token tidak ditemukan. Silakan login ulang.';
      return;
    }

    const payload: PatchUserPayload = {
      email: result.email,
      name: result.name,
      isActive: result.isActive,
      isVerified: result.isVerified,
      roles: result.roles,
    };

    this.loading = true;

    this.http
      .patch<any>(`${this.baseUrl}${this.endpoint}/${result.id}`, payload, { headers })
      .subscribe({
        next: () => {
          // update table lokal biar langsung berubah
          this.users = this.users.map((x) =>
            x.id === result.id ? { ...x, ...payload } : x
          );

          // setelah edit, refresh stats juga
          this.refreshUserStats();

          this.loading = false;
          this.closeEditModal();
        },
        error: (e) => {
          this.loading = false;
          this.editError =
            e?.error?.errors || e?.error?.message || 'Gagal update user. Coba lagi.';
          console.error('[PATCH /users/:id] error:', e);
        },
      });
  }

  trackById(_: number, item: UserItem) {
    return item.id;
  }
}
