import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { UiService } from '../../../../core/services/ui.service';
import { ProfileService } from '../../../../core/services/profile.service';
import { extractErrorMessage, extractFieldErrors } from '../../../../core/utils/error-utils';
import {
  AssetCategoryItem,
  AssetItem,
  AssetListParams,
  AssetStatus,
  CreateAssetPayload,
  Pagination,
  UpdateAssetPayload,
  UserService,
} from '../../../../core/services/user.service';

type AssetFormErrors = {
  unitKerjaId?: string;
  name?: string;
  code?: string;
  description?: string;
  categoryId?: string;
};

@Component({
  selector: 'app-assets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './assets.component.html',
  styleUrl: './assets.component.scss',
})
export class AssetsComponent implements OnInit {
  loading = false;
  errorMsg = '';

  unitKerjaId = '';
  unitKerjaName = '';
  unitKerjaCode = '';

  items: AssetItem[] = [];
  allItems: AssetItem[] = [];
  categories: AssetCategoryItem[] = [];

  pagination: Pagination | null = null;

  q = '';
  fStatus: 'ALL' | AssetStatus = 'ALL';

  totalAssets = 0;
  totalActive = 0;
  totalInactive = 0;
  totalArchived = 0;

  page = 1;
  limit = 10;
  limitOptions = [10, 25, 50, 100];

  showCreateModal = false;
  createErrors: AssetFormErrors = {};
  createModel: {
    name: string;
    code: string;
    description: string;
    owner: string;
    categoryId: string;
    status: AssetStatus;
  } = {
    name: '',
    code: '',
    description: '',
    owner: '',
    categoryId: '',
    status: 'ACTIVE',
  };

  showEditModal = false;
  editErrors: AssetFormErrors = {};
  editModel: {
    id: string;
    name: string;
    code: string;
    description: string;
    owner: string;
    categoryId: string;
  } = {
    id: '',
    name: '',
    code: '',
    description: '',
    owner: '',
    categoryId: '',
  };

  showDeleteModal = false;
  deleteError = '';
  deleteTarget: AssetItem | null = null;

  constructor(
    private userService: UserService,
    private profileService: ProfileService,
    private ui: UiService
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  private loadProfile(): void {
    this.loading = true;
    this.errorMsg = '';

    this.profileService.getMyProfile().subscribe({
      next: (res) => {console.log(res);
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

        this.fetchCategories();
        this.fetchAssets(true);
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg =
          extractErrorMessage(err) || 'Gagal memuat profil pengguna.';
        this.ui.error(this.errorMsg);
      },
    });
  }

  private buildListParams(resetPage: boolean): AssetListParams {
    if (resetPage) this.page = 1;
    const params: AssetListParams = {
      page: this.page,
      limit: this.limit,
    };
    if (this.fStatus !== 'ALL') {
      params.status = this.fStatus;
    }
    return params;
  }

  private buildStatsParams(status: AssetStatus | null): AssetListParams {
    const params: AssetListParams = { page: 1, limit: 1 };
    if (status) params.status = status;
    return params;
  }

  private applyLocalFilter(list: AssetItem[], keyword: string): AssetItem[] {
    const k = (keyword ?? '').trim().toLowerCase();
    const filteredByStatus =
      this.fStatus === 'ALL'
        ? list
        : list.filter((x) => x.status === this.fStatus);

    if (!k) return filteredByStatus;

    return filteredByStatus.filter((x) => {
      const name = (x.name ?? '').toLowerCase();
      const code = (x.code ?? '').toLowerCase();
      const desc = (x.description ?? '').toLowerCase();
      const owner = (x.owner ?? '').toLowerCase();
      const category = (x.category?.name ?? '').toLowerCase();
      return (
        name.includes(k) ||
        code.includes(k) ||
        desc.includes(k) ||
        owner.includes(k) ||
        category.includes(k)
      );
    });
  }

  private renderList(): void {
    this.items = this.applyLocalFilter(this.allItems, this.q);
    this.refreshStatsClient(this.items);
  }

  private refreshStatsClient(list: AssetItem[]): void {
    this.totalAssets = list.length;
    this.totalActive = list.filter((x) => x.status === 'ACTIVE').length;
    this.totalInactive = list.filter((x) => x.status === 'INACTIVE').length;
    this.totalArchived = list.filter((x) => x.status === 'ARCHIVED').length;
  }

  private refreshStatsFromBackend(): void {
    if (!this.unitKerjaId) return;

    const total$ = this.userService
      .getAssets(this.unitKerjaId, this.buildStatsParams(null))
      .pipe(
        map((r) => r?.pagination?.totalItems ?? 0),
        catchError(() => of(0))
      );
    const active$ = this.userService
      .getAssets(this.unitKerjaId, this.buildStatsParams('ACTIVE'))
      .pipe(
        map((r) => r?.pagination?.totalItems ?? 0),
        catchError(() => of(0))
      );
    const inactive$ = this.userService
      .getAssets(this.unitKerjaId, this.buildStatsParams('INACTIVE'))
      .pipe(
        map((r) => r?.pagination?.totalItems ?? 0),
        catchError(() => of(0))
      );
    const archived$ = this.userService
      .getAssets(this.unitKerjaId, this.buildStatsParams('ARCHIVED'))
      .pipe(
        map((r) => r?.pagination?.totalItems ?? 0),
        catchError(() => of(0))
      );

    forkJoin({
      total: total$,
      active: active$,
      inactive: inactive$,
      archived: archived$,
    }).subscribe((r) => {
      this.totalAssets = r.total;
      this.totalActive = r.active;
      this.totalInactive = r.inactive;
      this.totalArchived = r.archived;
    });
  }

  fetchCategories(): void {
    this.userService.getAssetCategories({ page: 1, limit: 1000 }).subscribe({
      next: (res) => {
        this.categories = res.data ?? [];
      },
      error: () => {
        this.categories = [];
      },
    });
  }

  fetchAssets(resetPage: boolean): void {
    if (!this.unitKerjaId) return;

    this.loading = true;
    this.errorMsg = '';

    this.userService
      .getAssets(this.unitKerjaId, this.buildListParams(resetPage))
      .subscribe({
        next: (res) => {
          this.allItems = res.data ?? [];
          this.pagination = res.pagination ?? null;
          this.renderList();
          this.refreshStatsFromBackend();
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
            `Gagal fetch assets (HTTP ${err?.status || 'unknown'}).`;
          this.ui.error(this.errorMsg);
        },
      });
  }

  applySearch(): void {
    this.fetchAssets(true);
  }

  resetSearch(): void {
    this.q = '';
    this.fStatus = 'ALL';
    this.fetchAssets(true);
  }

  prevPage(): void {
    if (!this.pagination?.hasPrevPage) return;
    this.page = Math.max(1, this.page - 1);
    this.fetchAssets(false);
  }

  nextPage(): void {
    if (!this.pagination?.hasNextPage) return;
    this.page = this.page + 1;
    this.fetchAssets(false);
  }

  goToPage(pageNum: number): void {
    if (pageNum < 1 || pageNum > (this.pagination?.totalPages ?? 1)) return;
    this.page = pageNum;
    this.fetchAssets(false);
  }

  onLimitChange(): void {
    this.page = 1;
    this.fetchAssets(true);
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
      name: '',
      code: '',
      description: '',
      owner: '',
      categoryId: '',
      status: 'ACTIVE',
    };
    this.showCreateModal = true;
  }

  closeCreate(): void {
    this.showCreateModal = false;
    this.createErrors = {};
  }

  private isValidCode(value: string): boolean {
    return /^[A-Z0-9_-]+$/.test(value.trim());
  }

  createAsset(): void {
    this.createErrors = {};

    if (!this.unitKerjaId) {
      this.createErrors.unitKerjaId = 'Unit kerja tidak ditemukan.';
      return;
    }
    if (!this.createModel.name.trim()) {
      this.createErrors.name = 'Nama wajib diisi.';
      return;
    }
    if (!this.createModel.code.trim()) {
      this.createErrors.code = 'Kode wajib diisi.';
      return;
    }
    if (!this.isValidCode(this.createModel.code)) {
      this.createErrors.code =
        'Kode aset hanya boleh huruf kapital, angka, underscore, dan dash.';
      return;
    }
    if (!this.createModel.categoryId) {
      this.createErrors.categoryId = 'Kategori aset wajib dipilih.';
      return;
    }

    const payload: CreateAssetPayload = {
      name: this.createModel.name.trim(),
      code: this.createModel.code.trim(),
      description: this.createModel.description.trim(),
      owner: this.createModel.owner.trim(),
      categoryId: this.createModel.categoryId,
      status: this.createModel.status,
    };

    this.loading = true;

    this.userService.createAsset(this.unitKerjaId, payload).subscribe({
      next: () => {
        this.loading = false;
        this.closeCreate();
        this.ui.success('Aset berhasil ditambahkan.');
        this.fetchAssets(true);
      },
      error: (e) => {
        this.loading = false;
        this.createErrors = extractFieldErrors(e);
        this.ui.error(extractErrorMessage(e) || 'Gagal menambah aset.');
      },
    });
  }

  // ===================== EDIT =====================
  openEdit(item: AssetItem): void {
    this.editErrors = {};
    this.editModel = {
      id: item.id,
      name: item.name ?? '',
      code: item.code ?? '',
      description: item.description ?? '',
      owner: item.owner ?? '',
      categoryId: item.category?.id ?? '',
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
    if (!this.editModel.code.trim()) {
      this.editErrors.code = 'Kode wajib diisi.';
      return;
    }
    if (!this.isValidCode(this.editModel.code)) {
      this.editErrors.code =
        'Kode aset hanya boleh huruf kapital, angka, underscore, dan dash.';
      return;
    }
    if (!this.editModel.categoryId) {
      this.editErrors.categoryId = 'Kategori aset wajib dipilih.';
      return;
    }

    const payload: UpdateAssetPayload = {
      name: this.editModel.name.trim(),
      code: this.editModel.code.trim(),
      description: this.editModel.description.trim(),
      owner: this.editModel.owner.trim(),
      categoryId: this.editModel.categoryId,
    };

    this.loading = true;

    this.userService
      .updateAsset(this.unitKerjaId, this.editModel.id, payload)
      .subscribe({
        next: () => {
          this.loading = false;
          this.closeEdit();
          this.ui.success('Aset berhasil diperbarui.');
          this.fetchAssets(false);
        },
        error: (e) => {
          this.loading = false;
          this.editErrors = extractFieldErrors(e);
          this.ui.error(extractErrorMessage(e) || 'Gagal mengubah aset.');
        },
      });
  }

  // ===================== ACTIONS =====================
  setActive(item: AssetItem): void {
    if (item.status !== 'INACTIVE') return;
    this.loading = true;

    this.userService.activateAsset(this.unitKerjaId, item.id).subscribe({
      next: () => {
        this.loading = false;
        this.allItems = this.allItems.map((x) =>
          x.id === item.id ? { ...x, status: 'ACTIVE' } : x
        );
        this.renderList();
        this.ui.success('Aset berhasil diaktifkan.');
      },
      error: (e) => {
        this.loading = false;
        this.ui.error(extractErrorMessage(e) || 'Gagal mengaktifkan aset.');
      },
    });
  }

  setInactive(item: AssetItem): void {
    if (item.status !== 'ACTIVE') return;
    this.loading = true;

    this.userService.deactivateAsset(this.unitKerjaId, item.id).subscribe({
      next: () => {
        this.loading = false;
        this.allItems = this.allItems.map((x) =>
          x.id === item.id ? { ...x, status: 'INACTIVE' } : x
        );
        this.renderList();
        this.ui.success('Aset berhasil dinonaktifkan.');
      },
      error: (e) => {
        this.loading = false;
        this.ui.error(extractErrorMessage(e) || 'Gagal menonaktifkan aset.');
      },
    });
  }

  openDelete(item: AssetItem): void {
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
    this.userService.deleteAsset(this.unitKerjaId, this.deleteTarget.id).subscribe({
      next: () => {
        this.loading = false;
        this.allItems = this.allItems.map((x) =>
          x.id === this.deleteTarget!.id ? { ...x, status: 'ARCHIVED' } : x
        );
        this.renderList();
        this.closeDelete();
        this.ui.success('Aset berhasil diarsipkan.');
      },
      error: (e) => {
        this.loading = false;
        this.deleteError = extractErrorMessage(e) || 'Gagal mengarsipkan aset.';
        this.ui.error(this.deleteError);
      },
    });
  }

  getStatusLabel(status: AssetStatus): string {
    if (status === 'ACTIVE') return 'Active';
    if (status === 'INACTIVE') return 'Inactive';
    return 'Archived';
  }

  getStatusClass(status: AssetStatus): string {
    if (status === 'ACTIVE') return 'green';
    if (status === 'INACTIVE') return 'gray';
    return 'archived';
  }
}
