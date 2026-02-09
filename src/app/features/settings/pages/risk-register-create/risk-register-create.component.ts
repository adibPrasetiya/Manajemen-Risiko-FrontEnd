import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { KonteksService } from '../../../../core/services/konteks.service';
import { ProfileService } from '../../../../core/services/profile.service';
import { UiService } from '../../../../core/services/ui.service';
import { AssetItem, RiskTreatmentOption, UserService } from '../../../../core/services/user.service';
import {
  ImpactScale,
  LikelihoodScale,
  RiskCategory,
  RiskLevel,
  RiskMatrixItem,
} from '../../../../core/models/konteks.model';
import { extractErrorMessage } from '../../../../core/utils/error-utils';

type StepKey = 1 | 2 | 3;

@Component({
  selector: 'app-risk-register-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './risk-register-create.component.html',
  styleUrl: './risk-register-create.component.scss',
})
export class RiskRegisterCreateComponent implements OnInit {
  loading = false;
  errorMsg = '';

  currentStep: StepKey = 1;

  unitKerjaId = '';
  worksheetId = '';
  konteksId = '';
  private profileLoaded = false;

  assets: AssetItem[] = [];
  riskCategories: RiskCategory[] = [];
  likelihoodScales: LikelihoodScale[] = [];
  impactScales: ImpactScale[] = [];
  riskMatrices: RiskMatrixItem[] = [];

  form = {
    riskName: '',
    riskCategoryId: '',
    assetId: '',
    weaknessDescription: '',
    treatDescription: '',
    impactDescription: '',

    inherentLikelihoodId: '',
    inherentLikelihoodLevel: 0,
    inherentLikelihoodDesc: '',
    inherentImpactId: '',
    inherentImpactLevel: 0,
    inherentImpactDesc: '',

    existingControls: '',
    controlEffectiveness: '',

    residualLikelihoodId: '',
    residualLikelihoodLevel: 0,
    residualLikelihoodDesc: '',
    residualImpactId: '',
    residualImpactLevel: 0,
    residualImpactDesc: '',

    treatmentOption: '' as RiskTreatmentOption | '',
    treatmentRationale: '',
    riskPriorityRank: '' as RiskLevel | '',
    additionalDescription: '',
  };

  constructor(
    private profileService: ProfileService,
    private konteksService: KonteksService,
    private userService: UserService,
    private route: ActivatedRoute,
    private router: Router,
    private ui: UiService
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.worksheetId = params.get('worksheetId') || '';
      this.konteksId = params.get('konteksId') || '';

      if (this.profileLoaded) {
        if (this.konteksId) {
          this.fetchKonteksData(this.konteksId);
        } else if (this.worksheetId) {
          this.fetchWorksheetKonteks();
        } else {
          this.fetchFirstWorksheetKonteks();
        }
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
        this.unitKerjaId = unitKerja?.id || '';
        if (!this.unitKerjaId) {
          this.loading = false;
          this.errorMsg = 'Unit kerja tidak ditemukan pada profil.';
          this.ui.error(this.errorMsg);
          return;
        }

        this.profileLoaded = true;
        this.fetchAssets();

        if (this.worksheetId) {
          this.fetchWorksheetKonteks();
        } else if (this.konteksId) {
          this.fetchKonteksData(this.konteksId);
        } else {
          const saved = localStorage.getItem('lastRiskKonteksId') || '';
          if (saved) {
            this.konteksId = saved;
            this.fetchKonteksData(saved);
          } else {
            this.fetchFirstWorksheetKonteks();
          }
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = extractErrorMessage(err) || 'Gagal memuat profil pengguna.';
        this.ui.error(this.errorMsg);
      },
    });
  }

  private fetchWorksheetKonteks(): void {
    if (!this.unitKerjaId || !this.worksheetId) {
      this.loading = false;
      return;
    }

    this.userService.getRiskWorksheetById(this.unitKerjaId, this.worksheetId).subscribe({
      next: (res) => {
        const konteksId = res?.data?.konteks?.id || '';
        if (konteksId) {
          this.konteksId = konteksId;
          this.fetchKonteksData(konteksId);
        } else if (this.konteksId) {
          this.fetchKonteksData(this.konteksId);
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  private fetchFirstWorksheetKonteks(): void {
    if (!this.unitKerjaId) {
      this.loading = false;
      return;
    }

    this.userService.getRiskWorksheets(this.unitKerjaId, { page: 1, limit: 1 }).subscribe({
      next: (res) => {
        const first = res?.data?.[0];
        const konteksId = first?.konteks?.id || '';
        if (konteksId) {
          this.konteksId = konteksId;
          this.fetchKonteksData(konteksId);
          this.loading = false;
          return;
        }
        if (first?.id) {
          this.userService.getRiskWorksheetById(this.unitKerjaId, first.id).subscribe({
            next: (detail) => {
              const detailKonteksId = detail?.data?.konteks?.id || '';
              if (detailKonteksId) {
                this.konteksId = detailKonteksId;
                this.fetchKonteksData(detailKonteksId);
              } else {
                this.errorMsg = 'Konteks tidak ditemukan untuk memuat kategori risiko.';
              }
              this.loading = false;
            },
            error: () => {
              this.loading = false;
              this.errorMsg = 'Gagal memuat konteks untuk kategori risiko.';
            },
          });
          return;
        }
        this.errorMsg = 'Konteks tidak ditemukan untuk memuat kategori risiko.';
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'Gagal memuat konteks untuk kategori risiko.';
      },
    });
  }

  private fetchAssets(): void {
    this.userService.getAssets(this.unitKerjaId, { page: 1, limit: 100 }).subscribe({
      next: (res) => {
        const list = res.data ?? [];
        this.assets = [...list].sort((a, b) => a.name.localeCompare(b.name));
      },
      error: () => {
        this.assets = [];
      },
    });
  }

  private fetchKonteksData(konteksId: string): void {
    this.fetchRiskCategories(konteksId);
    this.fetchRiskMatrices(konteksId);
  }

  private fetchRiskCategories(konteksId: string): void {
    this.konteksService.getRiskCategories(konteksId, { page: 1, limit: 100 }).subscribe({
      next: (res) => {
        const list = res.data ?? [];
        this.riskCategories = [...list].sort((a, b) => {
          const aOrder = a.order ?? 0;
          const bOrder = b.order ?? 0;
          if (aOrder !== bOrder) return aOrder - bOrder;
          return a.name.localeCompare(b.name);
        });
        if (this.riskCategories.length === 0) {
          const saved = localStorage.getItem('lastRiskKonteksId') || '';
          if (saved && saved !== konteksId) {
            this.konteksId = saved;
            this.fetchKonteksData(saved);
          }
        }
      },
      error: (err) => {
        this.riskCategories = [];
        const status = err?.status ? `HTTP ${err.status}` : 'unknown';
        this.errorMsg = `Gagal memuat kategori risiko (${status}).`;
        console.error('fetchRiskCategories failed', { konteksId, err });
      },
    });
  }

  private fetchRiskMatrices(konteksId: string): void {
    this.konteksService.getRiskMatrices(konteksId, { page: 1, limit: 100 }).subscribe({
      next: (res) => {
        this.riskMatrices = res.data ?? [];
      },
      error: () => {
        this.riskMatrices = [];
      },
    });
  }

  onCategoryChange(): void {
    if (!this.konteksId || !this.form.riskCategoryId) return;

    this.konteksService
      .getLikelihoodScales(this.konteksId, this.form.riskCategoryId, {
        page: 1,
        limit: 100,
      })
      .subscribe({
        next: (res) => {
          this.likelihoodScales = res.data ?? [];
        },
        error: () => {
          this.likelihoodScales = [];
        },
      });

    this.konteksService
      .getImpactScales(this.konteksId, this.form.riskCategoryId, {
        page: 1,
        limit: 100,
      })
      .subscribe({
        next: (res) => {
          this.impactScales = res.data ?? [];
        },
        error: () => {
          this.impactScales = [];
        },
      });
  }

  onInherentLikelihoodChange(): void {
    const picked = this.likelihoodScales.find((x) => x.id === this.form.inherentLikelihoodId);
    this.form.inherentLikelihoodLevel = picked?.level ?? 0;
  }

  onInherentImpactChange(): void {
    const picked = this.impactScales.find((x) => x.id === this.form.inherentImpactId);
    this.form.inherentImpactLevel = picked?.level ?? 0;
  }

  onResidualLikelihoodChange(): void {
    const picked = this.likelihoodScales.find((x) => x.id === this.form.residualLikelihoodId);
    this.form.residualLikelihoodLevel = picked?.level ?? 0;
  }

  onResidualImpactChange(): void {
    const picked = this.impactScales.find((x) => x.id === this.form.residualImpactId);
    this.form.residualImpactLevel = picked?.level ?? 0;
  }

  get inherentRiskLevel(): RiskLevel | null {
    return this.resolveRiskLevel(this.form.inherentLikelihoodLevel, this.form.inherentImpactLevel);
  }

  get residualRiskLevel(): RiskLevel | null {
    return this.resolveRiskLevel(this.form.residualLikelihoodLevel, this.form.residualImpactLevel);
  }

  private resolveRiskLevel(like: number, impact: number): RiskLevel | null {
    if (!like || !impact) return null;
    const hit = this.riskMatrices.find(
      (x) => x.likelihoodLevel === like && x.impactLevel === impact
    );
    return hit?.riskLevel ?? null;
  }

  getRiskLevelClass(level?: RiskLevel | null): string {
    if (level === 'LOW') return 'level-low';
    if (level === 'MEDIUM') return 'level-medium';
    if (level === 'HIGH') return 'level-high';
    if (level === 'CRITICAL') return 'level-critical';
    return 'level-empty';
  }

  get treatmentOptions(): RiskTreatmentOption[] {
    const level = this.inherentRiskLevel;
    if (level === 'HIGH' || level === 'CRITICAL') {
      return ['MITIGATE', 'TRANSFER'];
    }
    return ['MITIGATE', 'ACCEPT', 'TRANSFER'];
  }

  get isStep1Card1Valid(): boolean {
    return (
      !!this.form.riskCategoryId &&
      !!this.form.assetId
    );
  }

  get isStep1Card2Valid(): boolean {
    return (
      !!this.form.riskName.trim() &&
      !!this.form.weaknessDescription.trim() &&
      !!this.form.treatDescription.trim() &&
      !!this.form.impactDescription.trim()
    );
  }

  get isStep2Card1Valid(): boolean {
    return (
      !!this.form.existingControls.trim() &&
      !!this.form.controlEffectiveness
    );
  }

  get isStep2Card2Valid(): boolean {
    return (
      !!this.form.inherentLikelihoodId &&
      !!this.form.inherentLikelihoodDesc.trim() &&
      !!this.form.inherentImpactId &&
      !!this.form.inherentImpactDesc.trim()
    );
  }

  get isStep3Card1Valid(): boolean {
    return !!this.form.treatmentOption && !!this.form.treatmentRationale.trim();
  }

  goToStep(step: StepKey): void {
    if (step < this.currentStep) {
      this.currentStep = step;
      return;
    }
    if (step === 2 && this.isStep1Card1Valid && this.isStep1Card2Valid) {
      this.currentStep = step;
    }
    if (
      step === 3 &&
      this.isStep1Card1Valid &&
      this.isStep1Card2Valid &&
      this.isStep2Card1Valid &&
      this.isStep2Card2Valid
    ) {
      this.currentStep = step;
    }
  }

  nextStep(): void {
    if (this.currentStep === 1 && this.isStep1Card1Valid && this.isStep1Card2Valid) {
      this.currentStep = 2;
      return;
    }
    if (this.currentStep === 2 && this.isStep2Card1Valid && this.isStep2Card2Valid) {
      this.currentStep = 3;
    }
  }

  prevStep(): void {
    if (this.currentStep === 2) this.currentStep = 1;
    else if (this.currentStep === 3) this.currentStep = 2;
  }

  submit(): void {
    if (
      !this.isStep1Card1Valid ||
      !this.isStep1Card2Valid ||
      !this.isStep2Card1Valid ||
      !this.isStep2Card2Valid ||
      !this.isStep3Card1Valid
    ) {
      this.ui.error('Lengkapi semua data sebelum menyimpan.');
      return;
    }

    if (!this.unitKerjaId || !this.worksheetId) {
      this.ui.error('Worksheet belum dipilih. Kembali ke Risk Register dan pilih worksheet.');
      return;
    }

    const payload = {
      riskName: this.form.riskName.trim(),
      assetId: this.form.assetId,
      riskCategoryId: this.form.riskCategoryId,
      weaknessDescription: this.form.weaknessDescription.trim(),
      treatDescription: this.form.treatDescription.trim(),
      impactDescription: this.form.impactDescription.trim(),
      inherentLikelihood: this.form.inherentLikelihoodLevel,
      inherentImpact: this.form.inherentImpactLevel,
      inherentLikelihoodDescription: this.form.inherentLikelihoodDesc.trim(),
      inherentImpactDescription: this.form.inherentImpactDesc.trim(),
      existingControls: this.form.existingControls.trim(),
      controlEffectiveness: this.form.controlEffectiveness,
      treatmentOption: this.form.treatmentOption as RiskTreatmentOption,
      treatmentRationale: this.form.treatmentRationale.trim(),
      riskPriorityRank: Number(this.form.riskPriorityRank) || 1,
    };

    this.loading = true;
    this.userService
      .createRiskAssessmentItem(this.unitKerjaId, this.worksheetId, payload)
      .subscribe({
        next: () => {
          this.loading = false;
          this.ui.success('Item risiko berhasil ditambahkan.');
          this.router.navigate(['/settings/risk-register'], {
            queryParams: { worksheetId: this.worksheetId },
          });
        },
        error: (err) => {
          this.loading = false;
          this.ui.error(extractErrorMessage(err) || 'Gagal menambah risiko.');
        },
      });
  }
}
