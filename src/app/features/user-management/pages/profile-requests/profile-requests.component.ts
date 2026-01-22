import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import {
  ProfileRequestService,
  ProfileRequest,
  RequestStatus,
  RequestType,
} from '../../../../core/services/profile-request.service';
import {
  UnitKerjaService,
  UnitKerja,
} from '../../../../core/services/unit-kerja.service';
import { RequestDetailModalComponent } from '../../components/request-detail-modal/request-detail-modal.component';
import { UiService } from '../../../../core/services/ui.service';
import { extractErrorMessage } from '../../../../core/utils/error-utils';

type Pagination = {
  limit: number;
  page: number;
  totalItems: number;
  totalPages: number;
};

@Component({
  selector: 'app-profile-requests',
  standalone: true,
  imports: [CommonModule, FormsModule, RequestDetailModalComponent],
  templateUrl: './profile-requests.component.html',
  styleUrl: './profile-requests.component.scss',
})
export class ProfileRequestsComponent implements OnInit {
  loading = false;
  errorMsg = '';

  requests: ProfileRequest[] = [];
  pagination: Pagination | null = null;

  // Stats
  totalPending = 0;
  totalApproved = 0;
  totalRejected = 0;

  // Filters
  fStatus: RequestStatus | 'ALL' = 'ALL';
  fRequestType: RequestType | 'ALL' = 'ALL';
  fUnitKerjaId = '';
  showAdvancedFilters = false;

  // Unit Kerja dropdown
  unitKerjaOptions: UnitKerja[] = [];
  unitKerjaSearch = '';

  // Pagination
  page = 1;
  limit = 10;
  limitOptions = [10, 25, 50, 100];

  // Detail Modal
  showDetailModal = false;
  selectedRequest: ProfileRequest | null = null;
  modalLoading = false;
  modalError = '';

  constructor(
    private profileRequestService: ProfileRequestService,
    private unitKerjaService: UnitKerjaService,
    private ui: UiService,
  ) {}

  ngOnInit(): void {
    this.fetchRequests(true);
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

  private refreshStats(): void {
    const pending$ = this.profileRequestService
      .getProfileRequests({ status: 'PENDING', page: 1, limit: 1 })
      .pipe(
        map((r) => r?.pagination?.totalItems ?? 0),
        catchError(() => of(0)),
      );

    const approved$ = this.profileRequestService
      .getProfileRequests({ status: 'APPROVED', page: 1, limit: 1 })
      .pipe(
        map((r) => r?.pagination?.totalItems ?? 0),
        catchError(() => of(0)),
      );

    const rejected$ = this.profileRequestService
      .getProfileRequests({ status: 'REJECTED', page: 1, limit: 1 })
      .pipe(
        map((r) => r?.pagination?.totalItems ?? 0),
        catchError(() => of(0)),
      );

    forkJoin({
      pending: pending$,
      approved: approved$,
      rejected: rejected$,
    }).subscribe((r) => {
      this.totalPending = r.pending;
      this.totalApproved = r.approved;
      this.totalRejected = r.rejected;
    });
  }

  fetchRequests(resetPage: boolean): void {
    this.loading = true;
    this.errorMsg = '';

    if (resetPage) this.page = 1;

    const params: any = {
      page: this.page,
      limit: this.limit,
    };

    if (this.fStatus !== 'ALL') {
      params.status = this.fStatus;
    }
    if (this.fRequestType !== 'ALL') {
      params.requestType = this.fRequestType;
    }
    if (this.fUnitKerjaId) {
      params.unitKerjaId = this.fUnitKerjaId;
    }

    this.profileRequestService.getProfileRequests(params).subscribe({
      next: (res) => {
        this.requests = res.data ?? [];
        this.pagination = res.pagination ?? null;
        this.refreshStats();
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.requests = [];
        this.pagination = null;
        this.totalPending = 0;
        this.totalApproved = 0;
        this.totalRejected = 0;

        if (err?.status === 401) {
          this.errorMsg = 'Unauthorized. Please login again.';
          return;
        }
        if (err?.status === 403) {
          this.errorMsg = 'Access denied. Administrator role required.';
          return;
        }

        this.errorMsg =
          extractErrorMessage(err) ||
          `Failed to fetch profile requests (HTTP ${err?.status || 'unknown'}).`;
        this.ui.error(this.errorMsg);
      },
    });
  }

  applyFilters(): void {
    this.fetchRequests(true);
  }

  resetFilters(): void {
    this.fStatus = 'ALL';
    this.fRequestType = 'ALL';
    this.fUnitKerjaId = '';
    this.showAdvancedFilters = false;
    this.fetchRequests(true);
  }

  toggleAdvancedFilters(): void {
    this.showAdvancedFilters = !this.showAdvancedFilters;
  }

  hasActiveAdvancedFilters(): boolean {
    return this.fRequestType !== 'ALL' || !!this.fUnitKerjaId;
  }

  // Pagination controls
  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.fetchRequests(false);
    }
  }

  nextPage(): void {
    if (this.pagination && this.page < this.pagination.totalPages) {
      this.page++;
      this.fetchRequests(false);
    }
  }

  goToPage(pageNum: number): void {
    if (pageNum < 1 || pageNum > (this.pagination?.totalPages ?? 1)) return;
    this.page = pageNum;
    this.fetchRequests(false);
  }

  onLimitChange(): void {
    this.page = 1;
    this.fetchRequests(true);
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

  // Detail Modal
  viewDetail(request: ProfileRequest): void {
    this.selectedRequest = request;
    this.modalError = '';
    this.showDetailModal = true;
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedRequest = null;
    this.modalError = '';
  }

  onApprove(requestId: string): void {
    this.modalLoading = true;
    this.modalError = '';

    this.profileRequestService.approveRequest(requestId).subscribe({
      next: () => {
        this.modalLoading = false;
        this.closeDetailModal();
        this.fetchRequests(false);
      },
      error: (err) => {
        this.modalLoading = false;
        this.modalError = err?.error?.message || 'Failed to approve request.';
      },
    });
  }

  onReject(data: { requestId: string; reason: string }): void {
    this.modalLoading = true;
    this.modalError = '';

    this.profileRequestService
      .rejectRequest(data.requestId, data.reason)
      .subscribe({
        next: () => {
          this.modalLoading = false;
          this.closeDetailModal();
          this.fetchRequests(false);
        },
        error: (err) => {
          this.modalLoading = false;
          this.modalError = err?.error?.message || 'Failed to reject request.';
        },
      });
  }

  // Quick actions from table
  quickApprove(request: ProfileRequest, event: Event): void {
    event.stopPropagation();
    if (request.status !== 'PENDING') return;

    this.loading = true;
    this.profileRequestService.approveRequest(request.id).subscribe({
      next: () => {
        this.loading = false;
        this.fetchRequests(false);
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err?.error?.message || 'Failed to approve request.';
      },
    });
  }

  quickReject(request: ProfileRequest, event: Event): void {
    event.stopPropagation();
    if (request.status !== 'PENDING') return;
    // Open modal for rejection reason
    this.viewDetail(request);
  }

  getStatusClass(status: RequestStatus): string {
    switch (status) {
      case 'PENDING':
        return 'yellow';
      case 'APPROVED':
        return 'green';
      case 'REJECTED':
        return 'red';
      default:
        return 'gray';
    }
  }

  getStatusLabel(status: RequestStatus): string {
    switch (status) {
      case 'PENDING':
        return 'Pending';
      case 'APPROVED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
      default:
        return status;
    }
  }

  getRequestTypeLabel(type: RequestType): string {
    switch (type) {
      case 'INITIAL_VERIFICATION':
        return 'Initial Verification';
      case 'CHANGE':
        return 'Profile Change';
      default:
        return type;
    }
  }

  trackById(_: number, item: ProfileRequest): string {
    return item.id;
  }
}
