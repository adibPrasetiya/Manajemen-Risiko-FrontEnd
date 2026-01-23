import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UiService } from '../../../../core/services/ui.service';
import { extractErrorMessage } from '../../../../core/utils/error-utils';
import {
  AssetCategoryItem,
  AssetCategoryListParams,
  AssetCategoryPayload,
  Pagination,
  UserService,
} from '../../../../core/services/user.service';

@Component({
  selector: 'app-asset-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asset-categories.component.html',
  styleUrl: './asset-categories.component.scss',
})
export class AssetCategoriesComponent implements OnInit {
  loading = false;
  errorMsg = '';

  items: AssetCategoryItem[] = [];
  allItems: AssetCategoryItem[] = [];
  pagination: Pagination | null = null;

  q = '';

  page = 1;
  limit = 10;
  limitOptions = [10, 25, 50, 100];

  showEditModal = false;
  editError = '';
  editModel: { id: string; name: string; description: string } = {
    id: '',
    name: '',
    description: '',
  };

  showDeleteModal = false;
  deleteError = '';
  deleteTarget: AssetCategoryItem | null = null;

  showCreateModal = false;
  createError = '';
  createModel: { name: string; description: string } = {
    name: '',
    description: '',
  };

  constructor(private userService: UserService, private ui: UiService) {}

  ngOnInit(): void {
    this.fetch(true);
  }

  private buildListParams(resetPage: boolean): AssetCategoryListParams {
    if (resetPage) this.page = 1;

    return {
      page: this.page,
      limit: this.limit,
    };
  }

  private applyLocalFilter(
    list: AssetCategoryItem[],
    keyword: string
  ): AssetCategoryItem[] {
    const k = (keyword ?? '').trim().toLowerCase();
    if (!k) return list;

    return list.filter((x) => {
      const name = (x.name ?? '').toLowerCase();
      const desc = (x.description ?? '').toLowerCase();
      return name.includes(k) || desc.includes(k);
    });
  }

  private renderList(): void {
    this.items = this.applyLocalFilter(this.allItems, this.q);
  }

  fetch(resetPage: boolean): void {
    this.loading = true;
    this.errorMsg = '';

    const params = this.buildListParams(resetPage);

    this.userService.getAssetCategories(params).subscribe({
      next: (res) => {
        this.allItems = res.data ?? [];
        this.pagination = res.pagination ?? null;

        this.renderList();

        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.items = [];
        this.allItems = [];
        this.pagination = null;

        if (err?.status === 401) {
          this.errorMsg =
            'HTTP 401: Token tidak ada/invalid. Pastikan accessToken tersedia di localStorage.';
          return;
        }

        this.errorMsg =
          extractErrorMessage(err) ||
          `Gagal fetch asset categories (HTTP ${err?.status || 'unknown'}).`;
        this.ui.error(this.errorMsg);
      },
    });
  }

  applySearch(): void {
    this.renderList();
  }

  resetSearch(): void {
    this.q = '';
    this.renderList();
  }

  prevPage(): void {
    if (!this.pagination?.hasPrevPage) return;
    this.page = Math.max(1, this.page - 1);
    this.fetch(false);
  }

  nextPage(): void {
    if (!this.pagination?.hasNextPage) return;
    this.page = this.page + 1;
    this.fetch(false);
  }

  goToPage(pageNum: number): void {
    if (pageNum < 1 || pageNum > (this.pagination?.totalPages ?? 1)) return;
    this.page = pageNum;
    this.fetch(false);
  }

  onLimitChange(): void {
    this.page = 1;
    this.fetch(true);
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

  // ===================== EDIT =====================
  openEdit(item: AssetCategoryItem): void {
    this.editError = '';
    this.editModel = {
      id: item.id,
      name: item.name ?? '',
      description: item.description ?? '',
    };
    this.showEditModal = true;
  }

  closeEdit(): void {
    this.showEditModal = false;
    this.editError = '';
  }

  saveEdit(): void {
    this.editError = '';

    if (!this.editModel.name.trim()) {
      this.editError = 'Nama wajib diisi.';
      return;
    }
    if (!this.editModel.description.trim()) {
      this.editError = 'Deskripsi wajib diisi.';
      return;
    }

    if (!this.userService.hasAuthToken()) {
      this.editError = 'Token tidak ditemukan. Silakan login ulang.';
      return;
    }

    const payload: AssetCategoryPayload = {
      name: this.editModel.name.trim(),
      description: this.editModel.description.trim(),
    };

    this.loading = true;

    this.userService.updateAssetCategory(this.editModel.id, payload).subscribe({
      next: () => {
        this.allItems = this.allItems.map((x) =>
          x.id === this.editModel.id ? { ...x, ...payload } : x
        );
        this.renderList();
        this.loading = false;
        this.closeEdit();
      },
      error: (e) => {
        this.loading = false;
        this.editError = extractErrorMessage(e) || 'Gagal update kategori aset.';
        this.ui.error(this.editError);
      },
    });
  }

  // ===================== DELETE =====================
  openDelete(item: AssetCategoryItem): void {
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

    if (!this.userService.hasAuthToken()) {
      this.deleteError = 'Token tidak ditemukan. Silakan login ulang.';
      return;
    }

    this.loading = true;

    this.userService.deleteAssetCategory(this.deleteTarget.id).subscribe({
      next: () => {
        this.allItems = this.allItems.filter((x) => x.id !== this.deleteTarget!.id);
        this.renderList();
        this.loading = false;
        this.closeDelete();
      },
      error: (e) => {
        this.loading = false;
        this.deleteError = extractErrorMessage(e) || 'Gagal hapus kategori aset.';
        this.ui.error(this.deleteError);
      },
    });
  }

  // ===================== CREATE =====================
  openCreate(): void {
    this.resetCreateModel();
    this.showCreateModal = true;
  }

  closeCreate(): void {
    this.showCreateModal = false;
    this.createError = '';
  }

  private resetCreateModel(): void {
    this.createError = '';
    this.createModel = {
      name: '',
      description: '',
    };
  }

  createAssetCategory(): void {
    this.createError = '';

    if (!this.createModel.name.trim()) {
      this.createError = 'Nama wajib diisi.';
      return;
    }
    if (!this.createModel.description.trim()) {
      this.createError = 'Deskripsi wajib diisi.';
      return;
    }

    if (!this.userService.hasAuthToken()) {
      this.createError = 'Token tidak ditemukan. Silakan login ulang.';
      return;
    }

    const payload: AssetCategoryPayload = {
      name: this.createModel.name.trim(),
      description: this.createModel.description.trim(),
    };

    this.loading = true;

    this.userService.createAssetCategory(payload).subscribe({
      next: (res) => {
        const created = res?.data;
        if (created?.id) {
          this.allItems = [created, ...this.allItems];
          this.renderList();
        } else {
          this.fetch(true);
        }
        this.loading = false;
        this.closeCreate();
      },
      error: (e) => {
        this.loading = false;
        this.createError = extractErrorMessage(e) || 'Gagal membuat kategori aset.';
        this.ui.error(this.createError);
      },
    });
  }

  trackById(_: number, item: AssetCategoryItem) {
    return item.id;
  }
}
