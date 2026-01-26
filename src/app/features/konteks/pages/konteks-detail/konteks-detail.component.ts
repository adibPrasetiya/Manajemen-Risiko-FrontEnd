import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal.component';
import { KonteksService } from '../../../../core/services/konteks.service';
import { UiService } from '../../../../core/services/ui.service';
import {
  Pagination,
  KonteksItem,
  KonteksStatus,
  RiskCategory,
  LikelihoodScale,
  ImpactScale,
  RiskLevel,
  RiskMatrixItem,
  RiskMatrixEntry,
  CreateRiskMatrixBulkPayload,
  RiskLevelConfig,
  KonteksFormModel,
  UpdateKonteksPayload,
  CreateRiskCategoryPayload,
  UpdateRiskCategoryPayload,
  CreateLikelihoodPayload,
  UpdateLikelihoodPayload,
  CreateImpactPayload,
  UpdateImpactPayload,
  TabKey,
} from '../../../../core/models/konteks.model';
import { extractErrorMessage, extractFieldErrors } from '../../../../core/utils/error-utils';

type KonteksItemRaw = Omit<KonteksItem, 'status'> & {
  status?: string;
  isActive?: boolean;
};

@Component({
  selector: 'app-konteks-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmModalComponent],
  templateUrl: './konteks-detail.component.html',
  styleUrl: './konteks-detail.component.scss',
})
export class KonteksDetailComponent implements OnInit {
  loading = false;
  errorMsg = '';

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
  lkEmptyHint = '';

  // Impact
  impactScales: ImpactScale[] = [];
  imPagination: Pagination | null = null;
  imPage = 1;
  imLimit = 10;
  imEmptyHint = '';

  // MODAL: Risk Category
  showRCModal = false;
  rcModalMode: 'CREATE' | 'EDIT' = 'CREATE';
  rcErrors: {
    name?: string;
    description?: string;
    order?: string;
  } = {};
  rcForm = {
    id: '',
    name: '',
    description: '',
    order: 1,
  };

  // MODAL: Likelihood
  showLKModal = false;
  lkModalMode: 'CREATE' | 'EDIT' = 'CREATE';
  lkErrors: {
    category?: string;
    level?: string;
    label?: string;
    description?: string;
  } = {};
  lkForm = {
    id: '',
    level: 1,
    label: '',
    description: '',
  };

  // MODAL: Impact
  showIMModal = false;
  imModalMode: 'CREATE' | 'EDIT' = 'CREATE';
  imErrors: {
    category?: string;
    level?: string;
    label?: string;
    description?: string;
  } = {};
  imForm = {
    id: '',
    level: 1,
    label: '',
    description: '',
  };

  // ===================== MODAL: Edit Konteks =====================
  konteksDetail: KonteksItem | null = null;

  showKonteksModal = false;
  konteksModalErrors: {
    name?: string;
    description?: string;
    riskAppetiteLevel?: string;
    riskAppetiteDescription?: string;
  } = {};

  confirmOpen = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmDetails: string[] = [];
  confirmConfirmText = 'OK';
  confirmShowCancel = true;
  confirmTone: 'danger' | 'primary' | 'neutral' = 'danger';
  confirmAction: 'delete-rc' | 'delete-lk' | 'delete-im' | 'info' | 'discard-matrix-changes' | 'delete-matrix' | null = null;
  pendingRiskCategory: RiskCategory | null = null;
  pendingLikelihood: LikelihoodScale | null = null;
  pendingImpact: ImpactScale | null = null;

  appetiteOptions = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

  // ===================== RISK MATRIX STATE =====================
  riskLevelOptions: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  savedRiskMatrices: RiskMatrixItem[] = [];
  matrixState: Map<string, RiskLevel> = new Map();
  matrixEditMode = false;
  matrixLoading = false;
  matrixSaving = false;
  matrixHasChanges = false;
  matrixErrorMsg = '';
  matrixDeleting = false;

  // Configuration Modal
  showMatrixConfigModal = false;
  matrixConfigPreview: Map<string, RiskLevel> = new Map();
  riskLevelConfigs: RiskLevelConfig[] = [
    { level: 'LOW', label: 'Low (Hijau)', minScore: 1, maxScore: 5, color: '#22c55e' },
    { level: 'MEDIUM', label: 'Medium (Kuning)', minScore: 6, maxScore: 10, color: '#f59e0b' },
    { level: 'HIGH', label: 'High (Oranye)', minScore: 11, maxScore: 20, color: '#f97316' },
    { level: 'CRITICAL', label: 'Critical (Merah)', minScore: 21, maxScore: 25, color: '#dc2626' },
  ];

  konteksForm: KonteksFormModel = {
    name: '',
    description: '',
    riskAppetiteLevel: 'HIGH',
    riskAppetiteDescription: '',
  };

  constructor(
    private konteksService: KonteksService,
    private route: ActivatedRoute,
    private router: Router,
    private ui: UiService
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
    this.router.navigate(['/konteks-management']);
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
      totalPages: Math.max(1, Number(p.totalPages || 0)),
      hasNextPage: !!p.hasNextPage,
      hasPrevPage: !!p.hasPrevPage,
    };
  }
  private normalizeStatus(status?: string, isActive?: boolean): KonteksStatus {
    const normalized = String(status ?? '').toUpperCase();
    if (normalized === 'ACTIVE' || normalized === 'INACTIVE') {
      return normalized as KonteksStatus;
    }
    return isActive ? 'ACTIVE' : 'INACTIVE';
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

    if (t === 'RISK_IMPACT') {
      this.ensureSelectedCategoryValid();
      if (this.selectedRiskCategoryId) this.fetchImpactScales(true);
    }

    if (t === 'RISK_MATRIX') {
      this.fetchRiskMatrices();
    }
  }

  // ===================== KONTEKS: GET BY ID =====================
  fetchKonteksDetail(): void {
    this.loading = true;
    this.errorMsg = '';

    this.konteksService.getKonteksById(this.konteksId).subscribe({
      next: (res) => {
        const found = res.data ?? null;
        this.konteksDetail = found
          ? {
              ...found,
              status: this.normalizeStatus(
                (found as KonteksItemRaw).status,
                (found as KonteksItemRaw).isActive
              ),
            }
          : null;

        if (this.konteksDetail) {
          this.konteksName = this.konteksDetail.name ?? this.konteksName;
          this.konteksCode = this.konteksDetail.code ?? this.konteksCode;
          this.periodStart = this.konteksDetail.periodStart;
          this.periodEnd = this.konteksDetail.periodEnd;

          this.matrixSize = this.konteksDetail.matrixSize;
          this.riskAppetiteLevel = this.konteksDetail.riskAppetiteLevel;
          this.riskAppetiteDesc = this.konteksDetail.riskAppetiteDescription;
        }

        if (this.activeTab === 'RISK_MATRIX') {
          this.fetchRiskMatrices();
        }

        this.loading = false;
      },
      error: (err) => {
        this.loading = false;

        if (err?.status === 401) {
          this.errorMsg =
            'HTTP 401: Token tidak ada/invalid. Pastikan accessToken tersedia di localStorage.';
          this.ui.error(this.errorMsg);
          return;
        }
        this.errorMsg = `Gagal fetch konteks (HTTP ${
          err?.status || 'unknown'
        }).`;
        this.ui.error(this.errorMsg);
      },
    });
  }

  // ===================== KONTEKS: EDIT MODAL =====================
  openEditKonteks(): void {
    this.konteksModalErrors = {};

    const k = this.konteksDetail;

    if (k) {
      this.konteksForm = {
        name: k.name ?? '',
        description: k.description ?? '',
        riskAppetiteLevel: k.riskAppetiteLevel ?? 'HIGH',
        riskAppetiteDescription: k.riskAppetiteDescription ?? '',
      };
    } else {
      this.konteksForm = {
        name: this.konteksName || '',
        description: '',
        riskAppetiteLevel: this.riskAppetiteLevel || 'HIGH',
        riskAppetiteDescription: this.riskAppetiteDesc || '',
      };
    }

    this.showKonteksModal = true;
  }

  closeKonteksModal(): void {
    this.showKonteksModal = false;
    this.konteksModalErrors = {};
  }

  saveKonteks(): void {
    this.konteksModalErrors = {};

    if (!this.konteksId) {
      this.ui.error('Konteks ID tidak ditemukan.');
      return;
    }
    if (!this.konteksForm.name.trim()) {
      this.konteksModalErrors.name = 'Nama wajib diisi.';
      return;
    }

    const payload: UpdateKonteksPayload = {
      name: this.konteksForm.name.trim(),
      description: (this.konteksForm.description ?? '').trim(),
      riskAppetiteLevel: this.konteksForm.riskAppetiteLevel,
      riskAppetiteDescription: (this.konteksForm.riskAppetiteDescription ?? '').trim(),
    };

    this.loading = true;

    this.konteksService.updateKonteks(this.konteksId, payload).subscribe({
      next: () => {
        this.loading = false;
        this.closeKonteksModal();
        this.fetchKonteksDetail();
        this.ui.success('Berhasil menyimpan perubahan konteks.');
      },
      error: (e) => {
        this.loading = false;
        const fieldErrors = extractFieldErrors(e);
        if (Object.keys(fieldErrors).length) {
          this.konteksModalErrors = fieldErrors;
        }
        this.ui.error(extractErrorMessage(e) || 'Gagal menyimpan perubahan konteks.');
      },
    });
  }

  // ===================== KONTEKS: ACTIVATE/DEACTIVATE =====================
  activateKonteks(): void {
    if (!this.konteksId) return;

    this.loading = true;
    this.errorMsg = '';

    this.konteksService.activateKonteks(this.konteksId).subscribe({
      next: () => {
        this.loading = false;
        this.fetchKonteksDetail();
        this.ui.success('Konteks berhasil diaktifkan.');
      },
      error: (e) => {
        this.loading = false;
        this.ui.error(extractErrorMessage(e) || 'Gagal mengaktifkan konteks.');
      },
    });
  }

  deactivateKonteks(): void {
    if (!this.konteksId) return;

    this.loading = true;
    this.errorMsg = '';

    this.konteksService.deactivateKonteks(this.konteksId).subscribe({
      next: () => {
        this.loading = false;
        this.fetchKonteksDetail();
        this.ui.success('Konteks berhasil dinonaktifkan.');
      },
      error: (e) => {
        this.loading = false;
        this.ui.error(extractErrorMessage(e) || 'Gagal menonaktifkan konteks.');
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
    action?: 'delete-rc' | 'delete-lk' | 'delete-im' | 'info' | 'discard-matrix-changes' | 'delete-matrix';
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
    this.pendingImpact = null;
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

    if (this.confirmAction === 'delete-im' && this.pendingImpact) {
      const target = this.pendingImpact;
      this.closeConfirmModal();
      this.performDeleteIM(target);
      return;
    }

    if (this.confirmAction === 'discard-matrix-changes') {
      this.closeConfirmModal();
      this.discardMatrixChanges();
      return;
    }

    if (this.confirmAction === 'delete-matrix') {
      this.closeConfirmModal();
      this.performDeleteMatrix();
      return;
    }

    this.closeConfirmModal();
  }

  // ===================== RISK CATEGORY: GET =====================
  fetchRiskCategories(resetPage: boolean): void {
    if (resetPage) this.rcPage = 1;

    this.loading = true;
    this.errorMsg = '';

    this.konteksService
      .getRiskCategories(this.konteksId, { page: this.rcPage, limit: this.rcLimit })
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

          if (this.activeTab === 'RISK_IMPACT' && this.selectedRiskCategoryId) {
            this.fetchImpactScales(true);
          }

          this.loading = false;
        },
        error: (err) => {
          this.loading = false;

          this.rawRiskCategories = [];
          this.riskCategories = [];
          this.rcPagination = null;

          if (err?.status === 401) {
            this.errorMsg =
              'HTTP 401: Token tidak ada/invalid. Pastikan accessToken tersedia di localStorage.';
            this.ui.error(this.errorMsg);
            return;
          }

          this.errorMsg = `Gagal fetch risk categories (HTTP ${
            err?.status || 'unknown'
          }).`;
          this.ui.error(this.errorMsg);
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
    this.rcErrors = {};
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
    this.rcErrors = {};
  }

  openEditRC(c: RiskCategory): void {
    this.rcErrors = {};
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
    this.rcErrors = {};

    if (!this.rcForm.name.trim()) {
      this.rcErrors.name = 'Nama kategori wajib diisi.';
      return;
    }

    const order = Number(this.rcForm.order);
    if (!order || order < 1) {
      this.rcErrors.order = 'Order wajib diisi dan minimal 1.';
      return;
    }

    const payload: CreateRiskCategoryPayload | UpdateRiskCategoryPayload = {
      name: this.rcForm.name.trim(),
      description: (this.rcForm.description ?? '').trim(),
      order,
    };

    this.loading = true;

    if (this.rcModalMode === 'CREATE') {
      this.konteksService
        .createRiskCategory(this.konteksId, payload)
        .subscribe({
        next: () => {
          this.loading = false;
          this.closeRCModal();
          this.fetchRiskCategories(true);
          this.ui.success('Kategori risiko berhasil ditambahkan.');
        },
          error: (e) => {
            this.loading = false;
            const fieldErrors = extractFieldErrors(e);
            if (Object.keys(fieldErrors).length) {
              this.rcErrors = fieldErrors;
            }
            this.ui.error(extractErrorMessage(e) || 'Gagal menambah kategori risiko.');
          },
        });
      return;
    }

    this.konteksService
      .updateRiskCategory(this.konteksId, this.rcForm.id, payload)
      .subscribe({
      next: () => {
        this.loading = false;
        this.closeRCModal();
        this.fetchRiskCategories(false);
        this.ui.success('Kategori risiko berhasil disimpan.');
      },
      error: (e) => {
        this.loading = false;
        const fieldErrors = extractFieldErrors(e);
        if (Object.keys(fieldErrors).length) {
          this.rcErrors = fieldErrors;
        }
        this.ui.error(extractErrorMessage(e) || 'Gagal menyimpan kategori risiko.');
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
    this.loading = true;

    this.konteksService.deleteRiskCategory(this.konteksId, c.id).subscribe({
      next: () => {
        this.loading = false;

        if (this.selectedRiskCategoryId === c.id) {
          this.selectedRiskCategoryId = '';
          this.likelihoods = [];
          this.lkPagination = null;
          this.lkEmptyHint = '';
          this.impactScales = [];
          this.imPagination = null;
          this.imEmptyHint = '';
        }

        this.fetchRiskCategories(true);
        this.ui.success('Kategori risiko berhasil dihapus.');
      },
      error: (e) => {
        this.loading = false;
        this.ui.error(extractErrorMessage(e) || 'Gagal menghapus kategori risiko.');
      },
    });
  }

  // ===================== LIKELIHOOD: GET =====================
  onChangeCategoryForLikelihood(): void {
    this.fetchLikelihood(true);
  }

  fetchLikelihood(resetPage: boolean): void {
    if (!this.selectedRiskCategoryId) return;

    if (resetPage) this.lkPage = 1;

    this.loading = true;
    this.errorMsg = '';
    this.lkEmptyHint = '';

    this.konteksService
      .getLikelihoodScales(this.konteksId, this.selectedRiskCategoryId, {
        page: this.lkPage,
        limit: this.lkLimit,
      })
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
            this.lkEmptyHint = `Likelihood untuk ${name} belum dibuat. Klik "+ Tambah Likelihood".`;
          }

          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.likelihoods = [];
          this.lkPagination = null;
          this.lkEmptyHint = '';

          if (err?.status === 401) {
            this.errorMsg =
              'HTTP 401: Token tidak ada/invalid. Pastikan accessToken tersedia di localStorage.';
            this.ui.error(this.errorMsg);
            return;
          }

          this.errorMsg =
            extractErrorMessage(err) ||
            `Gagal fetch likelihood scales (HTTP ${err?.status || 'unknown'}).`;
          this.ui.error(this.errorMsg);
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
    this.lkErrors = {};
    this.lkModalMode = 'CREATE';
    this.lkForm = { id: '', level: 1, label: '', description: '' };
    this.showLKModal = true;
  }

  openEditLK(l: LikelihoodScale): void {
    this.lkErrors = {};
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
    this.lkErrors = {};
  }

  saveLK(): void {
    this.lkErrors = {};

    if (!this.selectedRiskCategoryId) {
      this.lkErrors.category = 'Pilih kategori terlebih dahulu.';
      return;
    }

    const level = Number(this.lkForm.level);
    if (!level || level < 1) {
      this.lkErrors.level = 'Level wajib diisi dan minimal 1.';
      return;
    }

    if (!this.lkForm.label.trim()) {
      this.lkErrors.label = 'Label wajib diisi.';
      return;
    }

    const payload: CreateLikelihoodPayload | UpdateLikelihoodPayload = {
      level,
      label: this.lkForm.label.trim(),
      description: (this.lkForm.description ?? '').trim(),
    };

    this.loading = true;

    if (this.lkModalMode === 'CREATE') {
      this.konteksService
        .createLikelihoodScale(this.konteksId, this.selectedRiskCategoryId, payload)
        .subscribe({
          next: () => {
            this.loading = false;
            this.closeLKModal();
            this.fetchLikelihood(true);
            this.ui.success('Likelihood berhasil ditambahkan.');
          },
          error: (e) => {
            this.loading = false;
            const fieldErrors = extractFieldErrors(e);
            if (Object.keys(fieldErrors).length) {
              this.lkErrors = fieldErrors;
            }
            this.ui.error(extractErrorMessage(e) || 'Gagal menambah likelihood.');
          },
        });
      return;
    }

    this.konteksService
      .updateLikelihoodScale(
        this.konteksId,
        this.selectedRiskCategoryId,
        this.lkForm.id,
        payload
      )
      .subscribe({
      next: () => {
        this.loading = false;
        this.closeLKModal();
        this.fetchLikelihood(false);
        this.ui.success('Likelihood berhasil disimpan.');
      },
      error: (e) => {
        this.loading = false;
        const fieldErrors = extractFieldErrors(e);
        if (Object.keys(fieldErrors).length) {
          this.lkErrors = fieldErrors;
        }
        this.ui.error(extractErrorMessage(e) || 'Gagal menyimpan likelihood.');
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

    this.loading = true;

    this.konteksService
      .deleteLikelihoodScale(this.konteksId, this.selectedRiskCategoryId, l.id)
      .subscribe({
      next: () => {
        this.loading = false;
        this.fetchLikelihood(false);
        this.ui.success('Likelihood berhasil dihapus.');
      },
      error: (e) => {
        this.loading = false;
        this.ui.error(extractErrorMessage(e) || 'Gagal menghapus likelihood.');
      },
    });
  }


  // ===================== IMPACT: GET =====================
  onChangeCategoryForImpact(): void {
    this.fetchImpactScales(true);
  }

  fetchImpactScales(resetPage: boolean): void {
    if (!this.selectedRiskCategoryId) return;

    if (resetPage) this.imPage = 1;

    this.loading = true;
    this.errorMsg = '';
    this.imEmptyHint = '';

    this.konteksService
      .getImpactScales(this.konteksId, this.selectedRiskCategoryId, {
        page: this.imPage,
        limit: this.imLimit,
      })
      .subscribe({
        next: (res) => {
          this.impactScales = res.data ?? [];
          this.imPagination = this.normalizePagination(res.pagination ?? null);

          const kInfo = this.impactScales?.[0]?.riskCategory?.konteks;
          if (kInfo) {
            this.konteksName = kInfo.name ?? this.konteksName;
            this.konteksCode = kInfo.code ?? this.konteksCode;
            this.periodStart = kInfo.periodStart;
            this.periodEnd = kInfo.periodEnd;
          }

          if (this.impactScales.length === 0) {
            const selected = this.rawRiskCategories.find(
              (x) => x.id === this.selectedRiskCategoryId
            );
            const name = selected?.name ? `"${selected.name}"` : 'kategori ini';
            this.imEmptyHint = `Impact untuk ${name} belum dibuat. Klik "+ Tambah Impact".`;
          }

          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.impactScales = [];
          this.imPagination = null;
          this.imEmptyHint = '';

          if (err?.status === 401) {
            this.errorMsg =
              'HTTP 401: Token tidak ada/invalid. Pastikan accessToken tersedia di localStorage.';
            this.ui.error(this.errorMsg);
            return;
          }

          this.errorMsg =
            extractErrorMessage(err) ||
            `Gagal fetch impact scales (HTTP ${err?.status || 'unknown'}).`;
          this.ui.error(this.errorMsg);
        },
      });
  }

  imPrev(): void {
    if (!this.imPagination?.hasPrevPage) return;
    this.imPage = Math.max(1, this.imPage - 1);
    this.fetchImpactScales(false);
  }

  imNext(): void {
    if (!this.imPagination?.hasNextPage) return;
    this.imPage = this.imPage + 1;
    this.fetchImpactScales(false);
  }

  // ===================== IMPACT: CREATE/EDIT/DELETE =====================
  openCreateIM(): void {
    this.imErrors = {};
    this.imModalMode = 'CREATE';
    this.imForm = { id: '', level: 1, label: '', description: '' };
    this.showIMModal = true;
  }

  openEditIM(i: ImpactScale): void {
    this.imErrors = {};
    this.imModalMode = 'EDIT';
    this.imForm = {
      id: i.id,
      level: Number(i.level ?? 1),
      label: i.label ?? '',
      description: i.description ?? '',
    };
    this.showIMModal = true;
  }

  closeIMModal(): void {
    this.showIMModal = false;
    this.imErrors = {};
  }

  saveIM(): void {
    this.imErrors = {};

    if (!this.selectedRiskCategoryId) {
      this.imErrors.category = 'Pilih kategori terlebih dahulu.';
      return;
    }

    const level = Number(this.imForm.level);
    if (!level || level < 1) {
      this.imErrors.level = 'Level wajib diisi dan minimal 1.';
      return;
    }

    if (!this.imForm.label.trim()) {
      this.imErrors.label = 'Label wajib diisi.';
      return;
    }

    const payload: CreateImpactPayload | UpdateImpactPayload = {
      level,
      label: this.imForm.label.trim(),
      description: (this.imForm.description ?? '').trim(),
    };

    this.loading = true;

    if (this.imModalMode === 'CREATE') {
      this.konteksService
        .createImpactScale(this.konteksId, this.selectedRiskCategoryId, payload)
        .subscribe({
        next: () => {
          this.loading = false;
          this.closeIMModal();
          this.fetchImpactScales(true);
          this.ui.success('Impact berhasil ditambahkan.');
        },
          error: (e) => {
            this.loading = false;
            const fieldErrors = extractFieldErrors(e);
            if (Object.keys(fieldErrors).length) {
              this.imErrors = fieldErrors;
            }
            this.ui.error(extractErrorMessage(e) || 'Gagal menambah impact.');
          },
        });
      return;
    }

    this.konteksService
      .updateImpactScale(
        this.konteksId,
        this.selectedRiskCategoryId,
        this.imForm.id,
        payload
      )
      .subscribe({
      next: () => {
        this.loading = false;
        this.closeIMModal();
        this.fetchImpactScales(false);
        this.ui.success('Impact berhasil disimpan.');
      },
      error: (e) => {
        this.loading = false;
        const fieldErrors = extractFieldErrors(e);
        if (Object.keys(fieldErrors).length) {
          this.imErrors = fieldErrors;
        }
        this.ui.error(extractErrorMessage(e) || 'Gagal menyimpan impact.');
      },
    });
  }

  deleteIM(i: ImpactScale): void {
    this.pendingImpact = i;
    this.openConfirmModal({
      title: 'Hapus Impact',
      message: `Hapus impact "${i.label}" (level ${i.level})?`,
      confirmText: 'Hapus',
      tone: 'danger',
      action: 'delete-im',
    });
  }

  private performDeleteIM(i: ImpactScale): void {
    if (!this.selectedRiskCategoryId) return;

    this.loading = true;

    this.konteksService
      .deleteImpactScale(this.konteksId, this.selectedRiskCategoryId, i.id)
      .subscribe({
      next: () => {
        this.loading = false;
        this.fetchImpactScales(false);
        this.ui.success('Impact berhasil dihapus.');
      },
      error: (e) => {
        this.loading = false;
        this.ui.error(extractErrorMessage(e) || 'Gagal menghapus impact.');
      },
    });
  }

  // ===================== Helper for UI: get risk appetite badge class =====================
  getRiskAppetiteBadgeClass(): string {
    const level = this.konteksDetail?.riskAppetiteLevel?.toUpperCase();
    switch (level) {
      case 'LOW':
        return 'badge-low';
      case 'MEDIUM':
        return 'badge-moderate';
      case 'HIGH':
        return 'badge-high';
      case 'CRITICAL':
        return 'badge-critical';
      default:
        return '';
    }
  }

  // ===================== RISK MATRIX HELPERS =====================
  getMatrixSize(): number {
    const size = Number(this.matrixSize ?? this.konteksDetail?.matrixSize ?? 0);
    return Number.isFinite(size) && size > 0 ? size : 5;
  }

  getMatrixLevels(): number[] {
    const size = this.getMatrixSize();
    return Array.from({ length: size }, (_, i) => i + 1);
  }

  getMaxScore(): number {
    const size = this.getMatrixSize();
    return size * size;
  }
  getMatrixCellClass(likelihood: number, impact: number): string {
    const level = this.getCellRiskLevel(likelihood, impact);
    if (level === 'LOW') return 'low';
    if (level === 'MEDIUM') return 'medium';
    if (level === 'HIGH') return 'high';
    if (level === 'CRITICAL') return 'critical';
    return 'empty';
  }

  // ===================== RISK MATRIX INTERACTIVE METHODS =====================

  private getMatrixKey(likelihood: number, impact: number): string {
    return `${likelihood}-${impact}`;
  }

  private parseMatrixKey(key: string): { likelihood: number; impact: number } {
    const [likelihood, impact] = key.split('-').map(Number);
    return { likelihood, impact };
  }

  private initializeEmptyMatrix(): void {
    this.matrixState.clear();
    const size = this.getMatrixSize();

    for (let likelihood = 1; likelihood <= size; likelihood++) {
      for (let impact = 1; impact <= size; impact++) {
        const key = this.getMatrixKey(likelihood, impact);
        const defaultLevel = this.calculateDefaultRiskLevel(likelihood, impact);
        this.matrixState.set(key, defaultLevel);
      }
    }
  }

  private calculateDefaultRiskLevel(likelihood: number, impact: number): RiskLevel {
    const score = likelihood * impact;
    const size = this.getMatrixSize();
    const maxScore = size * size;

    // Dynamic thresholds based on matrix size
    const lowMax = Math.ceil(maxScore * 0.2);
    const mediumMax = Math.ceil(maxScore * 0.4);
    const highMax = Math.ceil(maxScore * 0.7);

    if (score <= lowMax) return 'LOW';
    if (score <= mediumMax) return 'MEDIUM';
    if (score <= highMax) return 'HIGH';
    return 'CRITICAL';
  }

  private populateMatrixFromSaved(): void {
    this.initializeEmptyMatrix();

    for (const item of this.savedRiskMatrices) {
      const key = this.getMatrixKey(item.likelihoodLevel, item.impactLevel);
      this.matrixState.set(key, item.riskLevel);
    }

    this.matrixHasChanges = false;
  }

  getCellRiskLevel(likelihood: number, impact: number): RiskLevel {
    const key = this.getMatrixKey(likelihood, impact);
    return this.matrixState.get(key) || 'LOW';
  }

  getRiskLevelClass(level: RiskLevel): string {
    switch (level) {
      case 'LOW': return 'risk-low';
      case 'MEDIUM': return 'risk-medium';
      case 'HIGH': return 'risk-high';
      case 'CRITICAL': return 'risk-critical';
      default: return '';
    }
  }

  onCellClick(likelihood: number, impact: number): void {
    if (!this.matrixEditMode) return;

    const key = this.getMatrixKey(likelihood, impact);
    const currentLevel = this.matrixState.get(key) || 'LOW';

    const currentIndex = this.riskLevelOptions.indexOf(currentLevel);
    const nextIndex = (currentIndex + 1) % this.riskLevelOptions.length;
    const nextLevel = this.riskLevelOptions[nextIndex];

    this.matrixState.set(key, nextLevel);
    this.matrixHasChanges = true;
  }

  toggleMatrixEditMode(): void {
    if (this.matrixEditMode && this.matrixHasChanges) {
      this.openConfirmModal({
        title: 'Perubahan Belum Disimpan',
        message: 'Anda memiliki perubahan yang belum disimpan. Batalkan perubahan?',
        confirmText: 'Ya, Batalkan',
        tone: 'danger',
        action: 'discard-matrix-changes',
      });
      return;
    }

    this.matrixEditMode = !this.matrixEditMode;

    if (!this.matrixEditMode) {
      this.populateMatrixFromSaved();
    }
  }

  fetchRiskMatrices(): void {
    if (!this.konteksId) return;

    this.matrixLoading = true;
    this.matrixErrorMsg = '';

    const size = this.getMatrixSize();
    const limit = Math.max(25, size * size);

    this.konteksService.getRiskMatrices(this.konteksId, { page: 1, limit }).subscribe({
      next: (res) => {
        this.savedRiskMatrices = res.data ?? [];
        this.populateMatrixFromSaved();
        this.matrixLoading = false;
      },
      error: (err) => {
        this.matrixLoading = false;

        if (err?.status === 401) {
          this.matrixErrorMsg = 'HTTP 401: Token tidak ada/invalid.';
          this.ui.error(this.matrixErrorMsg);
          return;
        }

        if (err?.status === 404) {
          this.savedRiskMatrices = [];
          this.initializeEmptyMatrix();
          this.matrixHasChanges = false;
          return;
        }

        this.matrixErrorMsg = extractErrorMessage(err) || 'Gagal memuat risk matrix.';
        this.ui.error(this.matrixErrorMsg);
      },
    });
  }

  discardMatrixChanges(): void {
    this.populateMatrixFromSaved();
    this.matrixEditMode = false;
    this.matrixHasChanges = false;
  }

  // ===================== MATRIX CONFIG MODAL =====================

  isMatrixEmpty(): boolean {
    return this.savedRiskMatrices.length === 0;
  }

  openMatrixConfigModal(): void {
    this.resetRiskLevelConfigs();
    this.updateConfigPreview();
    this.showMatrixConfigModal = true;
  }

  closeMatrixConfigModal(): void {
    this.showMatrixConfigModal = false;
  }

  private resetRiskLevelConfigs(): void {
    const size = this.getMatrixSize();
    const maxScore = size * size;

    // Dynamic thresholds based on matrix size
    const lowMax = Math.ceil(maxScore * 0.2);
    const mediumMax = Math.ceil(maxScore * 0.4);
    const highMax = Math.ceil(maxScore * 0.7);

    this.riskLevelConfigs = [
      { level: 'LOW', label: 'Low (Hijau)', minScore: 1, maxScore: lowMax, color: '#22c55e' },
      { level: 'MEDIUM', label: 'Medium (Kuning)', minScore: lowMax + 1, maxScore: mediumMax, color: '#f59e0b' },
      { level: 'HIGH', label: 'High (Oranye)', minScore: mediumMax + 1, maxScore: highMax, color: '#f97316' },
      { level: 'CRITICAL', label: 'Critical (Merah)', minScore: highMax + 1, maxScore: maxScore, color: '#dc2626' },
    ];
  }

  onConfigChange(): void {
    this.updateConfigPreview();
  }

  updateConfigPreview(): void {
    this.matrixConfigPreview.clear();
    const size = this.getMatrixSize();

    for (let likelihood = 1; likelihood <= size; likelihood++) {
      for (let impact = 1; impact <= size; impact++) {
        const key = this.getMatrixKey(likelihood, impact);
        const score = likelihood * impact;
        const level = this.getRiskLevelFromScore(score);
        this.matrixConfigPreview.set(key, level);
      }
    }
  }

  private getRiskLevelFromScore(score: number): RiskLevel {
    for (const config of this.riskLevelConfigs) {
      if (score >= config.minScore && score <= config.maxScore) {
        return config.level;
      }
    }
    return 'LOW';
  }

  getPreviewCellRiskLevel(likelihood: number, impact: number): RiskLevel {
    const key = this.getMatrixKey(likelihood, impact);
    return this.matrixConfigPreview.get(key) || 'LOW';
  }

  isConfigValid(): boolean {
    const size = this.getMatrixSize();
    const maxScore = size * size;

    const allScores = new Set<number>();
    let hasOverlap = false;
    let hasGap = false;

    for (const config of this.riskLevelConfigs) {
      if (config.minScore > config.maxScore) return false;
      if (config.minScore < 1 || config.maxScore > maxScore) return false;

      for (let s = config.minScore; s <= config.maxScore; s++) {
        if (allScores.has(s)) {
          hasOverlap = true;
        }
        allScores.add(s);
      }
    }

    for (let s = 1; s <= maxScore; s++) {
      if (!allScores.has(s)) {
        hasGap = true;
      }
    }

    return !hasOverlap && !hasGap;
  }

  createMatrixFromConfig(): void {
    if (!this.isConfigValid()) {
      const maxScore = this.getMatrixSize() * this.getMatrixSize();
      this.ui.error(`Konfigurasi tidak valid. Pastikan semua skor 1-${maxScore} tercakup tanpa overlap.`);
      return;
    }

    this.matrixSaving = true;

    const matrices: RiskMatrixEntry[] = [];
    const size = this.getMatrixSize();

    for (let likelihood = 1; likelihood <= size; likelihood++) {
      for (let impact = 1; impact <= size; impact++) {
        const score = likelihood * impact;
        const riskLevel = this.getRiskLevelFromScore(score);
        matrices.push({
          likelihoodLevel: likelihood,
          impactLevel: impact,
          riskLevel,
        });
      }
    }

    const payload: CreateRiskMatrixBulkPayload = { matrices };

    this.konteksService.createRiskMatricesBulk(this.konteksId, payload).subscribe({
      next: (res) => {
        this.matrixSaving = false;
        this.savedRiskMatrices = res.data?.created ?? [];
        this.populateMatrixFromSaved();
        this.closeMatrixConfigModal();
        this.ui.success('Risk matrix berhasil dibuat.');
        this.fetchKonteksDetail();
      },
      error: (err) => {
        this.matrixSaving = false;
        this.ui.error(extractErrorMessage(err) || 'Gagal membuat risk matrix.');
      },
    });
  }

  // ===================== DELETE MATRIX =====================

  confirmDeleteMatrix(): void {
    if (this.savedRiskMatrices.length === 0) {
      this.ui.info('Tidak ada matrix untuk dihapus.');
      return;
    }

    this.openConfirmModal({
      title: 'Hapus Risk Matrix',
      message: `Hapus seluruh risk matrix (${this.savedRiskMatrices.length} cell)?`,
      details: ['Tindakan ini tidak dapat dibatalkan.'],
      confirmText: 'Ya, Hapus',
      tone: 'danger',
      action: 'delete-matrix',
    });
  }

  private performDeleteMatrix(): void {
    if (this.savedRiskMatrices.length === 0) return;

    this.matrixDeleting = true;
    this.matrixLoading = true;

    const deleteRequests = this.savedRiskMatrices.map((item) =>
      this.konteksService.deleteRiskMatrix(this.konteksId, item.id)
    );

    let completed = 0;
    let errors = 0;

    deleteRequests.forEach((req) => {
      req.subscribe({
        next: () => {
          completed++;
          this.checkDeleteCompletion(completed, errors, deleteRequests.length);
        },
        error: () => {
          completed++;
          errors++;
          this.checkDeleteCompletion(completed, errors, deleteRequests.length);
        },
      });
    });
  }

  private checkDeleteCompletion(completed: number, errors: number, total: number): void {
    if (completed === total) {
      this.matrixDeleting = false;
      this.matrixLoading = false;

      if (errors === 0) {
        this.savedRiskMatrices = [];
        this.matrixState.clear();
        this.matrixEditMode = false;
        this.matrixHasChanges = false;
        this.ui.success('Risk matrix berhasil dihapus.');
        this.fetchKonteksDetail();
      } else if (errors < total) {
        this.ui.error(`Sebagian matrix gagal dihapus (${errors}/${total} error). Silakan coba lagi.`);
        this.fetchRiskMatrices();
      } else {
        this.ui.error('Gagal menghapus risk matrix.');
        this.fetchRiskMatrices();
      }
    }
  }
}
