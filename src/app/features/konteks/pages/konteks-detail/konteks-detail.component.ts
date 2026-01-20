import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  HttpClient,
  HttpClientModule,
  HttpHeaders,
  HttpParams,
} from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal.component';

type Pagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

type RiskCategory = {
  id: string;
  konteksId: string;
  name: string;
  description: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  konteks?: {
    id: string;
    name: string;
    code: string;
    periodStart?: number;
    periodEnd?: number;
    isActive?: boolean;
  };
};

type RiskCategoryResponse = {
  message: string;
  data: RiskCategory[];
  pagination: Pagination;
};

type LikelihoodScale = {
  id: string;
  riskCategoryId: string;
  level: number;
  label: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  riskCategory?: {
    id: string;
    name: string;
    order: number;
    konteks?: {
      id: string;
      name: string;
      code: string;
      periodStart: number;
      periodEnd: number;
      isActive: boolean;
    };
  };
};

type LikelihoodResponse = {
  message: string;
  data: LikelihoodScale[];
  pagination: Pagination;
};

type TabKey = 'RISK_CATEGORY' | 'RISK_IMPACT' | 'LIKELIHOOD' | 'RISK_MATRIX';

type CreateRiskCategoryPayload = {
  name: string;
  description: string;
  order: number;
};

type UpdateRiskCategoryPayload = {
  name: string;
  description: string;
  order: number;
};

type CreateLikelihoodPayload = {
  level: number;
  label: string;
  description: string;
};

type UpdateLikelihoodPayload = {
  level: number;
  label: string;
  description: string;
};

// ===================== KONTEKS (EDIT) =====================
type KonteksItem = {
  id: string;
  name: string;
  code: string;
  description: string;
  periodStart: number;
  periodEnd: number;
  matrixSize: number;
  riskAppetiteLevel: string;
  riskAppetiteDescription: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    riskCategories: number;
    riskMatrices: number;
  };
};

type KonteksResponse = {
  message: string;
  data: KonteksItem[];
  pagination: Pagination;
};

type UpdateKonteksPayload = {
  name: string;
  code: string;
  description: string;
  periodStart: number;
  periodEnd: number;
  matrixSize: number;
  riskAppetiteLevel: string;
  riskAppetiteDescription: string;
  isActive: boolean;
};

@Component({
  selector: 'app-konteks-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, ConfirmModalComponent],
  templateUrl: './konteks-detail.component.html',
  styleUrl: './konteks-detail.component.scss',
})
export class KonteksDetailComponent implements OnInit {
  private baseUrl = 'http://api.dev.simulasibimtekd31.com';

  loading = false;
  errorMsg = '';

  // hint khusus likelihood kosong (bukan error)
  lkEmptyHint = '';

  konteksId = '';

  // header konteks
  konteksName = '';
  konteksCode = '';
  periodStart?: number;
  periodEnd?: number;

  // placeholders / info konteks
  matrixSize?: number;
  riskAppetiteLevel?: string;
  riskAppetiteDesc?: string;

  activeTab: TabKey = 'RISK_CATEGORY';

  // toolbar controls
  qSearch = '';
  fGroup = 'Strategis';
  groupOptions = ['Strategis', 'Operasional', 'Lainnya'];

  // Risk Category
  rawRiskCategories: RiskCategory[] = [];
  riskCategories: RiskCategory[] = [];
  rcPagination: Pagination | null = null;
  rcPage = 1;
  rcLimit = 10;

  // Likelihood
  selectedRiskCategoryId = '';
  likelihoods: LikelihoodScale[] = [];
  lkPagination: Pagination | null = null;
  lkPage = 1;
  lkLimit = 10;

  // MODAL: Risk Category
  showRCModal = false;
  rcModalMode: 'CREATE' | 'EDIT' = 'CREATE';
  rcError = '';
  rcForm = {
    id: '',
    name: '',
    description: '',
    order: 1,
  };

  // MODAL: Likelihood
  showLKModal = false;
  lkModalMode: 'CREATE' | 'EDIT' = 'CREATE';
  lkError = '';
  lkForm = {
    id: '',
    level: 1,
    label: '',
    description: '',
  };

  // ===================== MODAL: Edit Konteks =====================
  konteksDetail: KonteksItem | null = null;

  showKonteksModal = false;
  konteksModalError = '';

  confirmOpen = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmDetails: string[] = [];
  confirmConfirmText = 'OK';
  confirmShowCancel = true;
  confirmTone: 'danger' | 'primary' | 'neutral' = 'danger';
  confirmAction: 'delete-rc' | 'delete-lk' | 'info' | null = null;
  pendingRiskCategory: RiskCategory | null = null;
  pendingLikelihood: LikelihoodScale | null = null;

  appetiteOptions = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

  konteksForm: UpdateKonteksPayload = {
    name: '',
    code: '',
    description: '',
    periodStart: 2026,
    periodEnd: 2027,
    matrixSize: 5,
    riskAppetiteLevel: 'HIGH',
    riskAppetiteDescription: '',
    isActive: false,
  };

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.konteksId = this.route.snapshot.paramMap.get('konteksId') || '';
    if (!this.konteksId) {
      this.errorMsg = 'Konteks ID tidak ditemukan.';
      return;
    }

    this.fetchRiskCategories(true);
    this.fetchKonteksDetail();
  }

  back(): void {
    this.router.navigate(['/auth/konteks']);
  }

  // ===================== Helpers =====================
  private normalizePagination(
    p: Pagination | null | undefined
  ): Pagination | null {
    if (!p) return null;
    return {
      ...p,
      page: Math.max(1, Number(p.page || 1)),
      limit: Math.max(1, Number(p.limit || 10)),
      totalItems: Math.max(0, Number(p.totalItems || 0)),
      totalPages: Math.max(1, Number(p.totalPages || 0)), // ✅ anti 0
      hasNextPage: !!p.hasNextPage,
      hasPrevPage: !!p.hasPrevPage,
    };
  }

  private ensureSelectedCategoryValid(): void {
    if (!this.rawRiskCategories?.length) {
      this.selectedRiskCategoryId = '';
      return;
    }

    const stillExists = this.rawRiskCategories.some(
      (x) => x.id === this.selectedRiskCategoryId
    );
    if (!this.selectedRiskCategoryId || !stillExists) {
      this.selectedRiskCategoryId = this.rawRiskCategories[0].id;
    }
  }

  setTab(t: TabKey): void {
    this.activeTab = t;

    if (t === 'LIKELIHOOD') {
      this.ensureSelectedCategoryValid();
      if (this.selectedRiskCategoryId) this.fetchLikelihood(true);
    }
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

  // ===================== KONTEKS: GET LIST lalu ambil by id =====================
  fetchKonteksDetail(): void {
    const headers = this.buildHeaders();
    if (!headers) {
      this.errorMsg = 'Token tidak ditemukan. Silakan login ulang.';
      return;
    }

    // jangan overwrite loading besar kalau user lagi edit modal, tapi aman
    this.loading = true;
    this.errorMsg = '';

    const params = new HttpParams().set('page', '1').set('limit', '50');

    this.http
      .get<KonteksResponse>(`${this.baseUrl}/konteks`, { headers, params })
      .subscribe({
        next: (res) => {
          const list = res.data ?? [];
          const found = list.find((x) => x.id === this.konteksId) || null;

          this.konteksDetail = found;

          if (found) {
            this.konteksName = found.name ?? this.konteksName;
            this.konteksCode = found.code ?? this.konteksCode;
            this.periodStart = found.periodStart;
            this.periodEnd = found.periodEnd;

            this.matrixSize = found.matrixSize;
            this.riskAppetiteLevel = found.riskAppetiteLevel;
            this.riskAppetiteDesc = found.riskAppetiteDescription;
          }

          this.loading = false;
        },
        error: (err) => {
          console.error('Error fetch konteks list:', err);
          this.loading = false;

          if (err?.status === 401) {
            this.errorMsg =
              'HTTP 401: Token tidak ada/invalid. Pastikan accessToken tersedia di localStorage.';
            return;
          }
          this.errorMsg = `Gagal fetch konteks (HTTP ${
            err?.status || 'unknown'
          }).`;
        },
      });
  }

  // ===================== KONTEKS: EDIT MODAL =====================
  openEditKonteks(): void {
    this.konteksModalError = '';

    // jika belum ada, tetap bisa buka modal dengan fallback header
    const k = this.konteksDetail;

    if (k) {
      this.konteksForm = {
        name: k.name ?? '',
        code: k.code ?? '',
        description: k.description ?? '',
        periodStart: Number(k.periodStart ?? 2026),
        periodEnd: Number(k.periodEnd ?? 2027),
        matrixSize: Number(k.matrixSize ?? 5),
        riskAppetiteLevel: k.riskAppetiteLevel ?? 'HIGH',
        riskAppetiteDescription: k.riskAppetiteDescription ?? '',
        isActive: !!k.isActive,
      };
    } else {
      this.konteksForm = {
        name: this.konteksName || '',
        code: this.konteksCode || '',
        description: '',
        periodStart: Number(this.periodStart ?? 2026),
        periodEnd: Number(this.periodEnd ?? 2027),
        matrixSize: Number(this.matrixSize ?? 5),
        riskAppetiteLevel: this.riskAppetiteLevel || 'HIGH',
        riskAppetiteDescription: this.riskAppetiteDesc || '',
        isActive: false,
      };
    }

    this.showKonteksModal = true;
  }

  closeKonteksModal(): void {
    this.showKonteksModal = false;
    this.konteksModalError = '';
  }

  saveKonteks(): void {
    this.konteksModalError = '';

    if (!this.konteksId) {
      this.konteksModalError = 'Konteks ID tidak ditemukan.';
      return;
    }
    if (!this.konteksForm.name.trim()) {
      this.konteksModalError = 'Nama wajib diisi.';
      return;
    }
    if (!this.konteksForm.code.trim()) {
      this.konteksModalError = 'Code wajib diisi.';
      return;
    }
    if (!this.konteksForm.periodStart || !this.konteksForm.periodEnd) {
      this.konteksModalError = 'Periode wajib diisi.';
      return;
    }
    if (Number(this.konteksForm.periodEnd) < Number(this.konteksForm.periodStart)) {
      this.konteksModalError = 'Period End tidak boleh lebih kecil dari Period Start.';
      return;
    }
    const headers = this.buildHeaders();
    if (!headers) {
      this.konteksModalError = 'Token tidak ditemukan. Silakan login ulang.';
      return;
    }

    const payload: UpdateKonteksPayload = {
      name: this.konteksForm.name.trim(),
      code: this.konteksForm.code.trim(),
      description: (this.konteksForm.description ?? '').trim(),
      periodStart: Number(this.konteksForm.periodStart),
      periodEnd: Number(this.konteksForm.periodEnd),
      matrixSize: Number(this.konteksForm.matrixSize),
      riskAppetiteLevel: this.konteksForm.riskAppetiteLevel,
      riskAppetiteDescription: (this.konteksForm.riskAppetiteDescription ?? '').trim(),
      isActive: !!this.konteksForm.isActive,
    };

    this.loading = true;

    // ✅ asumsi endpoint update konteks:
    // PATCH /konteks/:id
    this.http
      .patch<any>(`${this.baseUrl}/konteks/${this.konteksId}`, payload, { headers })
      .subscribe({
        next: () => {
          this.loading = false;
          this.closeKonteksModal();
          this.fetchKonteksDetail();
        },
        error: (e) => {
          this.loading = false;
          this.konteksModalError =
            e?.error?.errors || e?.error?.message || 'Gagal update konteks.';
          console.error('[PATCH /konteks/:id] error:', e);
        },
      });
  }

  // ===================== CONFIRM MODAL =====================
  private openConfirmModal(opts: {
    title: string;
    message: string;
    details?: string[];
    confirmText?: string;
    showCancel?: boolean;
    tone?: 'danger' | 'primary' | 'neutral';
    action?: 'delete-rc' | 'delete-lk' | 'info';
  }): void {
    this.confirmTitle = opts.title;
    this.confirmMessage = opts.message;
    this.confirmDetails = opts.details ?? [];
    this.confirmConfirmText = opts.confirmText ?? 'OK';
    this.confirmShowCancel = opts.showCancel ?? true;
    this.confirmTone = opts.tone ?? 'danger';
    this.confirmAction = opts.action ?? null;
    this.confirmOpen = true;
  }

  private openInfoModal(title: string, message: string): void {
    this.openConfirmModal({
      title,
      message,
      confirmText: 'OK',
      showCancel: false,
      tone: 'primary',
      action: 'info',
    });
  }

  closeConfirmModal(): void {
    this.confirmOpen = false;
    this.confirmAction = null;
    this.pendingRiskCategory = null;
    this.pendingLikelihood = null;
  }

  confirmActionProceed(): void {
    if (this.confirmAction === 'delete-rc' && this.pendingRiskCategory) {
      const target = this.pendingRiskCategory;
      this.closeConfirmModal();
      this.performDeleteRC(target);
      return;
    }

    if (this.confirmAction === 'delete-lk' && this.pendingLikelihood) {
      const target = this.pendingLikelihood;
      this.closeConfirmModal();
      this.performDeleteLK(target);
      return;
    }

    this.closeConfirmModal();
  }

  // ===================== RISK CATEGORY: GET =====================
  private rcParams(resetPage: boolean): HttpParams {
    if (resetPage) this.rcPage = 1;

    return new HttpParams()
      .set('page', String(this.rcPage))
      .set('limit', String(this.rcLimit));
  }

  fetchRiskCategories(resetPage: boolean): void {
    this.loading = true;
    this.errorMsg = '';

    const headers = this.buildHeaders();
    const params = this.rcParams(resetPage);

    this.http
      .get<RiskCategoryResponse>(
        `${this.baseUrl}/konteks/${this.konteksId}/risk-categories`,
        { headers, params }
      )
      .subscribe({
        next: (res) => {
          const raw = res.data ?? [];
          this.rawRiskCategories = raw;
          this.rcPagination = this.normalizePagination(res.pagination ?? null);

          // header konteks dari raw (fallback)
          const kInfo = raw?.[0]?.konteks;
          if (kInfo) {
            this.konteksName = kInfo.name ?? this.konteksName;
            this.konteksCode = kInfo.code ?? this.konteksCode;
            this.periodStart = kInfo.periodStart;
            this.periodEnd = kInfo.periodEnd;
          }

          this.ensureSelectedCategoryValid();
          this.applyRCFilters();

          // kalau sedang di tab likelihood, refresh likelihood juga
          if (this.activeTab === 'LIKELIHOOD' && this.selectedRiskCategoryId) {
            this.fetchLikelihood(true);
          }

          this.loading = false;
        },
        error: (err) => {
          console.error('Error fetch risk categories:', err);
          this.loading = false;

          this.rawRiskCategories = [];
          this.riskCategories = [];
          this.rcPagination = null;

          if (err?.status === 401) {
            this.errorMsg =
              'HTTP 401: Token tidak ada/invalid. Pastikan accessToken tersedia di localStorage.';
            return;
          }

          this.errorMsg = `Gagal fetch risk categories (HTTP ${
            err?.status || 'unknown'
          }).`;
        },
      });
  }

  applyRCFilters(): void {
    const q = this.qSearch.trim().toLowerCase();
    this.riskCategories = q
      ? (this.rawRiskCategories ?? []).filter((x) =>
          (x.name ?? '').toLowerCase().includes(q)
        )
      : [...(this.rawRiskCategories ?? [])];
  }

  onSearchKeyup(): void {
    this.applyRCFilters();
  }

  rcPrev(): void {
    if (!this.rcPagination?.hasPrevPage) return;
    this.rcPage = Math.max(1, this.rcPage - 1);
    this.fetchRiskCategories(false);
  }

  rcNext(): void {
    if (!this.rcPagination?.hasNextPage) return;
    this.rcPage = this.rcPage + 1;
    this.fetchRiskCategories(false);
  }

  // ===================== RISK CATEGORY: CREATE/EDIT =====================
  openCreateRC(): void {
    this.rcError = '';
    this.rcModalMode = 'CREATE';
    this.rcForm = {
      id: '',
      name: '',
      description: '',
      order: this.suggestNextOrder(),
    };
    this.showRCModal = true;
  }

  private suggestNextOrder(): number {
    const maxOrder =
      (this.rawRiskCategories ?? []).reduce(
        (m, x) => Math.max(m, x.order ?? 0),
        0
      ) || 0;
    return maxOrder + 1;
  }

  closeRCModal(): void {
    this.showRCModal = false;
    this.rcError = '';
  }

  openEditRC(c: RiskCategory): void {
    this.rcError = '';
    this.rcModalMode = 'EDIT';
    this.rcForm = {
      id: c.id,
      name: c.name ?? '',
      description: c.description ?? '',
      order: c.order ?? 1,
    };
    this.showRCModal = true;
  }

  saveRC(): void {
    this.rcError = '';

    if (!this.rcForm.name.trim()) {
      this.rcError = 'Nama kategori wajib diisi.';
      return;
    }

    const order = Number(this.rcForm.order);
    if (!order || order < 1) {
      this.rcError = 'Order wajib diisi dan minimal 1.';
      return;
    }

    const headers = this.buildHeaders();
    if (!headers) {
      this.rcError = 'Token tidak ditemukan. Silakan login ulang.';
      return;
    }

    const payload: CreateRiskCategoryPayload | UpdateRiskCategoryPayload = {
      name: this.rcForm.name.trim(),
      description: (this.rcForm.description ?? '').trim(),
      order,
    };

    this.loading = true;

    if (this.rcModalMode === 'CREATE') {
      this.http
        .post<any>(
          `${this.baseUrl}/konteks/${this.konteksId}/risk-categories`,
          payload,
          { headers }
        )
        .subscribe({
          next: () => {
            this.loading = false;
            this.closeRCModal();
            this.fetchRiskCategories(true);
          },
          error: (e) => {
            this.loading = false;
            this.rcError =
              e?.error?.errors || e?.error?.message || 'Gagal membuat kategori.';
            console.error('[POST risk-categories] error:', e);
          },
        });
      return;
    }

    this.http
      .patch<any>(
        `${this.baseUrl}/konteks/${this.konteksId}/risk-categories/${this.rcForm.id}`,
        payload,
        { headers }
      )
      .subscribe({
        next: () => {
          this.loading = false;
          this.closeRCModal();
          this.fetchRiskCategories(false);
        },
        error: (e) => {
          this.loading = false;
          this.rcError =
            e?.error?.errors || e?.error?.message || 'Gagal update kategori.';
          console.error('[PATCH risk-categories/:id] error:', e);
        },
      });
  }

  // ===================== RISK CATEGORY: DELETE =====================
  deleteRC(c: RiskCategory): void {
    this.pendingRiskCategory = c;
    this.openConfirmModal({
      title: 'Hapus Kategori',
      message: `Hapus kategori "${c.name}"?`,
      confirmText: 'Hapus',
      tone: 'danger',
      action: 'delete-rc',
    });
  }

  private performDeleteRC(c: RiskCategory): void {
    const headers = this.buildHeaders();
    if (!headers) {
      this.openInfoModal('Token tidak ditemukan', 'Silakan login ulang.');
      return;
    }

    this.loading = true;

    this.http
      .delete<any>(
        `${this.baseUrl}/konteks/${this.konteksId}/risk-categories/${c.id}`,
        { headers }
      )
      .subscribe({
        next: () => {
          this.loading = false;

          if (this.selectedRiskCategoryId === c.id) {
            this.selectedRiskCategoryId = '';
            this.likelihoods = [];
            this.lkPagination = null;
            this.lkEmptyHint = '';
          }

          this.fetchRiskCategories(true);
        },
        error: (e) => {
          this.loading = false;
          this.openInfoModal(
            'Gagal hapus kategori',
            e?.error?.errors || e?.error?.message || 'Terjadi kesalahan.'
          );
          console.error('[DELETE risk-categories/:id] error:', e);
        },
      });
  }

  // ===================== LIKELIHOOD: GET =====================
  private lkParams(resetPage: boolean): HttpParams {
    if (resetPage) this.lkPage = 1;

    return new HttpParams()
      .set('page', String(this.lkPage))
      .set('limit', String(this.lkLimit));
  }

  onChangeCategoryForLikelihood(): void {
    this.fetchLikelihood(true);
  }

  fetchLikelihood(resetPage: boolean): void {
    if (!this.selectedRiskCategoryId) return;

    this.loading = true;
    this.errorMsg = '';
    this.lkEmptyHint = '';

    const headers = this.buildHeaders();
    const params = this.lkParams(resetPage);

    this.http
      .get<LikelihoodResponse>(
        `${this.baseUrl}/konteks/${this.konteksId}/risk-categories/${this.selectedRiskCategoryId}/likelihood-scales`,
        { headers, params }
      )
      .subscribe({
        next: (res) => {
          this.likelihoods = res.data ?? [];
          this.lkPagination = this.normalizePagination(res.pagination ?? null);

          // header konteks fallback (dari likelihood)
          const kInfo = this.likelihoods?.[0]?.riskCategory?.konteks;
          if (kInfo) {
            this.konteksName = kInfo.name ?? this.konteksName;
            this.konteksCode = kInfo.code ?? this.konteksCode;
            this.periodStart = kInfo.periodStart;
            this.periodEnd = kInfo.periodEnd;
          }

          if (this.likelihoods.length === 0) {
            const selected = this.rawRiskCategories.find(
              (x) => x.id === this.selectedRiskCategoryId
            );
            const name = selected?.name ? `"${selected.name}"` : 'kategori ini';
            this.lkEmptyHint = `Likelihood untuk ${name} belum dibuat. Klik "+ Tambah Likelihood" atau "Generate 1-5".`;
          }

          this.loading = false;
        },
        error: (err) => {
          console.error('Error fetch likelihood:', err);
          this.loading = false;
          this.likelihoods = [];
          this.lkPagination = null;
          this.lkEmptyHint = '';

          if (err?.status === 401) {
            this.errorMsg =
              'HTTP 401: Token tidak ada/invalid. Pastikan accessToken tersedia di localStorage.';
            return;
          }

          this.errorMsg =
            err?.error?.errors ||
            err?.error?.message ||
            `Gagal fetch likelihood scales (HTTP ${err?.status || 'unknown'}).`;
        },
      });
  }

  lkPrev(): void {
    if (!this.lkPagination?.hasPrevPage) return;
    this.lkPage = Math.max(1, this.lkPage - 1);
    this.fetchLikelihood(false);
  }

  lkNext(): void {
    if (!this.lkPagination?.hasNextPage) return;
    this.lkPage = this.lkPage + 1;
    this.fetchLikelihood(false);
  }

  // ===================== LIKELIHOOD: CREATE/EDIT/DELETE =====================
  openCreateLK(): void {
    this.lkError = '';
    this.lkModalMode = 'CREATE';
    this.lkForm = { id: '', level: 1, label: '', description: '' };
    this.showLKModal = true;
  }

  openEditLK(l: LikelihoodScale): void {
    this.lkError = '';
    this.lkModalMode = 'EDIT';
    this.lkForm = {
      id: l.id,
      level: Number(l.level ?? 1),
      label: l.label ?? '',
      description: l.description ?? '',
    };
    this.showLKModal = true;
  }

  closeLKModal(): void {
    this.showLKModal = false;
    this.lkError = '';
  }

  saveLK(): void {
    this.lkError = '';

    if (!this.selectedRiskCategoryId) {
      this.lkError = 'Pilih kategori terlebih dahulu.';
      return;
    }

    const level = Number(this.lkForm.level);
    if (!level || level < 1) {
      this.lkError = 'Level wajib diisi dan minimal 1.';
      return;
    }

    if (!this.lkForm.label.trim()) {
      this.lkError = 'Label wajib diisi.';
      return;
    }

    const headers = this.buildHeaders();
    if (!headers) {
      this.lkError = 'Token tidak ditemukan. Silakan login ulang.';
      return;
    }

    const payload: CreateLikelihoodPayload | UpdateLikelihoodPayload = {
      level,
      label: this.lkForm.label.trim(),
      description: (this.lkForm.description ?? '').trim(),
    };

    this.loading = true;

    if (this.lkModalMode === 'CREATE') {
      this.http
        .post<any>(
          `${this.baseUrl}/konteks/${this.konteksId}/risk-categories/${this.selectedRiskCategoryId}/likelihood-scales`,
          payload,
          { headers }
        )
        .subscribe({
          next: () => {
            this.loading = false;
            this.closeLKModal();
            this.fetchLikelihood(true);
          },
          error: (e) => {
            this.loading = false;
            this.lkError =
              e?.error?.errors || e?.error?.message || 'Gagal membuat likelihood.';
            console.error('[POST likelihood-scales] error:', e);
          },
        });
      return;
    }

    this.http
      .patch<any>(
        `${this.baseUrl}/konteks/${this.konteksId}/risk-categories/${this.selectedRiskCategoryId}/likelihood-scales/${this.lkForm.id}`,
        payload,
        { headers }
      )
      .subscribe({
        next: () => {
          this.loading = false;
          this.closeLKModal();
          this.fetchLikelihood(false);
        },
        error: (e) => {
          this.loading = false;
          this.lkError =
            e?.error?.errors || e?.error?.message || 'Gagal update likelihood.';
          console.error('[PATCH likelihood-scales/:id] error:', e);
        },
      });
  }

  deleteLK(l: LikelihoodScale): void {
    this.pendingLikelihood = l;
    this.openConfirmModal({
      title: 'Hapus Likelihood',
      message: `Hapus likelihood "${l.label}" (level ${l.level})?`,
      confirmText: 'Hapus',
      tone: 'danger',
      action: 'delete-lk',
    });
  }

  private performDeleteLK(l: LikelihoodScale): void {
    if (!this.selectedRiskCategoryId) return;

    const headers = this.buildHeaders();
    if (!headers) {
      this.openInfoModal('Token tidak ditemukan', 'Silakan login ulang.');
      return;
    }

    this.loading = true;

    this.http
      .delete<any>(
        `${this.baseUrl}/konteks/${this.konteksId}/risk-categories/${this.selectedRiskCategoryId}/likelihood-scales/${l.id}`,
        { headers }
      )
      .subscribe({
        next: () => {
          this.loading = false;
          this.fetchLikelihood(false);
        },
        error: (e) => {
          this.loading = false;
          this.openInfoModal(
            'Gagal hapus likelihood',
            e?.error?.errors || e?.error?.message || 'Terjadi kesalahan.'
          );
          console.error('[DELETE likelihood-scales/:id] error:', e);
        },
      });
  }

  // ===================== BONUS: Generate default Likelihood 1-5 =====================
  generateDefaultLK(): void {
    if (!this.selectedRiskCategoryId) return;

    const headers = this.buildHeaders();
    if (!headers) {
      this.errorMsg = 'Token tidak ditemukan. Silakan login ulang.';
      return;
    }

    const defaults: CreateLikelihoodPayload[] = [
      { level: 1, label: 'Sangat Jarang', description: 'Kemungkinan terjadi < 5% atau hampir tidak pernah terjadi' },
      { level: 2, label: 'Jarang', description: 'Kemungkinan terjadi 5-25% atau jarang terjadi' },
      { level: 3, label: 'Mungkin', description: 'Kemungkinan terjadi 25-50% atau mungkin terjadi' },
      { level: 4, label: 'Sering', description: 'Kemungkinan terjadi 50-75% atau sering terjadi' },
      { level: 5, label: 'Sangat Sering', description: 'Kemungkinan terjadi > 75% atau hampir pasti terjadi' },
    ];

    const url =
      `${this.baseUrl}/konteks/${this.konteksId}` +
      `/risk-categories/${this.selectedRiskCategoryId}` +
      `/likelihood-scales`;

    this.loading = true;
    this.errorMsg = '';
    this.lkEmptyHint = '';

    const reqs = defaults.map((p) => this.http.post<any>(url, p, { headers }));

    forkJoin(reqs).subscribe({
      next: () => {
        this.loading = false;
        this.fetchLikelihood(true);
      },
      error: (e) => {
        this.loading = false;
        this.errorMsg =
          e?.error?.errors || e?.error?.message || 'Gagal generate likelihood 1-5.';
        console.error('[generateDefaultLK] error:', e);
      },
    });
  }
}
