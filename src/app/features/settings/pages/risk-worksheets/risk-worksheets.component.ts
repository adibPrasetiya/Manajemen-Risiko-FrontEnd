import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { KonteksService } from '../../../../core/services/konteks.service';
import { ProfileService } from '../../../../core/services/profile.service';
import { UiService } from '../../../../core/services/ui.service';
import {
  CreateRiskWorksheetPayload,
  Pagination,
  RiskWorksheetItem,
  RiskWorksheetListParams,
  RiskWorksheetStatus,
  UnitKerjaItem,
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
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './risk-worksheets.component.html',
  styleUrl: './risk-worksheets.component.scss',
})
export class RiskWorksheetsComponent implements OnInit {
  loading = false;
  errorMsg = '';

  unitKerjaId = '';
  unitKerjaName = '';
  unitKerjaCode = '';
  roles: string[] = [];
  isKomite = false;
  unitKerjaOptions: UnitKerjaItem[] = [];
  selectedUnitKerjaId = '';

  items: RiskWorksheetItem[] = [];
  allItems: RiskWorksheetItem[] = [];
  pagination: Pagination | null = null;

  konteksOptions: KonteksItem[] = [];

  q = '';
  fStatus: 'ALL' | RiskWorksheetStatus = 'ALL';

  totalWorksheets = 0;
  totalDraft = 0;
  totalSubmitted = 0;
  totalApproved = 0;
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
    status: 'DRAFT',
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
    status: 'DRAFT',
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
        this.roles = res?.data?.roles ?? [];
        this.isKomite = this.roles.includes('KOMITE_PUSAT');
        this.unitKerjaId = unitKerja?.id || '';
        this.unitKerjaName = unitKerja?.name || '';
        this.unitKerjaCode = unitKerja?.code || '';

        if (!this.unitKerjaId && !this.isKomite) {
          this.loading = false;
          this.errorMsg = 'Unit kerja tidak ditemukan pada profil.';
          this.ui.error(this.errorMsg);
          return;
        }

        this.fetchKonteksOptions();
        if (this.isKomite) {
          this.fetchUnitKerjaOptions();
        } else {
          this.fetchWorksheets(true);
        }
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
    this.totalDraft = list.filter((x) => x.status === 'DRAFT').length;
    this.totalSubmitted = list.filter((x) => x.status === 'SUBMITTED').length;
    this.totalApproved = list.filter((x) => x.status === 'APPROVED').length;
    this.totalArchived = list.filter((x) => x.status === 'ARCHIVED').length;
  }

  private fetchKonteksOptions(): void {
    this.konteksService.getKonteksList({ page: 1, limit: 100 }).subscribe({
      next: (res) => {
        this.konteksOptions = res.data ?? [];
      },
      error: () => {
        this.konteksOptions = [];
      },
    });
  }

  private fetchUnitKerjaOptions(): void {
    this.userService.getUnitKerjaList({ page: 1, limit: 100 }).subscribe({
      next: (res) => {
        this.unitKerjaOptions = res.data ?? [];
        if (!this.selectedUnitKerjaId) {
          const preferred = this.unitKerjaId
            ? this.unitKerjaOptions.find((u) => u.id === this.unitKerjaId)?.id
            : undefined;
          this.selectedUnitKerjaId = preferred || this.unitKerjaOptions[0]?.id || '';
        }
        this.setActiveUnitKerja(this.selectedUnitKerjaId);
      },
      error: (err) => {
        this.unitKerjaOptions = [];
        if (err?.status === 401) {
          this.errorMsg =
            'HTTP 401: Token tidak ada/invalid. Pastikan accessToken tersedia di localStorage.';
          this.ui.error(this.errorMsg);
          this.loading = false;
          return;
        }
        this.errorMsg =
          extractErrorMessage(err) ||
          `Gagal fetch unit kerja (HTTP ${err?.status || 'unknown'}).`;
        this.ui.error(this.errorMsg);
        this.loading = false;
      },
    });
  }

  onUnitKerjaChange(): void {
    this.setActiveUnitKerja(this.selectedUnitKerjaId);
  }

  private setActiveUnitKerja(unitKerjaId: string): void {
    if (!unitKerjaId) {
      this.unitKerjaId = '';
      this.unitKerjaName = '';
      this.unitKerjaCode = '';
      this.items = [];
      this.allItems = [];
      this.pagination = null;
      this.loading = false;
      return;
    }

    const picked = this.unitKerjaOptions.find((u) => u.id === unitKerjaId);
    this.unitKerjaId = picked?.id || unitKerjaId;
    this.unitKerjaName = picked?.name || this.unitKerjaName;
    this.unitKerjaCode = picked?.code || '';
    this.fetchWorksheets(true);
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
      status: 'DRAFT',
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
      status: item.status ?? 'DRAFT',
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
    if (status === 'DRAFT') return 'Draft';
    if (status === 'SUBMITTED') return 'Submitted';
    if (status === 'APPROVED') return 'Approved';
    return 'Archived';
  }

  getStatusClass(status: RiskWorksheetStatus): string {
    if (status === 'DRAFT') return 'draft';
    if (status === 'SUBMITTED') return 'submitted';
    if (status === 'APPROVED') return 'approved';
    return 'archived';
  }
}
