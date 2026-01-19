import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  HttpClient,
  HttpHeaders,
  HttpParams,
} from '@angular/common/http';

type UnitKerjaItem = {
  id: string;
  name: string;
  code: string;
  email?: string;
  createdAt: string;
  updatedAt?: string;

  // ✅ sesuai backend kamu
  _count?: {
    profiles?: number;
  };
};

type Pagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

type ListResponse = {
  message: string;
  data: UnitKerjaItem[];
  pagination?: Pagination;
};

@Component({
  selector: 'app-unit-kerja',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './unit-kerja.component.html',
  styleUrl: './unit-kerja.component.scss',
})
export class UnitKerjaComponent implements OnInit {
  private baseUrl = 'http://api.dev.simulasibimtekd31.com';
  private endpoint = '/unit-kerja';

  loading = false;
  errorMsg = '';

  items: UnitKerjaItem[] = [];
  allItems: UnitKerjaItem[] = [];

  pagination: Pagination | null = null;

  q = '';

  page = 1;
  limit = 10;

  showEditModal = false;
  editError = '';
  editModel: { id: string; name: string; code: string; email: string } = {
    id: '',
    name: '',
    code: '',
    email: '',
  };

  showDeleteModal = false;
  deleteError = '';
  deleteTarget: UnitKerjaItem | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetch(true);
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

  private buildParams(resetPage: boolean): HttpParams {
    if (resetPage) this.page = 1;

    // ✅ backend kamu tidak menerima q, jadi cuma page & limit
    return new HttpParams()
      .set('page', String(this.page))
      .set('limit', String(this.limit));
  }

  private applyLocalFilter(list: UnitKerjaItem[], keyword: string): UnitKerjaItem[] {
    const k = (keyword ?? '').trim().toLowerCase();
    if (!k) return list;

    return list.filter((x) => {
      const name = (x.name ?? '').toLowerCase();
      const code = (x.code ?? '').toLowerCase();
      const email = (x.email ?? '').toLowerCase();
      return name.includes(k) || code.includes(k) || email.includes(k);
    });
  }

  private renderList(): void {
    this.items = this.applyLocalFilter(this.allItems, this.q);
  }

  fetch(resetPage: boolean): void {
    this.loading = true;
    this.errorMsg = '';

    const headers = this.buildHeaders();
    const params = this.buildParams(resetPage);

    this.http
      .get<ListResponse>(`${this.baseUrl}${this.endpoint}`, { headers, params })
      .subscribe({
        next: (res) => {
          this.allItems = res.data ?? [];
          this.pagination = res.pagination ?? null;

          // ✅ apply keyword filter (kalau ada)
          this.renderList();

          this.loading = false;
        },
        error: (err) => {
          console.error('Error fetching unit kerja:', err);
          this.loading = false;

          this.items = [];
          this.allItems = [];
          this.pagination = null;

          if (err?.status === 401) {
            this.errorMsg =
              'HTTP 401: Token tidak ada/invalid. Pastikan accessToken tersedia di localStorage.';
            return;
          }

          this.errorMsg = `Gagal fetch unit kerja (HTTP ${err?.status || 'unknown'}).`;
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

  // ===================== EDIT =====================
  openEdit(u: UnitKerjaItem): void {
    this.editError = '';
    this.editModel = {
      id: u.id,
      name: u.name ?? '',
      code: u.code ?? '',
      email: u.email ?? '',
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
    if (!this.editModel.code.trim()) {
      this.editError = 'Kode wajib diisi.';
      return;
    }

    const headers = this.buildHeaders();
    if (!headers) {
      this.editError = 'Token tidak ditemukan. Silakan login ulang.';
      return;
    }

    const payload = {
      name: this.editModel.name.trim(),
      code: this.editModel.code.trim(),
      email: this.editModel.email.trim() || undefined,
    };

    this.loading = true;

    // PATCH /unit-kerja/:id
    this.http
      .patch<any>(`${this.baseUrl}${this.endpoint}/${this.editModel.id}`, payload, { headers })
      .subscribe({
        next: () => {
          // ✅ update cache, tetap simpan _count lama
          this.allItems = this.allItems.map((x) =>
            x.id === this.editModel.id ? { ...x, ...payload } : x
          );
          this.renderList();
          this.loading = false;
          this.closeEdit();
        },
        error: (e) => {
          this.loading = false;
          this.editError =
            e?.error?.errors || e?.error?.message || 'Gagal update unit kerja.';
          console.error('[PATCH /unit-kerja/:id] error:', e);
        },
      });
  }

  // ===================== DELETE / REVOKE =====================
  openDelete(u: UnitKerjaItem): void {
    this.deleteError = '';
    this.deleteTarget = u;
    this.showDeleteModal = true;
  }

  closeDelete(): void {
    this.showDeleteModal = false;
    this.deleteError = '';
    this.deleteTarget = null;
  }

  confirmDelete(): void {
    if (!this.deleteTarget) return;

    const headers = this.buildHeaders();
    if (!headers) {
      this.deleteError = 'Token tidak ditemukan. Silakan login ulang.';
      return;
    }

    this.loading = true;

    // DELETE /unit-kerja/:id
    this.http
      .delete<any>(`${this.baseUrl}${this.endpoint}/${this.deleteTarget.id}`, { headers })
      .subscribe({
        next: () => {
          this.allItems = this.allItems.filter((x) => x.id !== this.deleteTarget!.id);
          this.renderList();
          this.loading = false;
          this.closeDelete();
        },
        error: (e) => {
          this.loading = false;
          this.deleteError =
            e?.error?.errors || e?.error?.message || 'Gagal hapus unit kerja.';
          console.error('[DELETE /unit-kerja/:id] error:', e);
        },
      });
  }

  trackById(_: number, item: UnitKerjaItem) {
    return item.id;
  }
}
