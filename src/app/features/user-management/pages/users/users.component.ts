import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

import {
  EditUserModalComponent,
  EditUserData,
  EditUserResult,
} from '../../components/edit-user-modal/edit-user-modal.component';
import { UiService } from '../../../../core/services/ui.service';
import { extractErrorMessage } from '../../../../core/utils/error-utils';
import {
  PatchUserPayload,
  Pagination,
  UserItem,
  UserListParams,
  UserService,
  UserStatsParams,
} from '../../../../core/services/user.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, EditUserModalComponent],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class UsersComponent implements OnInit {
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

  constructor(
    private userService: UserService,
    private ui: UiService,
  ) {}

  ngOnInit(): void {
    this.fetchUsers(true);
  }

  private buildHeaders(): HttpHeaders | undefined {
    const token =
      localStorage.getItem('accessToken') ||
      localStorage.getItem('access_token');
    if (!token) return undefined;

    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  // Build query params ke backend (sesuai tab Params di Postman)
  private buildListParams(resetPage: boolean): UserListParams {
    if (resetPage) this.page = 1;

    const params: UserListParams = {
      page: this.page,
      limit: this.limit,
    };

    if (this.fName.trim()) params.name = this.fName.trim();
    if (this.fUsername.trim()) params.username = this.fUsername.trim();
    if (this.fRole !== 'ALL') params.role = this.fRole;
    if (this.fActive === 'ACTIVE') params.isActive = true;
    if (this.fActive === 'INACTIVE') params.isActive = false;
    if (this.fVerified === 'VERIFIED') params.isVerified = true;
    if (this.fVerified === 'UNVERIFIED') params.isVerified = false;

    return params;
  }

  // Params khusus untuk Stats: mengikuti filter (name/username/role/verified)
  // tapi active di-override agar bisa hitung total/active/inactive.
  private buildStatsParams(
    activeOverride: 'true' | 'false' | null,
  ): HttpParams {
    let params = new HttpParams().set('page', '1').set('limit', '1');

    if (this.fName.trim()) params = params.set('name', this.fName.trim());
    if (this.fUsername.trim())
      params = params.set('username', this.fUsername.trim());
    if (this.fRole !== 'ALL') params = params.set('role', this.fRole);

    if (this.fVerified === 'VERIFIED')
      params = params.set('isVerified', 'true');
    if (this.fVerified === 'UNVERIFIED')
      params = params.set('isVerified', 'false');

    if (activeOverride) params = params.set('isActive', activeOverride);

    return params;
  }

  private refreshUserStats(): void {
    const params: UserStatsParams = {};

    if (this.fName.trim()) params.name = this.fName.trim();
    if (this.fUsername.trim()) params.username = this.fUsername.trim();
    if (this.fRole !== 'ALL') params.role = this.fRole;
    if (this.fVerified === 'VERIFIED') params.isVerified = true;
    if (this.fVerified === 'UNVERIFIED') params.isVerified = false;

    this.userService.getUserStats(params).subscribe({
      next: (stats) => {
        this.totalUsers = stats.total;
        this.totalActive = stats.active;
        this.totalInactive = stats.inactive;
      },
      error: () => {
        // fail silently → stats jangan ganggu tabel utama
        this.totalUsers = 0;
        this.totalActive = 0;
        this.totalInactive = 0;
      },
    });
  }

  fetchUsers(resetPage: boolean): void {
    this.loading = true;
    this.errorMsg = '';

    const params = this.buildListParams(resetPage);

    this.userService.getUsers(params).subscribe({
      next: (res) => {
        this.users = res.data ?? [];
        this.pagination = res.pagination ?? null;
        (this.buildRoleOptions(), this.refreshUserStats());
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.users = [];
        this.pagination = null;
        this.totalUsers = 0;
        this.totalActive = 0;
        this.totalInactive = 0;

        this.errorMsg =
          extractErrorMessage(err) ??
          `Gagal fetch users (HTTP ${err?.status ?? 'unkown'})`;

        this.ui.error(this.errorMsg);
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

  roleLabel(role: string): string {
    if (role === 'PENGELOLA_RISIKO_UKER') return 'PENGELOLA';
    return role;
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
    return (
      this.fRole !== 'ALL' || this.fActive !== 'ALL' || this.fVerified !== 'ALL'
    );
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
    return Math.min(
      this.pagination.page * this.limit,
      this.pagination.totalItems,
    );
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
    if (!this.userService.hasAuthToken()) {
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

    this.userService.updateUser(result.id, payload).subscribe({
      next: () => {
        this.users = this.users.map((u) =>
          u.id === result.id ? { ...u, ...payload } : u,
        );

        this.refreshUserStats();

        this.loading = false;
        this.closeEditModal();
      },
      error: (err) => {
        this.loading = false;
        this.editError =
          extractErrorMessage(err) || 'Gagal update user. Coba lagi';
        this.ui.error(this.editError);
      },
    });
  }

  trackById(_: number, item: UserItem) {
    return item.id;
  }
}
