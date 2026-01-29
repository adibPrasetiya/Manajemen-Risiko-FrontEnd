import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KonteksService } from '../../../../core/services/konteks.service';
import { ProfileService } from '../../../../core/services/profile.service';
import { UiService } from '../../../../core/services/ui.service';
import {
  CreateRiskWorksheetPayload,
  Pagination,
  RiskWorksheetItem,
  RiskWorksheetListParams,
  RiskWorksheetStatus,
  UpdateRiskWorksheetPayload,
  UserService,
} from '../../../../core/services/user.service';
import { KonteksItem } from '../../../../core/models/konteks.model';
import { extractErrorMessage, extractFieldErrors } from '../../../../core/utils/error-utils';

type WorksheetFormErrors = {
  unitKerjaId?: string;
  konteksId?: string;
  name?: string;
  description?: string;
};

@Component({
  selector: 'app-risk-worksheets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './risk-worksheets.component.html',
  styleUrl: './risk-worksheets.component.scss',
})
export class RiskWorksheetsComponent implements OnInit {
  loading = false;
  errorMsg = '';

  unitKerjaId = '';
  unitKerjaName = '';
  unitKerjaCode = '';

  items: RiskWorksheetItem[] = [];
  allItems: RiskWorksheetItem[] = [];
  pagination: Pagination | null = null;

  konteksOptions: KonteksItem[] = [];

  q = '';
  fStatus: 'ALL' | RiskWorksheetStatus = 'ALL';

  totalWorksheets = 0;
  totalActive = 0;
  totalInactive = 0;
  totalArchived = 0;

  page = 1;
  limit = 10;
  limitOptions = [10, 25, 50, 100];

  showCreateModal = false;
  createErrors: WorksheetFormErrors = {};
  createModel: {
    konteksId: string;
    name: string;
    description: string;
    status: RiskWorksheetStatus;
  } = {
    konteksId: '',
    name: '',
    description: '',
    status: 'ACTIVE',
  };

  showEditModal = false;
  editErrors: WorksheetFormErrors = {};
  editModel: {
    id: string;
    konteksId: string;
    konteksLabel: string;
    name: string;
    description: string;
    status: RiskWorksheetStatus;
  } = {
    id: '',
    konteksId: '',
    konteksLabel: '',
    name: '',
    description: '',
    status: 'INACTIVE',
  };

  showDeleteModal = false;
  deleteError = '';
  deleteTarget: RiskWorksheetItem | null = null;

  constructor(
    private userService: UserService,
    private profileService: ProfileService,
    private konteksService: KonteksService,
    private ui: UiService
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  private loadProfile(): void {
    this.loading = true;
    this.errorMsg = '';

    this.profileService.getMyProfile().subscribe({
      next: (res) => {
        const unitKerja = res?.data?.unitKerja;
        this.unitKerjaId = unitKerja?.id || '';
        this.unitKerjaName = unitKerja?.name || '';
        this.unitKerjaCode = unitKerja?.code || '';

        if (!this.unitKerjaId) {
          this.loading = false;
          this.errorMsg = 'Unit kerja tidak ditemukan pada profil.';
          this.ui.error(this.errorMsg);
          return;
        }

        this.fetchKonteksOptions();
        this.fetchWorksheets(true);
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg =
          extractErrorMessage(err) || 'Gagal memuat profil pengguna.';
        this.ui.error(this.errorMsg);
      },
    });
  }

  private buildListParams(resetPage: boolean): RiskWorksheetListParams {
    if (resetPage) this.page = 1;
    const params: RiskWorksheetListParams = {
      page: this.page,
      limit: this.limit,
    };
    if (this.fStatus !== 'ALL') {
      params.status = this.fStatus;
    }
    return params;
  }

  private buildStatsParams(status: RiskWorksheetStatus | null): RiskWorksheetListParams {
    const params: RiskWorksheetListParams = { page: 1, limit: 1 };
    if (status) params.status = status;
    return params;
  }

  private applyLocalFilter(list: RiskWorksheetItem[], keyword: string): RiskWorksheetItem[] {
    const k = (keyword ?? '').trim().toLowerCase();
    const filteredByStatus =
      this.fStatus === 'ALL'
        ? list
        : list.filter((x) => x.status === this.fStatus);

    if (!k) return filteredByStatus;

    return filteredByStatus.filter((x) => {
      const name = (x.name ?? '').toLowerCase();
      const desc = (x.description ?? '').toLowerCase();
      const konteks = (x.konteks?.name ?? '').toLowerCase();
      const kode = (x.konteks?.code ?? '').toLowerCase();
      return name.includes(k) || desc.includes(k) || konteks.includes(k) || kode.includes(k);
    });
  }

  private renderList(): void {
    this.items = this.applyLocalFilter(this.allItems, this.q);
    this.refreshStatsClient(this.allItems);
  }

  private refreshStatsClient(list: RiskWorksheetItem[]): void {
    const total = this.pagination?.totalItems ?? list.length;
    this.totalWorksheets = total;
    this.totalActive = list.filter((x) => x.status === 'ACTIVE').length;
    this.totalInactive = list.filter((x) => x.status === 'INACTIVE').length;
    this.totalArchived = list.filter((x) => x.status === 'ARCHIVED').length;
  }

  private fetchKonteksOptions(): void {
    this.konteksService.getKonteksList({ page: 1, limit: 200 }).subscribe({
      next: (res) => {
        this.konteksOptions = res.data ?? [];
      },
      error: () => {
        this.konteksOptions = [];
      },
    });
  }

  fetchWorksheets(resetPage: boolean): void {
    if (!this.unitKerjaId) return;

    this.loading = true;
    this.errorMsg = '';

    this.userService
      .getRiskWorksheets(this.unitKerjaId, this.buildListParams(resetPage))
      .subscribe({
        next: (res) => {
          this.allItems = res.data ?? [];
          this.pagination = res.pagination ?? null;
          this.renderList();
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.allItems = [];
          this.items = [];
          this.pagination = null;

          if (err?.status === 401) {
            this.errorMsg =
              'HTTP 401: Token tidak ada/invalid. Pastikan accessToken tersedia di localStorage.';
            this.ui.error(this.errorMsg);
            return;
          }

          this.errorMsg =
            extractErrorMessage(err) ||
            `Gagal fetch risk worksheet (HTTP ${err?.status || 'unknown'}).`;
          this.ui.error(this.errorMsg);
        },
      });
  }

  applySearch(): void {
    this.fetchWorksheets(true);
  }

  resetSearch(): void {
    this.q = '';
    this.fStatus = 'ALL';
    this.fetchWorksheets(true);
  }

  prevPage(): void {
    if (!this.pagination?.hasPrevPage) return;
    this.page = Math.max(1, this.page - 1);
    this.fetchWorksheets(false);
  }

  nextPage(): void {
    if (!this.pagination?.hasNextPage) return;
    this.page = this.page + 1;
    this.fetchWorksheets(false);
  }

  goToPage(pageNum: number): void {
    if (pageNum < 1 || pageNum > (this.pagination?.totalPages ?? 1)) return;
    this.page = pageNum;
    this.fetchWorksheets(false);
  }

  onLimitChange(): void {
    this.page = 1;
    this.fetchWorksheets(true);
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
    return Math.min(this.pagination.page * this.limit, this.pagination.totalItems);
  }

  // ===================== CREATE =====================
  openCreate(): void {
    this.createErrors = {};
    this.createModel = {
      konteksId: '',
      name: '',
      description: '',
      status: 'ACTIVE',
    };
    this.showCreateModal = true;
  }

  closeCreate(): void {
    this.showCreateModal = false;
    this.createErrors = {};
  }

  createWorksheet(): void {
    this.createErrors = {};

    if (!this.unitKerjaId) {
      this.createErrors.unitKerjaId = 'Unit kerja tidak ditemukan.';
      return;
    }
    if (!this.createModel.konteksId) {
      this.createErrors.konteksId = 'Konteks wajib dipilih.';
      return;
    }
    if (!this.createModel.name.trim()) {
      this.createErrors.name = 'Nama wajib diisi.';
      return;
    }

    const payload: CreateRiskWorksheetPayload = {
      konteksId: this.createModel.konteksId,
      name: this.createModel.name.trim(),
      description: this.createModel.description.trim(),
      status: this.createModel.status,
    };

    this.loading = true;

    this.userService.createRiskWorksheet(this.unitKerjaId, payload).subscribe({
      next: () => {
        this.loading = false;
        this.closeCreate();
        this.ui.success('Kertas kerja risiko berhasil ditambahkan.');
        this.fetchWorksheets(true);
      },
      error: (e) => {
        this.loading = false;
        this.createErrors = extractFieldErrors(e);
        this.ui.error(extractErrorMessage(e) || 'Gagal menambah kertas kerja risiko.');
      },
    });
  }

  // ===================== EDIT =====================
  openEdit(item: RiskWorksheetItem): void {
    this.editErrors = {};
    const konteksLabel = item.konteks
      ? `${item.konteks.name} (${item.konteks.code})`
      : '-';
    this.editModel = {
      id: item.id,
      konteksId: item.konteks?.id || '',
      konteksLabel,
      name: item.name ?? '',
      description: item.description ?? '',
      status: item.status ?? 'INACTIVE',
    };
    this.showEditModal = true;
  }

  closeEdit(): void {
    this.showEditModal = false;
    this.editErrors = {};
  }

  saveEdit(): void {
    this.editErrors = {};

    if (!this.editModel.name.trim()) {
      this.editErrors.name = 'Nama wajib diisi.';
      return;
    }

    const payload: UpdateRiskWorksheetPayload = {
      name: this.editModel.name.trim(),
      description: this.editModel.description.trim(),
    };

    this.loading = true;

    this.userService
      .updateRiskWorksheet(this.unitKerjaId, this.editModel.id, payload)
      .subscribe({
        next: () => {
          this.loading = false;
          this.closeEdit();
          this.ui.success('Kertas kerja risiko berhasil diperbarui.');
          this.fetchWorksheets(false);
        },
        error: (e) => {
          this.loading = false;
          this.editErrors = extractFieldErrors(e);
          this.ui.error(extractErrorMessage(e) || 'Gagal mengubah kertas kerja risiko.');
        },
      });
  }

  // ===================== ACTIONS =====================
  setActive(item: RiskWorksheetItem): void {
    if (item.status !== 'INACTIVE') return;
    this.loading = true;

    this.userService.activateRiskWorksheet(this.unitKerjaId, item.id).subscribe({
      next: () => {
        this.loading = false;
        this.allItems = this.allItems.map((x) =>
          x.id === item.id ? { ...x, status: 'ACTIVE' } : x
        );
        this.renderList();
        this.ui.success('Kertas kerja risiko berhasil diaktifkan.');
      },
      error: (e) => {
        this.loading = false;
        this.ui.error(extractErrorMessage(e) || 'Gagal mengaktifkan kertas kerja risiko.');
      },
    });
  }

  setInactive(item: RiskWorksheetItem): void {
    if (item.status !== 'ACTIVE') return;
    this.loading = true;

    this.userService.deactivateRiskWorksheet(this.unitKerjaId, item.id).subscribe({
      next: () => {
        this.loading = false;
        this.allItems = this.allItems.map((x) =>
          x.id === item.id ? { ...x, status: 'INACTIVE' } : x
        );
        this.renderList();
        this.ui.success('Kertas kerja risiko berhasil dinonaktifkan.');
      },
      error: (e) => {
        this.loading = false;
        this.ui.error(extractErrorMessage(e) || 'Gagal menonaktifkan kertas kerja risiko.');
      },
    });
  }

  openDelete(item: RiskWorksheetItem): void {
    this.deleteError = '';
    this.deleteTarget = item;
    this.showDeleteModal = true;
  }

  closeDelete(): void {
    this.showDeleteModal = false;
    this.deleteError = '';
    this.deleteTarget = null;
  }

  confirmDelete(): void {
    if (!this.deleteTarget) return;

    this.loading = true;
    this.userService
      .deleteRiskWorksheet(this.unitKerjaId, this.deleteTarget.id, {
        suppressToast: true,
      })
      .subscribe({
        next: () => {
          this.loading = false;
          this.allItems = this.allItems.map((x) =>
            x.id === this.deleteTarget!.id ? { ...x, status: 'ARCHIVED' } : x
          );
          this.renderList();
          this.closeDelete();
          this.ui.success('Kertas kerja risiko berhasil diarsipkan.');
        },
        error: (e) => {
          this.loading = false;
          this.deleteError = extractErrorMessage(e) || 'Gagal mengarsipkan kertas kerja risiko.';
        },
      });
  }

  getStatusLabel(status: RiskWorksheetStatus): string {
    if (status === 'ACTIVE') return 'Active';
    if (status === 'INACTIVE') return 'Inactive';
    return 'Archived';
  }

  getStatusClass(status: RiskWorksheetStatus): string {
    if (status === 'ACTIVE') return 'green';
    if (status === 'INACTIVE') return 'gray';
    return 'archived';
  }
}
