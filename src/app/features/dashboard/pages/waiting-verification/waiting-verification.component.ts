import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { interval, Subscription } from 'rxjs';

import {
  ProfileService,
  MyProfileRequest,
  ProfileRequestStatus,
} from '../../../../core/services/profile.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UiService } from '../../../../core/services/ui.service';

@Component({
  selector: 'app-waiting-verification',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './waiting-verification.component.html',
  styleUrl: './waiting-verification.component.scss',
})
export class WaitingVerificationComponent implements OnInit, OnDestroy {
  loading = true;
  errorMsg = '';

  latestRequest: MyProfileRequest | null = null;
  pollingSubscription: Subscription | null = null;
  redirectCountdown = 0;
  private redirectTimer: number | null = null;

  // Polling interval in milliseconds (30 seconds)
  private readonly POLLING_INTERVAL = 30000;

  constructor(
    private profileService: ProfileService,
    private authService: AuthService,
    private router: Router,
    private ui: UiService
  ) {}

  ngOnInit(): void {
    this.fetchLatestRequest();
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.stopPolling();
    this.clearRejectionRedirect();
  }

  private fetchLatestRequest(): void {
    this.loading = true;
    this.errorMsg = '';

    this.profileService
      .getMyProfileRequests({ status: 'PENDING', page: 1, limit: 1 })
      .subscribe({
        next: (res) => {
          this.loading = false;

          if (res.data && res.data.length > 0) {
            this.latestRequest = res.data[0];
            this.updateRejectionRedirectState();
          } else {
            // No pending request, check for approved/rejected
            this.checkNonPendingRequests();
          }
        },
        error: (err) => {
          this.loading = false;

          // If 403 with mustCreateProfile, redirect to create profile
          if (err?.status === 403 && err?.error?.mustCreateProfile) {
            this.router.navigate(['/auth/create-profile']);
            return;
          }

          if (
            err?.status === 404 ||
            String(err?.error?.message || '').toLowerCase().includes('profile tidak ditemukan')
          ) {
            this.ui.clearToast();
            this.ui.infoPersistent('Pembuatan profil anda ditolak');
            this.router.navigate(['/auth/create-profile']);
            return;
          }

          this.errorMsg =
            err?.error?.errors ||
            err?.error?.message ||
            'Gagal memuat status verifikasi.';
        },
      });
  }

  private checkNonPendingRequests(): void {
    // Check if there's an approved request (profile verified)
    this.profileService
      .getMyProfileRequests({ page: 1, limit: 1 })
      .subscribe({
        next: (res) => {
          if (res.data && res.data.length > 0) {
            const latest = res.data[0];
            this.latestRequest = latest;

          if (latest.status === 'APPROVED') {
            // Profile is verified, redirect to dashboard
            this.ui.success('Profile Anda telah diverifikasi!', 'Berhasil');
            this.router.navigate(['/dashboard']);
            return;
          }

          if (
            latest.status === 'REJECTED' &&
            latest.requestType === 'INITIAL_VERIFICATION'
          ) {
            this.ui.clearToast();
            this.ui.infoPersistent('Pembuatan profil anda ditolak');
            this.router.navigate(['/auth/create-profile']);
            return;
          }

          this.updateRejectionRedirectState();
        } else {
          // No requests at all, redirect to create profile
          this.router.navigate(['/auth/create-profile']);
        }
        },
        error: (err) => {
          if (
            err?.status === 404 ||
            String(err?.error?.message || '').toLowerCase().includes('profile tidak ditemukan')
          ) {
            this.ui.clearToast();
            this.ui.infoPersistent('Pembuatan profil anda ditolak');
            this.router.navigate(['/auth/create-profile']);
            return;
          }

          this.errorMsg = 'Gagal memuat status verifikasi.';
        },
      });
  }

  private startPolling(): void {
    this.pollingSubscription = interval(this.POLLING_INTERVAL).subscribe(() => {
      this.checkVerificationStatus();
    });
  }

  private stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
  }

  private checkVerificationStatus(): void {
    if (!this.latestRequest) return;

    this.profileService.getMyProfileRequestDetail(this.latestRequest.id).subscribe({
      next: (res) => {
        const updatedRequest = res.data;

        if (updatedRequest.status !== 'PENDING') {
          this.latestRequest = updatedRequest;
          this.stopPolling();

          if (updatedRequest.status === 'APPROVED') {
            this.ui.success('Profile Anda telah diverifikasi!', 'Berhasil');
            // Update local storage
            localStorage.setItem('hasProfile', 'true');
            localStorage.setItem('profileVerified', 'true');
            this.router.navigate(['/dashboard']);
            return;
          }

          if (
            updatedRequest.status === 'REJECTED' &&
            updatedRequest.requestType === 'INITIAL_VERIFICATION'
          ) {
            this.ui.clearToast();
            this.ui.info('Profil kamu ditolak');
            this.router.navigate(['/auth/create-profile']);
            return;
          }

          this.updateRejectionRedirectState();
        }
      },
      error: (err) => {
          if (
            err?.status === 404 ||
            String(err?.error?.message || '').toLowerCase().includes('profile tidak ditemukan')
          ) {
            this.stopPolling();
            this.ui.clearToast();
            this.ui.infoPersistent('Pembuatan profil anda ditolak');
            this.router.navigate(['/auth/create-profile']);
          }
      },
    });
  }

  refreshStatus(): void {
    this.fetchLatestRequest();
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/auth/login']);
      },
      error: () => {
        this.router.navigate(['/auth/login']);
      },
    });
  }

  getStatusLabel(status: ProfileRequestStatus): string {
    switch (status) {
      case 'PENDING':
        return 'Menunggu Verifikasi';
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

  formatDate(dateString: string | null): string {
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

  private updateRejectionRedirectState(): void {
    if (
      this.latestRequest?.status === 'REJECTED' &&
      this.latestRequest.requestType === 'CHANGE'
    ) {
      this.scheduleRejectionRedirect();
      return;
    }

    this.clearRejectionRedirect();
  }

  private scheduleRejectionRedirect(): void {
    if (this.redirectTimer !== null) return;
    this.redirectCountdown = 5;

    this.redirectTimer = window.setInterval(() => {
      this.redirectCountdown -= 1;
      if (this.redirectCountdown <= 0) {
        this.clearRejectionRedirect();
        this.router.navigate(['/dashboard/profile']);
      }
    }, 1000);
  }

  private clearRejectionRedirect(): void {
    if (this.redirectTimer !== null) {
      window.clearInterval(this.redirectTimer);
      this.redirectTimer = null;
    }
    this.redirectCountdown = 0;
  }
}
