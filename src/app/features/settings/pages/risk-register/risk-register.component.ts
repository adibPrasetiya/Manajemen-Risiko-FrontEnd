import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { KonteksService } from '../../../../core/services/konteks.service';
import { ProfileService } from '../../../../core/services/profile.service';
import { UiService } from '../../../../core/services/ui.service';
import {
  AssetItem,
  Pagination,
  RiskAssessmentItem,
  RiskAssessmentListParams,
  RiskLevel,
  RiskTreatmentOption,
  UpdateRiskAssessmentPayload,
  RiskWorksheetItem,
  UserService,
} from '../../../../core/services/user.service';
import { ImpactScale, LikelihoodScale, RiskCategory } from '../../../../core/models/konteks.model';
import { extractErrorMessage } from '../../../../core/utils/error-utils';

type RiskGroup = {
  assetId: string;
  assetName: string;
  assetCategory: string;
  items: RiskAssessmentItem[];
};

@Component({
  selector: 'app-risk-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './risk-register.component.html',
  styleUrl: './risk-register.component.scss',
})
export class RiskRegisterComponent implements OnInit {
  loading = false;
  errorMsg = '';

  unitKerjaId = '';
  unitKerjaName = '';
  unitKerjaCode = '';
  roles: string[] = [];
  isPengelola = false;
  isKomite = false;

  worksheetOptions: RiskWorksheetItem[] = [];
  selectedWorksheetId = '';
  selectedWorksheet: RiskWorksheetItem | null = null;

  konteksName = '';
  konteksCode = '';
  konteksId = '';
  periodStart?: number;
  periodEnd?: number;

  assets: AssetItem[] = [];
  assetMap = new Map<string, AssetItem>();
  categoryOptions: RiskCategory[] = [];
  categoryMap = new Map<string, RiskCategory>();
  likelihoodScales: LikelihoodScale[] = [];
  impactScales: ImpactScale[] = [];

  items: RiskAssessmentItem[] = [];
  filteredItems: RiskAssessmentItem[] = [];
  groupedItems: RiskGroup[] = [];
  pagination: Pagination | null = null;

  showEditModal = false;
  editErrors: { riskName?: string } = {};
  editTarget: RiskAssessmentItem | null = null;
  editStep: 1 | 2 | 3 = 1;
  showDeleteModal = false;
  deleteTarget: RiskAssessmentItem | null = null;
  deleteError = '';
  editModel = {
    riskName: '',
    riskCategoryId: '',
    assetId: '',
    weaknessDescription: '',
    treatDescription: '',
    impactDescription: '',
    inherentLikelihood: 0,
    inherentImpact: 0,
    inherentLikelihoodDescription: '',
    inherentImpactDescription: '',
    inherentLikelihoodId: '',
    inherentImpactId: '',
    existingControls: '',
    controlEffectiveness: '',
    residualLikelihood: 0,
    residualImpact: 0,
    residualLikelihoodDescription: '',
    residualImpactDescription: '',
    residualLikelihoodId: '',
    residualImpactId: '',
    treatmentOption: '' as RiskTreatmentOption | '',
    treatmentRationale: '',
    riskPriorityRank: 1,
    order: 1,
  };

  q = '';
  fAssetId = 'ALL';
  fCategoryId = 'ALL';
  fTreatment: RiskTreatmentOption | 'ALL' = 'ALL';
  fInherentLevel: RiskLevel | 'ALL' = 'ALL';
  fResidualLevel: RiskLevel | 'ALL' = 'ALL';

  totalRisiko = 0;
  totalHighResidual = 0;
  totalCriticalResidual = 0;
  totalMitigated = 0;
  totalAccepted = 0;

  submittingWorksheet = false;
  approvingWorksheet = false;
  rejectingWorksheet = false;
  showRejectModal = false;
  rejectReason = '';
  rejectError = '';

  page = 1;
  limit = 10;
  limitOptions = [10, 25, 50, 100];
  private pendingWorksheetId = '';

  constructor(
    private userService: UserService,
    private profileService: ProfileService,
    private konteksService: KonteksService,
    private route: ActivatedRoute,
    private ui: UiService
  ) {}

  ngOnInit(): void {
    this.pendingWorksheetId = this.route.snapshot.queryParamMap.get('worksheetId') || '';
    this.loadProfile();
  }

  goBack(): void {
    window.history.back();
  }

  private loadProfile(): void {
    this.loading = true;
    this.errorMsg = '';

    this.profileService.getMyProfile().subscribe({
      next: (res) => {
        const unitKerja = res?.data?.unitKerja;
        this.roles = res?.data?.roles ?? [];
        this.isPengelola = this.roles.includes('PENGELOLA_RISIKO_UKER');
        this.isKomite = this.roles.includes('KOMITE_PUSAT');
        this.unitKerjaId = unitKerja?.id || '';
        this.unitKerjaName = unitKerja?.name || '';
        this.unitKerjaCode = unitKerja?.code || '';

        if (!this.unitKerjaId) {
          this.loading = false;
          this.errorMsg = 'Unit kerja tidak ditemukan pada profil.';
          this.ui.error(this.errorMsg);
          return;
        }

        this.fetchAssets();
        this.fetchWorksheets();
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = extractErrorMessage(err) || 'Gagal memuat profil pengguna.';
        this.ui.error(this.errorMsg);
      },
    });
  }

  private fetchAssets(): void {
    if (!this.unitKerjaId) return;

    this.userService.getAssets(this.unitKerjaId, { page: 1, limit: 100 }).subscribe({
      next: (res) => {
        this.assets = res.data ?? [];
        this.assetMap = new Map(this.assets.map((x) => [x.id, x]));
      },
      error: () => {
        this.assets = [];
        this.assetMap = new Map();
      },
    });
  }

  private fetchWorksheets(): void {
    if (!this.unitKerjaId) return;

    this.loading = true;
    this.errorMsg = '';

    this.userService
      .getRiskWorksheets(this.unitKerjaId, { page: 1, limit: 100 })
      .subscribe({
        next: (res) => {
          this.worksheetOptions = res.data ?? [];
          if (this.pendingWorksheetId) {
            const match = this.worksheetOptions.find(
              (x) => x.id === this.pendingWorksheetId
            );
            if (match) {
              this.selectedWorksheetId = match.id;
            }
            this.pendingWorksheetId = '';
          }
          if (!this.selectedWorksheetId && this.worksheetOptions.length > 0) {
            const preferred =
              this.worksheetOptions.find((x) => x.status === 'APPROVED') ||
              this.worksheetOptions.find((x) => x.status === 'SUBMITTED') ||
              this.worksheetOptions.find((x) => x.status === 'DRAFT');
            this.selectedWorksheetId = preferred?.id || this.worksheetOptions[0].id;
          }
          this.onWorksheetChange();
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.worksheetOptions = [];
          this.selectedWorksheetId = '';
          this.selectedWorksheet = null;

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

  onWorksheetChange(): void {
    if (!this.selectedWorksheetId) {
      this.selectedWorksheet = null;
      this.items = [];
      this.filteredItems = [];
      this.groupedItems = [];
      this.pagination = null;
      return;
    }

    this.selectedWorksheet =
      this.worksheetOptions.find((x) => x.id === this.selectedWorksheetId) || null;

    this.fetchWorksheetDetail(this.selectedWorksheetId);

    const konteks = this.selectedWorksheet?.konteks;
    this.konteksId = konteks?.id || '';
    this.konteksName = konteks?.name || '';
    this.konteksCode = konteks?.code || '';
    this.periodStart = konteks?.periodStart;
    this.periodEnd = konteks?.periodEnd;
    if (this.konteksId) {
      localStorage.setItem('lastRiskKonteksId', this.konteksId);
    }

    if (konteks?.id) {
      this.fetchRiskCategories(konteks.id);
    } else {
      this.categoryOptions = [];
      this.categoryMap = new Map();
    }

    this.fetchRiskItems(true);
  }

  private fetchWorksheetDetail(worksheetId: string): void {
    if (!this.unitKerjaId || !worksheetId) return;

    this.userService.getRiskWorksheetById(this.unitKerjaId, worksheetId).subscribe({
      next: (res) => {
        const data = res.data ?? null;
        if (!data) return;
        this.selectedWorksheet = data;

        const konteks = data.konteks;
        this.konteksId = konteks?.id || '';
        this.konteksName = konteks?.name || '';
        this.konteksCode = konteks?.code || '';
        this.periodStart = konteks?.periodStart;
        this.periodEnd = konteks?.periodEnd;
        if (this.konteksId) {
          localStorage.setItem('lastRiskKonteksId', this.konteksId);
        }
      },
      error: () => {
        // Ignore detail error; list data is still usable
      },
    });
  }

  private fetchRiskCategories(konteksId: string): void {
    this.konteksService.getRiskCategories(konteksId, { page: 1, limit: 100 }).subscribe({
      next: (res) => {
        this.categoryOptions = res.data ?? [];
        this.categoryMap = new Map(this.categoryOptions.map((x) => [x.id, x]));
      },
      error: () => {
        this.categoryOptions = [];
        this.categoryMap = new Map();
      },
    });
  }

  private buildListParams(resetPage: boolean): RiskAssessmentListParams {
    if (resetPage) this.page = 1;
    return { page: this.page, limit: this.limit };
  }

  fetchRiskItems(resetPage: boolean): void {
    if (!this.unitKerjaId || !this.selectedWorksheetId) return;

    this.loading = true;
    this.errorMsg = '';

    this.userService
      .getRiskAssessmentItems(
        this.unitKerjaId,
        this.selectedWorksheetId,
        this.buildListParams(resetPage)
      )
      .subscribe({
        next: (res) => {
          this.items = res.data ?? [];
          this.pagination = res.pagination ?? null;
          this.applyFilters();
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.items = [];
          this.filteredItems = [];
          this.groupedItems = [];
          this.pagination = null;

          if (err?.status === 401) {
            this.errorMsg =
              'HTTP 401: Token tidak ada/invalid. Pastikan accessToken tersedia di localStorage.';
            this.ui.error(this.errorMsg);
            return;
          }

          this.errorMsg =
            extractErrorMessage(err) ||
            `Gagal fetch risk register (HTTP ${err?.status || 'unknown'}).`;
          this.ui.error(this.errorMsg);
        },
      });
  }

  applySearch(): void {
    this.applyFilters();
  }

  resetFilters(): void {
    this.q = '';
    this.fAssetId = 'ALL';
    this.fCategoryId = 'ALL';
    this.fTreatment = 'ALL';
    this.fInherentLevel = 'ALL';
    this.fResidualLevel = 'ALL';
    this.applyFilters();
  }

  openEdit(item: RiskAssessmentItem): void {
    this.editTarget = item;
    this.editErrors = {};
    this.editStep = 1;
    this.editModel = {
      riskName: item.riskName || '',
      riskCategoryId: item.riskCategoryId || '',
      assetId: item.assetId || '',
      weaknessDescription: item.weaknessDescription || '',
      treatDescription: item.treatDescription || '',
      impactDescription: item.impactDescription || '',
      inherentLikelihood: item.inherentLikelihood ?? 0,
      inherentImpact: item.inherentImpact ?? 0,
      inherentLikelihoodDescription: item.inherentLikelihoodDescription || '',
      inherentImpactDescription: item.inherentImpactDescription || '',
      inherentLikelihoodId: '',
      inherentImpactId: '',
      existingControls: item.existingControls || '',
      controlEffectiveness: item.controlEffectiveness || '',
      residualLikelihood: item.residualLikelihood ?? 0,
      residualImpact: item.residualImpact ?? 0,
      residualLikelihoodDescription: item.residualLikelihoodDescription || '',
      residualImpactDescription: item.residualImpactDescription || '',
      residualLikelihoodId: '',
      residualImpactId: '',
      treatmentOption: item.treatmentOption || '',
      treatmentRationale: item.treatmentRationale || '',
      riskPriorityRank: item.riskPriorityRank ?? 1,
      order: item.order ?? 1,
    };
    if (this.editModel.riskCategoryId) {
      this.loadEditScales(this.editModel.riskCategoryId);
    }
    this.showEditModal = true;
  }

  closeEdit(): void {
    this.showEditModal = false;
    this.editTarget = null;
    this.editErrors = {};
  }

  openDelete(item: RiskAssessmentItem): void {
    this.deleteTarget = item;
    this.deleteError = '';
    this.showDeleteModal = true;
  }

  closeDelete(): void {
    this.showDeleteModal = false;
    this.deleteTarget = null;
    this.deleteError = '';
  }

  confirmDelete(): void {
    if (!this.deleteTarget || !this.unitKerjaId || !this.selectedWorksheetId) return;
    this.loading = true;
    this.userService
      .deleteRiskAssessmentItem(
        this.unitKerjaId,
        this.selectedWorksheetId,
        this.deleteTarget.id
      )
      .subscribe({
        next: () => {
          this.loading = false;
          this.items = this.items.filter((x) => x.id !== this.deleteTarget!.id);
          this.applyFilters();
          this.closeDelete();
          this.ui.success('Risiko berhasil dihapus.');
        },
        error: (err) => {
          this.loading = false;
          this.deleteError =
            extractErrorMessage(err) ||
            'Gagal menghapus risiko. Hanya pemilik kertas kerja yang dapat menghapus item.';
        },
      });
  }

  get isEditStep1Valid(): boolean {
    return (
      !!this.editModel.riskName.trim() &&
      !!this.editModel.weaknessDescription.trim() &&
      !!this.editModel.treatDescription.trim() &&
      !!this.editModel.impactDescription.trim()
    );
  }

  get isEditStep2Valid(): boolean {
    return (
      !!this.editModel.inherentLikelihoodId &&
      !!this.editModel.inherentImpactId &&
      !!this.editModel.inherentLikelihoodDescription.trim() &&
      !!this.editModel.inherentImpactDescription.trim() &&
      !!this.editModel.existingControls.trim() &&
      !!this.editModel.controlEffectiveness
    );
  }

  get isEditStep3Valid(): boolean {
    return (
      !!this.editModel.residualLikelihoodId &&
      !!this.editModel.residualImpactId &&
      !!this.editModel.residualLikelihoodDescription.trim() &&
      !!this.editModel.residualImpactDescription.trim() &&
      !!this.editModel.treatmentOption &&
      !!this.editModel.treatmentRationale.trim() &&
      !!this.editModel.riskPriorityRank
    );
  }

  editGoToStep(step: 1 | 2 | 3): void {
    this.editStep = step;
  }

  editNext(): void {
    if (this.editStep === 1) {
      this.editStep = 2;
      return;
    }
    if (this.editStep === 2) {
      this.editStep = 3;
    }
  }

  editPrev(): void {
    if (this.editStep === 2) this.editStep = 1;
    else if (this.editStep === 3) this.editStep = 2;
  }

  onEditCategoryChange(): void {
    if (!this.editModel.riskCategoryId) return;
    this.loadEditScales(this.editModel.riskCategoryId);
  }

  onEditInherentLikelihoodChange(): void {
    const picked = this.likelihoodScales.find(
      (x) => x.id === this.editModel.inherentLikelihoodId
    );
    this.editModel.inherentLikelihood = picked?.level ?? 0;
  }

  onEditInherentImpactChange(): void {
    const picked = this.impactScales.find((x) => x.id === this.editModel.inherentImpactId);
    this.editModel.inherentImpact = picked?.level ?? 0;
  }

  onEditResidualLikelihoodChange(): void {
    const picked = this.likelihoodScales.find(
      (x) => x.id === this.editModel.residualLikelihoodId
    );
    this.editModel.residualLikelihood = picked?.level ?? 0;
  }

  onEditResidualImpactChange(): void {
    const picked = this.impactScales.find((x) => x.id === this.editModel.residualImpactId);
    this.editModel.residualImpact = picked?.level ?? 0;
  }

  private loadEditScales(categoryId: string): void {
    if (!this.konteksId) return;
    this.konteksService
      .getLikelihoodScales(this.konteksId, categoryId, { page: 1, limit: 100 })
      .subscribe({
        next: (res) => {
          this.likelihoodScales = res.data ?? [];
          const like = this.likelihoodScales.find(
            (x) => x.level === this.editModel.inherentLikelihood
          );
          const rLike = this.likelihoodScales.find(
            (x) => x.level === this.editModel.residualLikelihood
          );
          if (like) this.editModel.inherentLikelihoodId = like.id;
          if (rLike) this.editModel.residualLikelihoodId = rLike.id;
        },
        error: () => {
          this.likelihoodScales = [];
        },
      });

    this.konteksService
      .getImpactScales(this.konteksId, categoryId, { page: 1, limit: 100 })
      .subscribe({
        next: (res) => {
          this.impactScales = res.data ?? [];
          const imp = this.impactScales.find(
            (x) => x.level === this.editModel.inherentImpact
          );
          const rImp = this.impactScales.find(
            (x) => x.level === this.editModel.residualImpact
          );
          if (imp) this.editModel.inherentImpactId = imp.id;
          if (rImp) this.editModel.residualImpactId = rImp.id;
        },
        error: () => {
          this.impactScales = [];
        },
      });
  }

  saveEdit(): void {
    if (!this.editTarget || !this.unitKerjaId || !this.selectedWorksheetId) return;
    if (!this.isEditStep1Valid || !this.isEditStep2Valid || !this.isEditStep3Valid) {
      this.ui.error('Lengkapi semua data sebelum menyimpan.');
      return;
    }

    const payload: UpdateRiskAssessmentPayload = {
      riskName: this.editModel.riskName.trim(),
      weaknessDescription: this.editModel.weaknessDescription.trim(),
      treatDescription: this.editModel.treatDescription.trim(),
      impactDescription: this.editModel.impactDescription.trim(),
      inherentLikelihood: Number(this.editModel.inherentLikelihood) || 0,
      inherentImpact: Number(this.editModel.inherentImpact) || 0,
      inherentLikelihoodDescription: this.editModel.inherentLikelihoodDescription.trim(),
      inherentImpactDescription: this.editModel.inherentImpactDescription.trim(),
      existingControls: this.editModel.existingControls.trim(),
      controlEffectiveness: this.editModel.controlEffectiveness,
      residualLikelihood: Number(this.editModel.residualLikelihood) || 0,
      residualImpact: Number(this.editModel.residualImpact) || 0,
      residualLikelihoodDescription: this.editModel.residualLikelihoodDescription.trim(),
      residualImpactDescription: this.editModel.residualImpactDescription.trim(),
      treatmentOption: this.editModel.treatmentOption as RiskTreatmentOption,
      treatmentRationale: this.editModel.treatmentRationale.trim(),
      riskPriorityRank: Number(this.editModel.riskPriorityRank) || 1,
      order: Number(this.editModel.order) || 1,
    };

    this.loading = true;
    this.userService
      .updateRiskAssessmentItem(
        this.unitKerjaId,
        this.selectedWorksheetId,
        this.editTarget.id,
        payload
      )
      .subscribe({
        next: (res) => {
          const updated = res?.data;
          if (updated) {
            this.items = this.items.map((x) => (x.id === updated.id ? updated : x));
            this.applyFilters();
          }
          this.loading = false;
          this.closeEdit();
          this.ui.success('Risiko berhasil diperbarui.');
        },
        error: (err) => {
          this.loading = false;
          this.ui.error(extractErrorMessage(err) || 'Gagal memperbarui risiko.');
        },
      });
  }

  prevPage(): void {
    if (!this.pagination?.hasPrevPage) return;
    this.page = Math.max(1, this.page - 1);
    this.fetchRiskItems(false);
  }

  nextPage(): void {
    if (!this.pagination?.hasNextPage) return;
    this.page = this.page + 1;
    this.fetchRiskItems(false);
  }

  goToPage(pageNum: number): void {
    if (pageNum < 1 || pageNum > (this.pagination?.totalPages ?? 1)) return;
    this.page = pageNum;
    this.fetchRiskItems(false);
  }

  onLimitChange(): void {
    this.page = 1;
    this.fetchRiskItems(true);
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

  getAssetLabel(assetId?: string | null): string {
    if (!assetId) return 'Tanpa Aset';
    return this.assetMap.get(assetId)?.name || 'Tanpa Aset';
  }

  getAssetCategoryLabel(assetId?: string | null): string {
    if (!assetId) return '-';
    return this.assetMap.get(assetId)?.category?.name || '-';
  }

  getCategoryLabel(categoryId?: string | null): string {
    if (!categoryId) return '-';
    return this.categoryMap.get(categoryId)?.name || '-';
  }

  getRiskLevelClass(level?: RiskLevel | null): string {
    if (level === 'LOW') return 'level-low';
    if (level === 'MEDIUM') return 'level-medium';
    if (level === 'HIGH') return 'level-high';
    if (level === 'CRITICAL') return 'level-critical';
    return 'level-empty';
  }

  getTreatmentClass(option?: RiskTreatmentOption | null): string {
    if (option === 'MITIGATE') return 'option-mitigate';
    if (option === 'ACCEPT') return 'option-accept';
    if (option === 'TRANSFER') return 'option-transfer';
    return 'option-neutral';
  }

  getEffectivenessClass(value?: string | null): string {
    const normalized = String(value ?? '').toUpperCase();
    if (!normalized || normalized === '-') return 'eff-neutral';
    if (normalized.includes('EFFECTIVE') || normalized.includes('STRONG')) {
      return 'eff-good';
    }
    if (normalized.includes('PARTIAL') || normalized.includes('MODERATE')) {
      return 'eff-medium';
    }
    if (normalized.includes('INEFFECTIVE') || normalized.includes('WEAK')) {
      return 'eff-poor';
    }
    return 'eff-neutral';
  }

  getRiskAppetiteClass(level?: string | null): string {
    const normalized = String(level ?? '').toUpperCase();
    if (normalized === 'LOW') return 'appetite-low';
    if (normalized === 'MEDIUM') return 'appetite-medium';
    if (normalized === 'HIGH') return 'appetite-high';
    if (normalized === 'CRITICAL') return 'appetite-critical';
    return 'appetite-neutral';
  }

  getScoreClass(score?: number | null): string {
    if (!score || score <= 0) return 'level-empty';
    if (score <= 2) return 'level-low';
    if (score === 3) return 'level-medium';
    if (score === 4) return 'level-high';
    return 'level-critical';
  }

  formatRiskLevel(level?: RiskLevel | null): string {
    return level ? String(level) : '-';
  }

  formatTreatment(option?: RiskTreatmentOption | null): string {
    if (!option) return '-';
    if (option === 'MITIGATE') return 'MITIGATE';
    if (option === 'ACCEPT') return 'ACCEPT';
    if (option === 'TRANSFER') return 'TRANSFER';
    return String(option);
  }

  getInherentScore(item: RiskAssessmentItem): number | '-' {
    const like = item.inherentLikelihood ?? 0;
    const impact = item.inherentImpact ?? 0;
    if (!like || !impact) return '-';
    return like * impact;
  }

  getResidualScore(item: RiskAssessmentItem): number | '-' {
    const like = item.residualLikelihood ?? 0;
    const impact = item.residualImpact ?? 0;
    if (!like || !impact) return '-';
    return like * impact;
  }

  submitWorksheet(): void {
    if (!this.unitKerjaId || !this.selectedWorksheetId) return;
    this.submittingWorksheet = true;
    this.userService
      .submitRiskWorksheet(this.unitKerjaId, this.selectedWorksheetId)
      .subscribe({
        next: (res) => {
          this.submittingWorksheet = false;
          if (res?.data) {
            this.selectedWorksheet = res.data;
            const konteks = res.data.konteks;
            this.konteksName = konteks?.name || '';
            this.konteksCode = konteks?.code || '';
            this.konteksId = konteks?.id || '';
            this.periodStart = konteks?.periodStart;
            this.periodEnd = konteks?.periodEnd;
          }
          this.ui.success('Kertas kerja risiko berhasil disubmit.');
        },
        error: (err) => {
          this.submittingWorksheet = false;
          this.ui.error(
            extractErrorMessage(err) ||
              'Gagal submit kertas kerja risiko. Pastikan data sudah lengkap.'
          );
        },
      });
  }

  approveWorksheet(): void {
    if (!this.unitKerjaId || !this.selectedWorksheetId) return;
    this.approvingWorksheet = true;
    this.userService
      .approveRiskWorksheet(this.unitKerjaId, this.selectedWorksheetId)
      .subscribe({
        next: (res) => {
          this.approvingWorksheet = false;
          if (res?.data) {
            this.selectedWorksheet = res.data;
          } else if (this.selectedWorksheet) {
            this.selectedWorksheet = { ...this.selectedWorksheet, status: 'APPROVED' };
          }
          this.ui.success('Kertas kerja risiko berhasil disetujui.');
        },
        error: (err) => {
          this.approvingWorksheet = false;
          this.ui.error(extractErrorMessage(err) || 'Gagal menyetujui kertas kerja risiko.');
        },
      });
  }

  openReject(): void {
    this.rejectReason = '';
    this.rejectError = '';
    this.showRejectModal = true;
  }

  closeReject(): void {
    this.showRejectModal = false;
    this.rejectReason = '';
    this.rejectError = '';
  }

  confirmReject(): void {
    if (!this.unitKerjaId || !this.selectedWorksheetId) return;
    if (!this.rejectReason.trim()) {
      this.rejectError = 'Alasan penolakan wajib diisi.';
      return;
    }
    this.rejectingWorksheet = true;
    this.userService
      .rejectRiskWorksheet(this.unitKerjaId, this.selectedWorksheetId, {
        rejectionReason: this.rejectReason.trim(),
      })
      .subscribe({
        next: (res) => {
          this.rejectingWorksheet = false;
          if (res?.data) {
            this.selectedWorksheet = res.data;
          } else if (this.selectedWorksheet) {
            this.selectedWorksheet = { ...this.selectedWorksheet, status: 'REJECTED' } as any;
          }
          this.ui.success('Kertas kerja risiko berhasil ditolak.');
          this.closeReject();
        },
        error: (err) => {
          this.rejectingWorksheet = false;
          this.rejectError =
            extractErrorMessage(err) || 'Gagal menolak kertas kerja risiko.';
        },
      });
  }

  private applyFilters(): void {
    const q = (this.q ?? '').trim().toLowerCase();

    let list = [...this.items];

    if (this.fAssetId !== 'ALL') {
      list = list.filter((x) => x.assetId === this.fAssetId);
    }
    if (this.fCategoryId !== 'ALL') {
      list = list.filter((x) => x.riskCategoryId === this.fCategoryId);
    }
    if (this.fTreatment !== 'ALL') {
      list = list.filter((x) => x.treatmentOption === this.fTreatment);
    }
    if (this.fInherentLevel !== 'ALL') {
      list = list.filter((x) => x.inherentRiskLevel === this.fInherentLevel);
    }
    if (this.fResidualLevel !== 'ALL') {
      list = list.filter((x) => x.residualRiskLevel === this.fResidualLevel);
    }

    if (q) {
      list = list.filter((x) => {
        const name = (x.riskName ?? '').toLowerCase();
        const code = (x.riskCode ?? '').toLowerCase();
        const impact = (x.impactDescription ?? '').toLowerCase();
        const threat = (x.treatDescription ?? '').toLowerCase();
        const weakness = (x.weaknessDescription ?? '').toLowerCase();
        return (
          name.includes(q) ||
          code.includes(q) ||
          impact.includes(q) ||
          threat.includes(q) ||
          weakness.includes(q)
        );
      });
    }

    this.filteredItems = list;
    this.groupedItems = this.groupByAsset(list);
    this.refreshStats(list);
  }

  private groupByAsset(list: RiskAssessmentItem[]): RiskGroup[] {
    const map = new Map<string, RiskGroup>();

    for (const item of list) {
      const key = item.assetId || 'NO_ASSET';
      if (!map.has(key)) {
        map.set(key, {
          assetId: key,
          assetName: this.getAssetLabel(item.assetId),
          assetCategory: this.getAssetCategoryLabel(item.assetId),
          items: [],
        });
      }
      map.get(key)!.items.push(item);
    }

    return Array.from(map.values()).sort((a, b) => a.assetName.localeCompare(b.assetName));
  }

  private refreshStats(list: RiskAssessmentItem[]): void {
    this.totalRisiko = list.length;
    this.totalHighResidual = list.filter((x) => x.residualRiskLevel === 'HIGH')
      .length;
    this.totalCriticalResidual = list.filter(
      (x) => x.residualRiskLevel === 'CRITICAL'
    ).length;
    this.totalMitigated = list.filter((x) => x.treatmentOption === 'MITIGATE').length;
    this.totalAccepted = list.filter((x) => x.treatmentOption === 'ACCEPT').length;
  }
}
