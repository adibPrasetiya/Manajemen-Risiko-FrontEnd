import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { KonteksService } from '../../../../core/services/konteks.service';
import {
  CreateKonteksModel,
  CreateKonteksPayload,
  EditKonteksModel,
  KonteksItem,
  Pagination,
  UpdateKonteksPayload,
} from '../../../../core/models/konteks.model';
import { extractErrorMessage, extractFieldErrors } from '../../../../core/utils/error-utils';
import { UiService } from '../../../../core/services/ui.service';
@Component({
  selector: 'app-konteks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './konteks.component.html',
  styleUrl: './konteks.component.scss',
})
export class KonteksComponent implements OnInit {
  loading = false;
  errorMsg = '';
  // list utama (yang ditampilkan)
  items: KonteksItem[] = [];
  pagination: Pagination | null = null;
  // ===== Summary Counts (Stats Row) =====
  totalKonteks = 0;
  totalAktif = 0;
  totalNonAktif = 0;
  // ===== Filter Model (UI) =====
  fName = '';
  fCode = '';
  fDescription = '';
  fCategoryMin: number | '' = '';
  fPeriode = 'ALL'; // year
  fRiskAppetite = 'ALL'; // HIGH/MEDIUM/LOW
  fMatrixSize = 'ALL'; // 4/5
  fActive = 'ALL'; // ALL | ACTIVE | INACTIVE
  // advanced filter toggle
  showAdvancedFilters = false;
  periodeOptions: (string | number)[] = ['ALL'];
  yearOptions: number[] = Array.from({ length: 21 }, (_, i) => 2016 + i);
  appetiteOptions: string[] = ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  matrixOptions: (string | number)[] = ['ALL', 3, 4, 5];
  // pagination
  page = 1;
  limit = 10;
  limitOptions = [10, 25, 50, 100];
  // ===== Edit Modal =====
  showEditModal = false;
  editErrors: {
    name?: string;
    code?: string;
    description?: string;
    periodStart?: string;
    periodEnd?: string;
    matrixSize?: string;
    riskAppetiteLevel?: string;
    riskAppetiteDescription?: string;
  } = {};
  editModel: EditKonteksModel = {
    id: '',
    name: '',
    code: '',
    description: '',
    periodStart: null,
    periodEnd: null,
    matrixSize: 5,
    riskAppetiteLevel: 'LOW',
    riskAppetiteDescription: '',
    isActive: false,
  };

  // ===== Create Modal =====
  showCreateModal = false;
  createErrors: {
    name?: string;
    code?: string;
    description?: string;
    periodStart?: string;
    periodEnd?: string;
    matrixSize?: string;
    riskAppetiteLevel?: string;
    riskAppetiteDescription?: string;
  } = {};
  createLoading = false;
  createModel: CreateKonteksModel = {
    name: '',
    code: '',
    description: '',
    periodStart: null,
    periodEnd: null,
    matrixSize: 5,
    riskAppetiteLevel: '',
    riskAppetiteDescription: '',
  };
  constructor(
    private konteksService: KonteksService,
    private router: Router,
    private ui: UiService
  ) {}
  openDropdown: string | null = null;
  openKonteksDetail(k: any): void {
  this.router.navigate(['/konteks-management', k.id]);
}
  ngOnInit(): void {
    this.buildPeriodeOptions();
    this.fetchKonteks(true);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown')) {
      this.openDropdown = null;
    }
  }
  // Build params (kalau backend support filters via query params, tinggal aktifkan yang perlu)
  private buildListParams(resetPage: boolean): { page: number; limit: number } {
    if (resetPage) this.page = 1;
    return { page: this.page, limit: this.limit };
  }
  // Stats params: ngikut filters, tapi page/limit kecil
  private buildStatsParams(activeOverride: boolean | null): {
    page: number;
    limit: number;
    isActive?: boolean;
  } {
    const params: { page: number; limit: number; isActive?: boolean } = {
      page: 1,
      limit: 1,
    };
    if (typeof activeOverride === 'boolean') {
      params.isActive = activeOverride;
    }
    return params;
  }
  private buildPeriodeOptions(): void {
    this.periodeOptions = ['ALL', ...this.yearOptions];
  }

  toggleDropdown(id: string): void {
    this.openDropdown = this.openDropdown === id ? null : id;
  }

  isDropdownOpen(id: string): boolean {
    return this.openDropdown === id;
  }

  formatPeriodeLabel(value: string | number): string {
    return value === 'ALL' ? 'All Periode' : String(value);
  }

  isPeriodeSelected(value: string | number): boolean {
    return String(this.fPeriode) === String(value);
  }

  selectPeriodeFilter(value: string | number): void {
    this.fPeriode = value as any;
    this.openDropdown = null;
  }

  formatYearLabel(value: number | null): string {
    return value ? String(value) : 'Pilih tahun';
  }

  formatRiskAppetiteLabel(value: string): string {
    return value ? value : 'Pilih risk appetite level';
  }

  getRiskAppetiteCreateOptions(): string[] {
    return this.appetiteOptions.filter((x) => x !== 'ALL');
  }

  selectCreateRiskAppetite(value: string): void {
    this.createModel.riskAppetiteLevel = value;
    this.openDropdown = null;
  }

  selectCreatePeriodStart(y: number): void {
    this.createModel.periodStart = y;
    this.openDropdown = null;
  }

  selectCreatePeriodEnd(y: number): void {
    this.createModel.periodEnd = y;
    this.openDropdown = null;
  }

  selectEditPeriodStart(y: number): void {
    this.editModel.periodStart = y;
    this.openDropdown = null;
  }

  selectEditPeriodEnd(y: number): void {
    this.editModel.periodEnd = y;
    this.openDropdown = null;
  }
  // client-side filter: supaya UX tetap jalan walaupun backend belum support filter params
  private applyClientFilters(list: KonteksItem[]): KonteksItem[] {
    const nameQ = this.fName.trim().toLowerCase();
    const codeQ = this.fCode.trim().toLowerCase();
    const descQ = this.fDescription.trim().toLowerCase();
    const catMinRaw = String(this.fCategoryMin ?? '').trim();
    return (list ?? []).filter((k) => {
      if (nameQ && !(k.name ?? '').toLowerCase().includes(nameQ)) return false;
      if (codeQ && !(k.code ?? '').toLowerCase().includes(codeQ)) return false;
      if (descQ && !(k.description ?? '').toLowerCase().includes(descQ)) return false;
      if (catMinRaw) {
        const catMin = Number(catMinRaw);
        if (!Number.isNaN(catMin) && (k._count?.riskCategories ?? 0) < catMin) return false;
      }
      if (this.fRiskAppetite !== 'ALL' && (k.riskAppetiteLevel ?? '') !== this.fRiskAppetite) {
        return false;
      }
      if (this.fMatrixSize !== 'ALL' && String(k.matrixSize) !== String(this.fMatrixSize)) {
        return false;
      }
      if (this.fActive === 'ACTIVE' && !k.isActive) return false;
      if (this.fActive === 'INACTIVE' && k.isActive) return false;
      if (this.fPeriode !== 'ALL') {
        const y = Number(this.fPeriode);
        if (!(k.periodStart <= y && y <= k.periodEnd)) return false;
      }
      return true;
    });
  }
  private refreshStatsClient(filtered: KonteksItem[]): void {
    this.totalKonteks = filtered.length;
    this.totalAktif = filtered.filter((x) => x.isActive).length;
    this.totalNonAktif = filtered.filter((x) => !x.isActive).length;
  }
  // OPTIONAL: kalau backend sudah support isActive filter (true/false), stats lebih akurat cross-page
  private refreshKonteksStatsFromBackend(): void {
    const total$ = this.konteksService
      .getKonteksList(this.buildStatsParams(null))
      .pipe(map((r) => r?.pagination?.totalItems ?? 0), catchError(() => of(0)));
    const active$ = this.konteksService
      .getKonteksList(this.buildStatsParams(true))
      .pipe(map((r) => r?.pagination?.totalItems ?? 0), catchError(() => of(0)));
    const inactive$ = this.konteksService
      .getKonteksList(this.buildStatsParams(false))
      .pipe(map((r) => r?.pagination?.totalItems ?? 0), catchError(() => of(0)));
    forkJoin({ total: total$, active: active$, inactive: inactive$ }).subscribe((r) => {
      // hanya update kalau response bukan 0 semua karena error
      this.totalKonteks = r.total;
      this.totalAktif = r.active;
      this.totalNonAktif = r.inactive;
    });
  }
  fetchKonteks(resetPage: boolean): void {
    this.loading = true;
    this.errorMsg = '';
    this.konteksService.getKonteksList(this.buildListParams(resetPage)).subscribe({
      next: (res) => {
        const raw = res.data ?? [];
        // periode options dari range fixed
        this.buildPeriodeOptions();
        // apply filter client-side biar UX sama kayak users
        const filtered = this.applyClientFilters(raw);
        this.items = filtered;
        // stats client (sesuai filter + page ini)
        this.refreshStatsClient(filtered);
        // pagination tetap dari backend
        this.pagination = res.pagination ?? null;
        // OPTIONAL: kalau backend support stats lebih akurat, aktifkan:
        // this.refreshKonteksStatsFromBackend();
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.items = [];
        this.pagination = null;
        this.totalKonteks = 0;
        this.totalAktif = 0;
        this.totalNonAktif = 0;
        if (err?.status === 401) {
          this.errorMsg =
            'HTTP 401: Token tidak ada/invalid. Pastikan accessToken tersedia di localStorage.';
          return;
        }
        this.errorMsg =
          extractErrorMessage(err) ||
          `Gagal fetch konteks dari API (HTTP ${err?.status || 'unknown'}).`;
        this.ui.error(this.errorMsg);
      },
    });
  }
  applyFilters(): void {
    this.fetchKonteks(true);
  }
  resetFilters(): void {
    this.fName = '';
    this.fCode = '';
    this.fDescription = '';
    this.fCategoryMin = '';
    this.fPeriode = 'ALL';
    this.fRiskAppetite = 'ALL';
    this.fMatrixSize = 'ALL';
    this.fActive = 'ALL';
    this.showAdvancedFilters = false;
    this.fetchKonteks(true);
  }
  toggleAdvancedFilters(): void {
    this.showAdvancedFilters = !this.showAdvancedFilters;
  }
  hasActiveAdvancedFilters(): boolean {
    return (
      !!String(this.fDescription ?? '').trim() ||
      !!String(this.fCategoryMin ?? '').trim() ||
      this.fPeriode !== 'ALL' ||
      this.fRiskAppetite !== 'ALL' ||
      this.fMatrixSize !== 'ALL'
    );
  }
  getActiveAdvancedFiltersCount(): number {
    return (
      (String(this.fDescription ?? '').trim() ? 1 : 0) +
      (String(this.fCategoryMin ?? '').trim() ? 1 : 0) +
      (this.fPeriode !== 'ALL' ? 1 : 0) +
      (this.fRiskAppetite !== 'ALL' ? 1 : 0) +
      (this.fMatrixSize !== 'ALL' ? 1 : 0)
    );
  }
  // pagination controls
  prevPage(): void {
    if (!this.pagination?.hasPrevPage) return;
    this.page = Math.max(1, this.page - 1);
    this.fetchKonteks(false);
  }
  nextPage(): void {
    if (!this.pagination?.hasNextPage) return;
    this.page = this.page + 1;
    this.fetchKonteks(false);
  }
  goToPage(pageNum: number): void {
    if (pageNum < 1 || pageNum > (this.pagination?.totalPages ?? 1)) return;
    this.page = pageNum;
    this.fetchKonteks(false);
  }
  onLimitChange(): void {
    this.page = 1;
    this.fetchKonteks(true);
  }
  getPageNumbers(): number[] {
    if (!this.pagination) return [];
    const total = this.pagination.totalPages;
    if (total < 1) return [];
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
    if (this.pagination.totalItems <= 0) return 0;
    return (this.pagination.page - 1) * this.limit + 1;
  }
  getShowingEnd(): number {
    if (!this.pagination) return 0;
    if (this.pagination.totalItems <= 0) return 0;
    return Math.min(this.pagination.page * this.limit, this.pagination.totalItems);
  }

  // ===================== CREATE KONTEKS (MODAL) =====================
  openCreateModal(): void {
    this.resetCreateModel();
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.createErrors = {};
    this.createLoading = false;
  }

  private resetCreateModel(): void {
    this.createErrors = {};
    this.createModel = {
      name: '',
      code: '',
      description: '',
      periodStart: null,
      periodEnd: null,
      matrixSize: 5,
      riskAppetiteLevel: '',
      riskAppetiteDescription: '',
    };
  }

  createKonteks(): void {
    this.createErrors = {};

    if (!this.createModel.name.trim()) {
      this.createErrors.name = 'Nama konteks wajib diisi.';
      return;
    }

    if (!this.createModel.code.trim()) {
      this.createErrors.code = 'Kode konteks wajib diisi.';
      return;
    }

    if (!this.isValidCode(this.createModel.code)) {
      this.createErrors.code =
        'Kode hanya boleh huruf besar, angka, dan underscore. Contoh: RISK_2026';
      return;
    }

    const ps = Number(this.createModel.periodStart);
    const pe = Number(this.createModel.periodEnd);

    if (!ps || !pe) {
      if (!ps) this.createErrors.periodStart = 'Periode mulai wajib diisi.';
      if (!pe) this.createErrors.periodEnd = 'Periode akhir wajib diisi.';
      return;
    }
    if (ps > pe) {
      this.createErrors.periodEnd = 'Periode akhir tidak boleh lebih kecil dari periode mulai.';
      return;
    }

    if (![3, 4, 5].includes(Number(this.createModel.matrixSize))) {
      this.createErrors.matrixSize = 'Ukuran matriks hanya mendukung 3, 4, atau 5.';
      return;
    }

    if (!this.createModel.riskAppetiteLevel) {
      this.createErrors.riskAppetiteLevel = 'Risk appetite level wajib dipilih.';
      return;
    }

    const payload: CreateKonteksPayload = {
      name: this.createModel.name.trim(),
      code: this.createModel.code.trim(),
      description: (this.createModel.description ?? '').trim(),
      periodStart: ps,
      periodEnd: pe,
      matrixSize: Number(this.createModel.matrixSize),
      riskAppetiteLevel: String(this.createModel.riskAppetiteLevel),
      riskAppetiteDescription: (this.createModel.riskAppetiteDescription ?? '').trim(),
    };

    this.createLoading = true;

    this.konteksService.createKonteks(payload).subscribe({
      next: () => {
        this.createLoading = false;
        this.closeCreateModal();
        this.ui.success('Berhasil menambah konteks.');
        this.fetchKonteks(true);
      },
      error: (e) => {
        this.createLoading = false;
        const fieldErrors = extractFieldErrors(e);
        if (Object.keys(fieldErrors).length) {
          this.createErrors = fieldErrors;
        }
        this.ui.error(extractErrorMessage(e) || 'Gagal menambah konteks.');
      },
    });
  }

  // ===================== EDIT KONTEKS (MODAL) =====================
  editKonteks(k: KonteksItem): void {
    this.editErrors = {};
    this.editModel = {
      id: k.id,
      name: k.name ?? '',
      code: k.code ?? '',
      description: k.description ?? '',
      periodStart: typeof k.periodStart === 'number' ? k.periodStart : null,
      periodEnd: typeof k.periodEnd === 'number' ? k.periodEnd : null,
      matrixSize: k.matrixSize ?? 5,
      riskAppetiteLevel: k.riskAppetiteLevel ?? 'LOW',
      riskAppetiteDescription: k.riskAppetiteDescription ?? '',
      isActive: !!k.isActive,
    };
    this.showEditModal = true;
  }
  closeEditModal(): void {
    this.showEditModal = false;
    this.editErrors = {};
  }
  private isValidCode(v: string): boolean {
    // sederhana: uppercase + underscore + angka (boleh kamu longgarkan)
    return /^[A-Z0-9_]+$/.test(v.trim());
  }
  saveEditKonteks(): void {
    this.editErrors = {};
    if (!this.editModel.name.trim()) {
      this.editErrors.name = 'Nama konteks wajib diisi.';
      return;
    }
    if (!this.editModel.code.trim()) {
      this.editErrors.code = 'Kode konteks wajib diisi.';
      return;
    }
    if (!this.isValidCode(this.editModel.code)) {
      this.editErrors.code =
        'Kode hanya boleh huruf besar, angka, dan underscore. Contoh: RISK_2026';
      return;
    }
    const ps = Number(this.editModel.periodStart);
    const pe = Number(this.editModel.periodEnd);
    if (!ps || !pe) {
      if (!ps) this.editErrors.periodStart = 'Periode mulai wajib diisi.';
      if (!pe) this.editErrors.periodEnd = 'Periode akhir wajib diisi.';
      return;
    }
    if (ps > pe) {
      this.editErrors.periodEnd = 'Periode akhir tidak boleh lebih kecil dari periode mulai.';
      return;
    }
    if (![3, 4, 5].includes(Number(this.editModel.matrixSize))) {
      this.editErrors.matrixSize = 'Ukuran matriks hanya mendukung 3, 4, atau 5.';
      return;
    }
    if (!this.editModel.riskAppetiteLevel) {
      this.editErrors.riskAppetiteLevel = 'Risk appetite level wajib dipilih.';
      return;
    }
    const payload: UpdateKonteksPayload = {
      name: this.editModel.name.trim(),
      code: this.editModel.code.trim(),
      description: (this.editModel.description ?? '').trim(),
      periodStart: ps,
      periodEnd: pe,
      matrixSize: Number(this.editModel.matrixSize),
      riskAppetiteLevel: String(this.editModel.riskAppetiteLevel),
      riskAppetiteDescription: (this.editModel.riskAppetiteDescription ?? '').trim(),
      isActive: !!this.editModel.isActive,
    };
    this.loading = true;
    this.konteksService.updateKonteks(this.editModel.id, payload).subscribe({
      next: () => {
        // update table lokal biar langsung berubah
        this.items = this.items.map((x) =>
          x.id === this.editModel.id
            ? {
                ...x,
                ...payload,
              }
            : x
        );
        // refresh stats client
        this.refreshStatsClient(this.items);
        this.loading = false;
        this.closeEditModal();
        this.ui.success('Berhasil menyimpan perubahan konteks.');
      },
      error: (e) => {
        this.loading = false;
        const fieldErrors = extractFieldErrors(e);
        if (Object.keys(fieldErrors).length) {
          this.editErrors = fieldErrors;
        }
        this.ui.error(extractErrorMessage(e) || 'Gagal menyimpan perubahan konteks.');
      },
    });
  }
  trackById(_: number, item: KonteksItem) {
    return item.id;
  }
  // helpers ui
  appetiteBadgeClass(v: string): string {
    if (v === 'CRITICAL') return 'red';
    if (v === 'HIGH') return 'red';
    if (v === 'MEDIUM') return 'orange';
    if (v === 'LOW') return 'green';
    return 'gray';
  }
  matrixLabel(size: number): string {
    const s = size ?? 0;
    return `${s}x${s}`;
  }
}
