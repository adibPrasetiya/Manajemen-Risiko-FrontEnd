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
          } else {
            // No pending request, check for approved/rejected
            this.checkNonPendingRequests();
          }
        },
        error: (err) => {
          this.loading = false;

          // If 403 with mustCreateProfile, redirect to create profile
          if (err?.status === 403 && err?.error?.mustCreateProfile) {
            this.router.navigate(['/dashboard/create-profile']);
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
            }
          } else {
            // No requests at all, redirect to create profile
            this.router.navigate(['/dashboard/create-profile']);
          }
        },
        error: () => {
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
          }
        }
      },
      error: () => {
        // Silent error on polling
      },
    });
  }

  refreshStatus(): void {
    this.fetchLatestRequest();
  }

  viewRequestHistory(): void {
    this.router.navigate(['/dashboard/profile']);
  }

  submitNewRequest(): void {
    this.router.navigate(['/dashboard/profile']);
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        localStorage.clear();
        this.router.navigate(['/auth/login']);
      },
      error: () => {
        localStorage.clear();
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
}
