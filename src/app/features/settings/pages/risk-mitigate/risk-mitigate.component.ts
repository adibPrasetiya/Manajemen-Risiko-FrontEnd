import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ProfileService } from '../../../../core/services/profile.service';
import { UiService } from '../../../../core/services/ui.service';
import {
  CreateRiskMitigationPayload,
  Pagination,
  RiskAssessmentItem,
  RiskLevel,
  RiskMitigationItem,
  RiskMitigationListParams,
  UpdateRiskMitigationPayload,
  UserService,
} from '../../../../core/services/user.service';
import { extractErrorMessage } from '../../../../core/utils/error-utils';

@Component({
  selector: 'app-risk-mitigate',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './risk-mitigate.component.html',
  styleUrl: './risk-mitigate.component.scss',
})
export class RiskMitigateComponent implements OnInit {
  loading = false;
  errorMsg = '';

  unitKerjaId = '';
  worksheetId = '';
  worksheetName = '';
  riskId = '';
  roles: string[] = [];
  isKomite = false;
  private profileLoaded = false;

  item: RiskAssessmentItem | null = null;
  mitigations: RiskMitigationItem[] = [];
  filteredMitigations: RiskMitigationItem[] = [];
  pagination: Pagination | null = null;

  q = '';
  fPriority = 'ALL';
  fStatus = 'ALL';
  fValidated: 'ALL' | 'PENDING' | 'VALIDATED' | 'NOT_VALIDATED' = 'ALL';

  showCreateCard = false;
  createSubmitting = false;
  createErrors: Partial<Record<keyof CreateRiskMitigationPayload, string>> = {};
  createModel: CreateRiskMitigationPayload = {
    name: '',
    description: '',
    priority: 'HIGH',
    plannedStartDate: '',
    plannedEndDate: '',
    responsiblePerson: '',
    responsibleUnit: '',
  };

  showEditCard = false;
  editSubmitting = false;
  editTarget: RiskMitigationItem | null = null;
  editModel: UpdateRiskMitigationPayload = {
    name: '',
    description: '',
    priority: '',
    plannedStartDate: '',
    plannedEndDate: '',
  };

  showProgressCard = false;
  progressSubmitting = false;
  progressTarget: RiskMitigationItem | null = null;
  progressModel: UpdateRiskMitigationPayload = {
    actualStartDate: '',
    actualEndDate: '',
    status: '',
    progressPercentage: 0,
    progressNotes: '',
  };

  showDeleteModal = false;
  deleteSubmitting = false;
  deleteTarget: RiskMitigationItem | null = null;
  deleteError = '';

  showValidationModal = false;
  validationMode: 'VALIDATE' | 'REJECT' = 'VALIDATE';
  validationSubmitting = false;
  validationTarget: RiskMitigationItem | null = null;
  validationNotes = '';
  validationError = '';

  page = 1;
  limit = 10;
  limitOptions = [10, 25, 50, 100];

  constructor(
    private profileService: ProfileService,
    private userService: UserService,
    private route: ActivatedRoute,
    private ui: UiService
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.riskId = params.get('riskId') || '';
      this.worksheetId = params.get('worksheetId') || '';
      if (this.profileLoaded) {
        this.reloadData(true);
      }
    });

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
        if (!this.unitKerjaId) {
          this.loading = false;
          this.errorMsg = 'Unit kerja tidak ditemukan pada profil.';
          this.ui.error(this.errorMsg);
          return;
        }

        this.profileLoaded = true;
        this.reloadData(true);
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = extractErrorMessage(err) || 'Gagal memuat profil pengguna.';
        this.ui.error(this.errorMsg);
      },
    });
  }

  private reloadData(resetPage: boolean): void {
    if (!this.unitKerjaId || !this.worksheetId || !this.riskId) {
      this.loading = false;
      this.errorMsg = 'Risk ID atau Worksheet ID belum tersedia.';
      return;
    }

    this.fetchWorksheetName();
    this.fetchRiskItem();
    this.fetchMitigations(resetPage);
  }

  private fetchWorksheetName(): void {
    if (!this.unitKerjaId || !this.worksheetId) return;
    this.userService.getRiskWorksheetById(this.unitKerjaId, this.worksheetId).subscribe({
      next: (res) => {
        this.worksheetName = res?.data?.name || '';
      },
      error: () => {
        this.worksheetName = '';
      },
    });
  }

  private fetchRiskItem(): void {
    if (!this.unitKerjaId || !this.worksheetId || !this.riskId) return;

    this.userService
      .getRiskAssessmentItem(this.unitKerjaId, this.worksheetId, this.riskId)
      .subscribe({
        next: (res) => {
          this.item = res?.data ?? null;
        },
        error: (err) => {
          this.item = null;
          this.ui.error(extractErrorMessage(err) || 'Gagal memuat detail risiko.');
        },
      });
  }

  private buildParams(resetPage: boolean): RiskMitigationListParams {
    if (resetPage) this.page = 1;
    return { page: this.page, limit: this.limit };
  }

  fetchMitigations(resetPage: boolean): void {
    if (!this.unitKerjaId || !this.worksheetId || !this.riskId) return;

    this.loading = true;
    this.errorMsg = '';

    this.userService
      .getRiskMitigations(
        this.unitKerjaId,
        this.worksheetId,
        this.riskId,
        this.buildParams(resetPage)
      )
      .subscribe({
        next: (res) => {
          this.mitigations = res.data ?? [];
          this.pagination = res.pagination ?? null;
          this.applyFilters();
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.mitigations = [];
          this.filteredMitigations = [];
          this.pagination = null;

          if (err?.status === 401) {
            this.errorMsg =
              'HTTP 401: Token tidak ada/invalid. Pastikan accessToken tersedia di localStorage.';
            this.ui.error(this.errorMsg);
            return;
          }

          this.errorMsg =
            extractErrorMessage(err) ||
            `Gagal fetch mitigasi risiko (HTTP ${err?.status || 'unknown'}).`;
          this.ui.error(this.errorMsg);
        },
      });
  }

  applyFilters(): void {
    const q = (this.q ?? '').trim().toLowerCase();
    let list = [...this.mitigations];

    if (this.fPriority !== 'ALL') {
      list = list.filter((x) => String(x.priority ?? '') === this.fPriority);
    }
    if (this.fStatus !== 'ALL') {
      list = list.filter((x) => String(x.status ?? '') === this.fStatus);
    }
    if (this.fValidated !== 'ALL') {
      list = list.filter((x) => this.getValidationStatus(x) === this.fValidated);
    }

    if (q) {
      list = list.filter((x) => {
        const code = String(x.code ?? '').toLowerCase();
        const name = String(x.name ?? '').toLowerCase();
        const desc = String(x.description ?? '').toLowerCase();
        const person = String(x.responsiblePerson ?? '').toLowerCase();
        const unit = String(x.responsibleUnit ?? '').toLowerCase();
        const notes = String(x.progressNotes ?? '').toLowerCase();
        return (
          code.includes(q) ||
          name.includes(q) ||
          desc.includes(q) ||
          person.includes(q) ||
          unit.includes(q) ||
          notes.includes(q)
        );
      });
    }

    this.filteredMitigations = list;
  }

  resetFilters(): void {
    this.q = '';
    this.fPriority = 'ALL';
    this.fStatus = 'ALL';
    this.fValidated = 'ALL';
    this.applyFilters();
  }

  openEdit(item: RiskMitigationItem): void {
    this.editTarget = item;
    this.editModel = {
      name: item.name || '',
      description: item.description || '',
      priority: item.priority || '',
      plannedStartDate: this.normalizeDateInput(item.plannedStartDate),
      plannedEndDate: this.normalizeDateInput(item.plannedEndDate),
    };
    this.showEditCard = true;
  }

  closeEdit(): void {
    this.showEditCard = false;
    this.editTarget = null;
  }

  get isEditValid(): boolean {
    return (
      !!String(this.editModel.name ?? '').trim() &&
      !!String(this.editModel.description ?? '').trim() &&
      !!String(this.editModel.priority ?? '').trim() &&
      !!String(this.editModel.plannedStartDate ?? '').trim() &&
      !!String(this.editModel.plannedEndDate ?? '').trim()
    );
  }

  submitEdit(): void {
    if (!this.unitKerjaId || !this.worksheetId || !this.riskId || !this.editTarget) return;
    if (!this.isEditValid) {
      this.ui.error('Lengkapi semua data sebelum menyimpan.');
      return;
    }

    const payload: UpdateRiskMitigationPayload = {
      name: String(this.editModel.name ?? '').trim(),
      description: String(this.editModel.description ?? '').trim(),
      priority: String(this.editModel.priority ?? '').trim(),
      plannedStartDate: String(this.editModel.plannedStartDate ?? '').trim(),
      plannedEndDate: String(this.editModel.plannedEndDate ?? '').trim(),
    };

    this.editSubmitting = true;
    this.userService
      .updateRiskMitigation(
        this.unitKerjaId,
        this.worksheetId,
        this.riskId,
        this.editTarget.id,
        payload
      )
      .subscribe({
        next: (res) => {
          this.editSubmitting = false;
          const updated = res?.data;
          if (updated) {
            this.mitigations = this.mitigations.map((x) =>
              x.id === updated.id ? updated : x
            );
            this.applyFilters();
          }
          this.ui.success('Mitigasi risiko berhasil diperbarui.');
          this.closeEdit();
        },
        error: (err) => {
          this.editSubmitting = false;
          this.ui.error(
            extractErrorMessage(err) ||
              'Gagal memperbarui mitigasi. Hanya pemilik kertas kerja yang dapat mengubah mitigasi.'
          );
        },
      });
  }

  openProgress(item: RiskMitigationItem): void {
    this.progressTarget = item;
    this.progressModel = {
      actualStartDate: this.normalizeDateInput(item.actualStartDate),
      actualEndDate: this.normalizeDateInput(item.actualEndDate),
      status: item.status || '',
      progressPercentage: item.progressPercentage ?? 0,
      progressNotes: item.progressNotes || '',
    };
    this.showProgressCard = true;
  }

  closeProgress(): void {
    this.showProgressCard = false;
    this.progressTarget = null;
  }

  get isProgressValid(): boolean {
    return (
      !!String(this.progressModel.status ?? '').trim() &&
      (this.progressModel.progressPercentage ?? 0) >= 0
    );
  }

  submitProgress(): void {
    if (!this.unitKerjaId || !this.worksheetId || !this.riskId || !this.progressTarget)
      return;
    if (!this.isProgressValid) {
      this.ui.error('Lengkapi data progress sebelum menyimpan.');
      return;
    }

    const payload: UpdateRiskMitigationPayload = {
      actualStartDate: String(this.progressModel.actualStartDate ?? '').trim() || null,
      actualEndDate: String(this.progressModel.actualEndDate ?? '').trim() || null,
      status: String(this.progressModel.status ?? '').trim(),
      progressPercentage: Number(this.progressModel.progressPercentage ?? 0),
      progressNotes: String(this.progressModel.progressNotes ?? '').trim(),
    };

    this.progressSubmitting = true;
    this.userService
      .updateRiskMitigation(
        this.unitKerjaId,
        this.worksheetId,
        this.riskId,
        this.progressTarget.id,
        payload
      )
      .subscribe({
        next: (res) => {
          this.progressSubmitting = false;
          const updated = res?.data;
          if (updated) {
            this.mitigations = this.mitigations.map((x) =>
              x.id === updated.id ? updated : x
            );
            this.applyFilters();
          }
          this.ui.success('Progress mitigasi berhasil diperbarui.');
          this.closeProgress();
        },
        error: (err) => {
          this.progressSubmitting = false;
          this.ui.error(
            extractErrorMessage(err) ||
              'Gagal memperbarui mitigasi. Hanya pemilik kertas kerja yang dapat mengubah mitigasi.'
          );
        },
      });
  }

  openDelete(item: RiskMitigationItem): void {
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
    if (!this.unitKerjaId || !this.worksheetId || !this.riskId || !this.deleteTarget)
      return;
    this.deleteSubmitting = true;
    this.userService
      .deleteRiskMitigation(
        this.unitKerjaId,
        this.worksheetId,
        this.riskId,
        this.deleteTarget.id
      )
      .subscribe({
        next: () => {
          this.deleteSubmitting = false;
          this.mitigations = this.mitigations.filter(
            (x) => x.id !== this.deleteTarget!.id
          );
          this.applyFilters();
          this.ui.success('Mitigasi risiko berhasil dihapus.');
          this.closeDelete();
        },
        error: (err) => {
          this.deleteSubmitting = false;
          this.deleteError =
            extractErrorMessage(err) ||
            'Gagal menghapus mitigasi. Hanya pemilik kertas kerja yang dapat menghapus mitigasi.';
        },
      });
  }

  openValidation(item: RiskMitigationItem, mode: 'VALIDATE' | 'REJECT'): void {
    this.validationTarget = item;
    this.validationMode = mode;
    this.validationNotes = '';
    this.validationError = '';
    this.showValidationModal = true;
  }

  closeValidation(): void {
    this.showValidationModal = false;
    this.validationTarget = null;
    this.validationNotes = '';
    this.validationError = '';
  }

  submitValidation(): void {
    if (
      !this.unitKerjaId ||
      !this.worksheetId ||
      !this.riskId ||
      !this.validationTarget
    ) {
      return;
    }

    this.validationSubmitting = true;
    const payload = { validationNotes: this.validationNotes.trim() };
    const request =
      this.validationMode === 'VALIDATE'
        ? this.userService.validateRiskMitigation(
            this.unitKerjaId,
            this.worksheetId,
            this.riskId,
            this.validationTarget.id,
            payload
          )
        : this.userService.rejectRiskMitigation(
            this.unitKerjaId,
            this.worksheetId,
            this.riskId,
            this.validationTarget.id,
            payload
          );

    request.subscribe({
      next: (res) => {
        this.validationSubmitting = false;
        const updated = res?.data;
        if (updated) {
          this.mitigations = this.mitigations.map((x) =>
            x.id === updated.id ? updated : x
          );
          this.applyFilters();
        }
        this.ui.success(
          this.validationMode === 'VALIDATE'
            ? 'Mitigasi risiko berhasil divalidasi.'
            : 'Mitigasi risiko berhasil ditolak.'
        );
        this.closeValidation();
      },
      error: (err) => {
        this.validationSubmitting = false;
        this.validationError =
          extractErrorMessage(err) || 'Access denied.';
      },
    });
  }

  openCreate(): void {
    this.showCreateCard = true;
    this.createErrors = {};
  }

  closeCreate(): void {
    this.showCreateCard = false;
    this.createErrors = {};
  }

  get isCreateValid(): boolean {
    return (
      !!this.createModel.name.trim() &&
      !!this.createModel.description.trim() &&
      !!this.createModel.priority &&
      !!this.createModel.plannedStartDate &&
      !!this.createModel.plannedEndDate &&
      !!this.createModel.responsiblePerson.trim() &&
      !!this.createModel.responsibleUnit.trim()
    );
  }

  submitCreate(): void {
    if (!this.unitKerjaId || !this.worksheetId || !this.riskId) return;
    if (!this.isCreateValid) {
      this.ui.error('Lengkapi semua data mitigasi.');
      return;
    }

    this.createSubmitting = true;
    const payload: CreateRiskMitigationPayload = {
      name: this.createModel.name.trim(),
      description: this.createModel.description.trim(),
      priority: this.createModel.priority,
      plannedStartDate: this.createModel.plannedStartDate,
      plannedEndDate: this.createModel.plannedEndDate,
      responsiblePerson: this.createModel.responsiblePerson.trim(),
      responsibleUnit: this.createModel.responsibleUnit.trim(),
    };

    this.userService
      .createRiskMitigation(this.unitKerjaId, this.worksheetId, this.riskId, payload)
      .subscribe({
        next: (res) => {
          this.createSubmitting = false;
          const created = res?.data;
          if (created) {
            this.mitigations = [created, ...this.mitigations];
            this.applyFilters();
          }
          this.ui.success('Mitigasi risiko berhasil ditambahkan.');
          this.closeCreate();
          this.fetchMitigations(true);
        },
        error: (err) => {
          this.createSubmitting = false;
          this.ui.error(extractErrorMessage(err) || 'Gagal menambah mitigasi.');
        },
      });
  }

  prevPage(): void {
    if (!this.pagination?.hasPrevPage) return;
    this.page = Math.max(1, this.page - 1);
    this.fetchMitigations(false);
  }

  nextPage(): void {
    if (!this.pagination?.hasNextPage) return;
    this.page = this.page + 1;
    this.fetchMitigations(false);
  }

  goToPage(pageNum: number): void {
    if (pageNum < 1 || pageNum > (this.pagination?.totalPages ?? 1)) return;
    this.page = pageNum;
    this.fetchMitigations(false);
  }

  onLimitChange(): void {
    this.page = 1;
    this.fetchMitigations(true);
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

  getThreatDescription(): string {
    if (!this.item) return '-';
    return (
      (this.item as { threatDescription?: string | null })?.threatDescription ||
      this.item.treatDescription ||
      '-'
    );
  }

  formatRiskLevel(level?: RiskLevel | null): string {
    return level ? String(level) : '-';
  }

  getTreatmentClass(option?: string | null): string {
    const normalized = String(option ?? '').toUpperCase();
    if (normalized === 'MITIGATE') return 'option-mitigate';
    if (normalized === 'ACCEPT') return 'option-accept';
    if (normalized === 'TRANSFER') return 'option-transfer';
    return 'option-neutral';
  }

  getRiskLevelClass(level?: RiskLevel | null): string {
    if (level === 'LOW') return 'level-low';
    if (level === 'MEDIUM') return 'level-medium';
    if (level === 'HIGH') return 'level-high';
    if (level === 'CRITICAL') return 'level-critical';
    return 'level-empty';
  }

  getPriorityClass(priority?: string | null): string {
    const normalized = String(priority ?? '').toUpperCase();
    if (normalized === 'LOW') return 'priority-low';
    if (normalized === 'MEDIUM') return 'priority-medium';
    if (normalized === 'HIGH') return 'priority-high';
    return 'priority-neutral';
  }

  getStatusClass(status?: string | null): string {
    const normalized = String(status ?? '').toUpperCase();
    if (normalized.includes('PLAN')) return 'status-planned';
    if (normalized.includes('PROGRESS')) return 'status-progress';
    if (normalized.includes('DONE') || normalized.includes('COMPLETE')) {
      return 'status-done';
    }
    return 'status-neutral';
  }

  getValidationStatus(item?: RiskMitigationItem | null): 'PENDING' | 'VALIDATED' | 'NOT_VALIDATED' {
    if (item?.validationStatus) {
      const normalized = String(item.validationStatus).toUpperCase();
      if (normalized === 'VALIDATED') return 'VALIDATED';
      if (normalized === 'NOT_VALIDATED' || normalized === 'NOT VALIDATED') {
        return 'NOT_VALIDATED';
      }
      if (normalized === 'PENDING') return 'PENDING';
    }
    if (item?.isValidated === true) return 'VALIDATED';
    if (item?.isValidated === false) return 'NOT_VALIDATED';
    return 'PENDING';
  }

  getValidationLabel(item?: RiskMitigationItem | null): string {
    const status = this.getValidationStatus(item);
    if (status === 'VALIDATED') return 'VALIDATED';
    if (status === 'NOT_VALIDATED') return 'NOT VALIDATED';
    return 'PENDING';
  }

  getValidationClass(item?: RiskMitigationItem | null): string {
    const status = this.getValidationStatus(item);
    if (status === 'VALIDATED') return 'status-validated';
    if (status === 'NOT_VALIDATED') return 'status-rejected';
    return 'status-neutral';
  }

  private normalizeDateInput(value?: string | null): string {
    if (!value) return '';
    const raw = String(value);
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return '';
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}
