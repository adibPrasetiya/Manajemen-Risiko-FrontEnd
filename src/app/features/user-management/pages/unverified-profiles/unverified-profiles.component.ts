import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  ProfileRequestService,
  UnverifiedProfile,
} from '../../../../core/services/profile-request.service';
import {
  UnitKerjaService,
  UnitKerja,
} from '../../../../core/services/unit-kerja.service';

type Pagination = {
  limit: number;
  totalPages: number;
  totalItems: number;
  page: number;
};

@Component({
  selector: 'app-unverified-profiles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './unverified-profiles.component.html',
  styleUrl: './unverified-profiles.component.scss',
})
export class UnverifiedProfilesComponent implements OnInit {
  loading = false;
  errorMsg = '';

  profiles: UnverifiedProfile[] = [];
  pagination: Pagination | null = null;

  // Filters
  fUnitKerjaId = '';

  // Unit Kerja dropdown
  unitKerjaOptions: UnitKerja[] = [];

  // Pagination
  page = 1;
  limit = 10;
  limitOptions = [10, 25, 50, 100];

  constructor(
    private profileRequestService: ProfileRequestService,
    private unitKerjaService: UnitKerjaService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.fetchProfiles(true);
    this.loadUnitKerjaOptions();
  }

  private loadUnitKerjaOptions(): void {
    this.unitKerjaService.search('').subscribe({
      next: (data) => {
        this.unitKerjaOptions = data;
      },
      error: () => {
        this.unitKerjaOptions = [];
      },
    });
  }

  fetchProfiles(resetPage: boolean): void {
    this.loading = true;
    this.errorMsg = '';

    if (resetPage) this.page = 1;

    const params: any = {
      page: this.page,
      limit: this.limit,
    };

    if (this.fUnitKerjaId) {
      params.unitKerjaId = this.fUnitKerjaId;
    }

    this.profileRequestService.getUnverifiedProfiles(params).subscribe({
      next: (res) => {
        console.log(res);
        this.profiles = res.data ?? [];
        this.pagination = res.pagination ?? null;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching unverified profiles:', err);
        this.loading = false;
        this.profiles = [];
        this.pagination = null;

        if (err?.status === 401) {
          this.errorMsg = 'Unauthorized. Please login again.';
          return;
        }
        if (err?.status === 403) {
          this.errorMsg = 'Access denied. Administrator role required.';
          return;
        }

        this.errorMsg =
          err?.error?.message ||
          `Failed to fetch unverified profiles (HTTP ${err?.status || 'unknown'}).`;
      },
    });
  }

  applyFilters(): void {
    this.fetchProfiles(true);
  }

  resetFilters(): void {
    this.fUnitKerjaId = '';
    this.fetchProfiles(true);
  }

  // Pagination controls
  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.fetchProfiles(false);
    }
  }

  nextPage(): void {
    if (this.pagination && this.page < this.pagination.totalPages) {
      this.page++;
      this.fetchProfiles(false);
    }
  }

  goToPage(pageNum: number): void {
    if (pageNum < 1 || pageNum > (this.pagination?.totalPages ?? 1)) return;
    this.page = pageNum;
    this.fetchProfiles(false);
  }

  onLimitChange(): void {
    this.page = 1;
    this.fetchProfiles(true);
  }

  getPageNumbers(): number[] {
    if (!this.pagination) return [];

    const total = this.pagination.totalPages;
    const current = this.pagination.page;
    const pages: number[] = [];

    pages.push(1);

    let start = Math.max(2, current - 1);
    let end = Math.min(total - 1, current + 1);

    if (start > 2) {
      pages.push(-1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < total - 1) {
      pages.push(-1);
    }

    if (total > 1) {
      pages.push(total);
    }

    return pages;
  }

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

  // Navigation to profile requests
  viewRequest(profile: UnverifiedProfile): void {
    if (profile.latestPendingRequest) {
      // Navigate to profile requests page with the request highlighted
      this.router.navigate(['/user-management/profile-requests'], {
        queryParams: { status: 'PENDING' },
      });
    }
  }

  hasPendingRequest(profile: UnverifiedProfile): boolean {
    return !!profile.latestPendingRequest;
  }

  getRequestTypeLabel(type: string): string {
    switch (type) {
      case 'INITIAL_VERIFICATION':
        return 'Initial Verification';
      case 'CHANGE':
        return 'Profile Change';
      default:
        return type;
    }
  }

  trackById(_: number, item: UnverifiedProfile): string {
    return item.id;
  }
}
