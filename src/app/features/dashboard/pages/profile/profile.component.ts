import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  ElementRef,
  ViewChild,
  HostListener,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  FormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';

import {
  ProfileService,
  MyProfileRequest,
  ProfileRequestStatus,
  ProfileRequestType,
  MyProfileRequestsQueryParams,
  GetMyProfileResponse,
} from '../../../../core/services/profile.service';
import {
  UnitKerjaService,
  UnitKerja,
} from '../../../../core/services/unit-kerja.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UiService } from '../../../../core/services/ui.service';

type TabType = 'info' | 'edit' | 'history';

type ProfileData = GetMyProfileResponse['data'];

type Pagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  @ViewChild('unitInput') unitInput!: ElementRef<HTMLInputElement>;

  // Tab state
  activeTab: TabType = 'info';

  // Profile data
  profile: ProfileData | null = null;
  loadingProfile = true;
  profileError = '';

  // Requests data
  requests: MyProfileRequest[] = [];
  loadingRequests = false;
  requestsError = '';
  pagination: Pagination | null = null;

  // Filters for history tab
  fStatus: ProfileRequestStatus | 'ALL' = 'ALL';
  page = 1;
  limit = 10;

  // Pending request check
  pendingRequest: MyProfileRequest | null = null;

  // Phone edit form
  phoneForm = this.fb.group({
    nomorHP: ['', [Validators.pattern(/^(08|62)[0-9]{8,13}$/)]],
  });
  savingPhone = false;

  // Change request form
  changeRequestForm = this.fb.group({
    jabatan: ['', [Validators.minLength(3), Validators.maxLength(255)]],
    unitKerja: [''],
    nomorHP: ['', [Validators.pattern(/^(08|62)[0-9]{8,13}$/)]],
  });
  submittingRequest = false;
  requestError = '';

  // Unit Kerja dropdown
  filteredUnitKerja: UnitKerja[] = [];
  showUnitDropdown = false;
  selectedUnitKerjaId = '';

  // Modals
  showPasswordModal = false;
  showDetailModal = false;
  selectedRequest: MyProfileRequest | null = null;
  showCancelConfirm = false;
  cancelTargetId = '';
  cancelLoading = false;

  // Password form
  passwordForm = this.fb.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });
  passError = '';
  savingPassword = false;

  constructor(
    private fb: FormBuilder,
    private profileService: ProfileService,
    private unitKerjaService: UnitKerjaService,
    private authService: AuthService,
    private router: Router,
    private ui: UiService,
  ) {}

  ngOnInit(): void {
    this.loadProfile();
    this.checkPendingRequest();
  }

  // ============ PROFILE LOADING ============

  loadProfile(): void {
    this.loadingProfile = true;
    this.profileError = '';

    this.profileService.getMyProfile().subscribe({
      next: (res) => {
        this.profile = res.data;
        this.loadingProfile = false;

        // Pre-fill phone form
        if (this.profile.nomorHP) {
          this.phoneForm.patchValue({ nomorHP: this.profile.nomorHP });
        }
      },
      error: (err) => {
        this.loadingProfile = false;

        // If 403 with mustCreateProfile, redirect to create profile page
        if (err?.status === 403 && err?.error?.mustCreateProfile) {
          this.router.navigate(['/dashboard/create-profile']);
          return;
        }

        // If 403 with mustVerifyProfile, redirect to waiting verification
        if (err?.status === 403 && err?.error?.mustVerifyProfile) {
          this.router.navigate(['/dashboard/waiting-verification']);
          return;
        }

        this.profileError =
          err?.error?.errors ||
          err?.error?.message ||
          'Gagal memuat data profile.';
      },
    });
  }

  checkPendingRequest(): void {
    this.profileService
      .getMyProfileRequests({ status: 'PENDING', page: 1, limit: 1 })
      .subscribe({
        next: (res) => {
          this.pendingRequest = res.data?.[0] || null;
        },
        error: () => {
          this.pendingRequest = null;
        },
      });
  }

  // ============ TAB NAVIGATION ============

  switchTab(tab: TabType): void {
    this.activeTab = tab;

    if (tab === 'history' && this.requests.length === 0) {
      this.fetchRequests(true);
    }
  }

  // ============ PHONE UPDATE ============

  savePhone(): void {
    if (this.phoneForm.invalid) {
      this.phoneForm.markAllAsTouched();
      return;
    }

    const nomorHP = (this.phoneForm.value.nomorHP ?? '').trim();

    // If empty and profile has no phone, nothing to update
    if (!nomorHP && !this.profile?.nomorHP) {
      return;
    }

    this.savingPhone = true;

    this.profileService
      .updateProfile({ nomorHP: nomorHP || undefined })
      .subscribe({
        next: (res) => {
          this.savingPhone = false;
          if (this.profile) {
            this.profile = { ...this.profile, nomorHP: res.data.nomorHP };
          }
          this.ui.success('Nomor HP berhasil diperbarui.', 'Berhasil');
        },
        error: (err) => {
          this.savingPhone = false;
          this.ui.error(
            err?.error?.errors ||
              err?.error?.message ||
              'Gagal memperbarui nomor HP.',
            'Gagal',
          );
        },
      });
  }

  // ============ CHANGE REQUEST ============

  onUnitFocus(): void {
    if (this.selectedUnitKerjaId) {
      this.showUnitDropdown = false;
      return;
    }
    this.onUnitInput();
  }

  onUnitInput(): void {
    const q = (this.changeRequestForm.value.unitKerja ?? '').trim();
    this.selectedUnitKerjaId = '';

    this.unitKerjaService.search(q).subscribe({
      next: (list) => {
        this.filteredUnitKerja = list;
        this.showUnitDropdown = true;
      },
      error: () => {
        this.filteredUnitKerja = [];
        this.showUnitDropdown = true;
      },
    });
  }

  pickUnit(u: UnitKerja): void {
    this.changeRequestForm.patchValue({ unitKerja: u.name });
    this.selectedUnitKerjaId = u.id;
    this.showUnitDropdown = false;
    this.filteredUnitKerja = [];
  }

  submitChangeRequest(): void {
    this.requestError = '';

    const jabatan = (this.changeRequestForm.value.jabatan ?? '').trim();
    const nomorHP = (this.changeRequestForm.value.nomorHP ?? '').trim();
    const unitKerjaId = this.selectedUnitKerjaId;

    // At least one field must be provided
    if (!jabatan && !unitKerjaId && !nomorHP) {
      this.requestError = 'Minimal satu field harus diisi.';
      return;
    }

    // Validate jabatan if provided
    if (jabatan && (jabatan.length < 3 || jabatan.length > 255)) {
      this.requestError = 'Jabatan harus antara 3-255 karakter.';
      return;
    }

    // Validate nomorHP if provided
    if (nomorHP && !/^(08|62)[0-9]{8,13}$/.test(nomorHP)) {
      this.requestError =
        'Format nomor HP tidak valid (contoh: 08xxx atau 62xxx).';
      return;
    }

    // Validate unitKerja if text is entered but not selected from dropdown
    const unitKerjaText = (this.changeRequestForm.value.unitKerja ?? '').trim();
    if (unitKerjaText && !unitKerjaId) {
      this.requestError = 'Unit kerja harus dipilih dari daftar.';
      return;
    }

    const payload: any = {};
    if (jabatan) payload.jabatan = jabatan;
    if (unitKerjaId) payload.unitKerjaId = unitKerjaId;
    if (nomorHP) payload.nomorHP = nomorHP;

    this.submittingRequest = true;

    this.profileService.createProfileRequest(payload).subscribe({
      next: () => {
        this.submittingRequest = false;
        this.changeRequestForm.reset();
        this.selectedUnitKerjaId = '';
        this.ui.success('Permintaan perubahan berhasil diajukan.', 'Berhasil');
        this.checkPendingRequest();

        // Refresh history if on history tab
        if (this.activeTab === 'history') {
          this.fetchRequests(true);
        }
      },
      error: (err) => {
        this.submittingRequest = false;

        if (err?.status === 409) {
          this.requestError =
            'Anda sudah memiliki permintaan yang sedang menunggu. Batalkan atau tunggu hingga diproses.';
          return;
        }

        this.requestError =
          err?.error?.errors ||
          err?.error?.message ||
          'Gagal mengajukan permintaan.';
      },
    });
  }

  // ============ REQUEST HISTORY ============

  fetchRequests(resetPage: boolean): void {
    this.loadingRequests = true;
    this.requestsError = '';

    if (resetPage) this.page = 1;

    const params: MyProfileRequestsQueryParams = {
      page: this.page,
      limit: this.limit,
    };

    if (this.fStatus !== 'ALL') {
      params.status = this.fStatus;
    }

    this.profileService.getMyProfileRequests(params).subscribe({
      next: (res) => {
        this.requests = res.data ?? [];
        this.pagination = res.pagination ?? null;
        this.loadingRequests = false;
      },
      error: (err) => {
        this.loadingRequests = false;
        this.requests = [];
        this.pagination = null;
        this.requestsError =
          err?.error?.errors ||
          err?.error?.message ||
          'Gagal memuat riwayat permintaan.';
      },
    });
  }

  applyFilters(): void {
    this.fetchRequests(true);
  }

  resetFilters(): void {
    this.fStatus = 'ALL';
    this.fetchRequests(true);
  }

  // Pagination
  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.fetchRequests(false);
    }
  }

  nextPage(): void {
    if (this.pagination && this.page < this.pagination.totalPages) {
      this.page++;
      this.fetchRequests(false);
    }
  }

  goToPage(pageNum: number): void {
    if (pageNum < 1 || pageNum > (this.pagination?.totalPages ?? 1)) return;
    this.page = pageNum;
    this.fetchRequests(false);
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

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < total - 1) pages.push(-1);

    if (total > 1) pages.push(total);

    return pages;
  }

  // Detail modal
  viewDetail(request: MyProfileRequest): void {
    this.selectedRequest = request;
    this.showDetailModal = true;
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedRequest = null;
  }

  // Cancel request
  confirmCancel(requestId: string): void {
    this.cancelTargetId = requestId;
    this.showCancelConfirm = true;
  }

  closeCancelConfirm(): void {
    this.showCancelConfirm = false;
    this.cancelTargetId = '';
  }

  executeCancel(): void {
    if (!this.cancelTargetId) return;

    this.cancelLoading = true;

    this.profileService.cancelMyProfileRequest(this.cancelTargetId).subscribe({
      next: () => {
        this.cancelLoading = false;
        this.closeCancelConfirm();
        this.closeDetailModal();
        this.ui.success('Permintaan berhasil dibatalkan.', 'Berhasil');
        this.checkPendingRequest();
        this.fetchRequests(false);
      },
      error: (err) => {
        this.cancelLoading = false;
        this.ui.error(
          err?.error?.errors ||
            err?.error?.message ||
            'Gagal membatalkan permintaan.',
          'Gagal',
        );
      },
    });
  }

  // ============ PASSWORD CHANGE ============

  openPasswordModal(): void {
    this.passwordForm.reset();
    this.passError = '';
    this.showPasswordModal = true;
  }

  closePasswordModal(): void {
    this.showPasswordModal = false;
    this.passError = '';
  }

  changePassword(): void {
    this.passError = '';

    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const currentPassword = this.passwordForm.value.currentPassword ?? '';
    const newPassword = this.passwordForm.value.newPassword ?? '';
    const confirmPassword = this.passwordForm.value.confirmPassword ?? '';

    if (newPassword !== confirmPassword) {
      this.passError = 'Konfirmasi password tidak sama dengan password baru.';
      return;
    }

    this.savingPassword = true;

    this.authService.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.savingPassword = false;
        this.passwordForm.reset();
        this.closePasswordModal();
        this.ui.success('Password berhasil diubah.', 'Berhasil');
      },
      error: (e) => {
        this.savingPassword = false;

        const rawMsg = (e?.error?.errors || e?.error?.message || '')
          .toString()
          .toLowerCase();

        if (
          e?.status === 400 ||
          e?.status === 401 ||
          rawMsg.includes('current') ||
          rawMsg.includes('password')
        ) {
          this.passError = 'Password saat ini tidak tepat.';
          return;
        }

        this.passError =
          e?.error?.errors ||
          e?.error?.message ||
          'Gagal mengubah password. Coba lagi.';
      },
    });
  }

  // ============ HELPERS ============

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'ADMINISTRATOR':
        return 'badge-admin';
      case 'RISK_OWNER':
        return 'badge-owner';
      case 'RISK_OFFICER':
        return 'badge-officer';
      default:
        return 'badge-default';
    }
  }

  getRoleLabel(role: string): string {
    switch (role) {
      case 'ADMINISTRATOR':
        return 'Administrator';
      case 'RISK_OWNER':
        return 'Risk Owner';
      case 'RISK_OFFICER':
        return 'Risk Officer';
      case 'USER':
        return 'User';
      default:
        return role;
    }
  }

  getStatusLabel(status: ProfileRequestStatus): string {
    switch (status) {
      case 'PENDING':
        return 'Menunggu';
      case 'APPROVED':
        return 'Disetujui';
      case 'REJECTED':
        return 'Ditolak';
      default:
        return status;
    }
  }

  getStatusClass(status: ProfileRequestStatus): string {
    switch (status) {
      case 'PENDING':
        return 'status-pending';
      case 'APPROVED':
        return 'status-approved';
      case 'REJECTED':
        return 'status-rejected';
      default:
        return '';
    }
  }

  getRequestTypeLabel(type: ProfileRequestType): string {
    switch (type) {
      case 'INITIAL_VERIFICATION':
        return 'Verifikasi Awal';
      case 'CHANGE':
        return 'Perubahan Data';
      default:
        return type;
    }
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatDateLong(dateString: string | null): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  trackById(_: number, item: MyProfileRequest): string {
    return item.id;
  }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent): void {
    const target = ev.target as HTMLElement | null;
    if (!target) return;

    const insideUnit = target.closest('.unit-wrapper') !== null;
    if (!insideUnit) this.showUnitDropdown = false;
  }
}
