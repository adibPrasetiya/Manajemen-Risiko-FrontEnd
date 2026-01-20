import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ProfileRequest } from '../../../../core/services/profile-request.service';

@Component({
  selector: 'app-request-detail-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './request-detail-modal.component.html',
  styleUrl: './request-detail-modal.component.scss',
})
export class RequestDetailModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() request: ProfileRequest | null = null;
  @Input() loading = false;
  @Input() error = '';

  @Output() close = new EventEmitter<void>();
  @Output() approve = new EventEmitter<string>();
  @Output() reject = new EventEmitter<{ requestId: string; reason: string }>();

  // Rejection form
  showRejectForm = false;
  rejectionReason = '';
  validationError = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && !this.isOpen) {
      this.resetForm();
    }
  }

  private resetForm(): void {
    this.showRejectForm = false;
    this.rejectionReason = '';
    this.validationError = '';
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.onClose();
    }
  }

  onClose(): void {
    this.resetForm();
    this.close.emit();
  }

  onApprove(): void {
    if (!this.request || this.loading) return;
    this.approve.emit(this.request.id);
  }

  toggleRejectForm(): void {
    this.showRejectForm = !this.showRejectForm;
    if (!this.showRejectForm) {
      this.rejectionReason = '';
      this.validationError = '';
    }
  }

  onReject(): void {
    if (!this.request || this.loading) return;

    this.validationError = '';

    // Validate rejection reason
    const reason = this.rejectionReason.trim();
    if (!reason) {
      this.validationError = 'Rejection reason is required.';
      return;
    }
    if (reason.length < 10) {
      this.validationError = 'Rejection reason must be at least 10 characters.';
      return;
    }
    if (reason.length > 500) {
      this.validationError = 'Rejection reason must not exceed 500 characters.';
      return;
    }

    this.reject.emit({
      requestId: this.request.id,
      reason: reason,
    });
  }

  getRequestTypeLabel(type: string): string {
    switch (type) {
      case 'INITIAL_VERIFICATION':
        return 'Initial Verification';
      case 'CHANGE':
        return 'Profile Change';
      default:
        return type;
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'Pending';
      case 'APPROVED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
      default:
        return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'yellow';
      case 'APPROVED':
        return 'green';
      case 'REJECTED':
        return 'red';
      default:
        return 'gray';
    }
  }

  isDataChanged(field: 'jabatan' | 'unitKerja' | 'nomorHP'): boolean {
    if (!this.request) return false;

    switch (field) {
      case 'jabatan':
        return this.request.jabatan !== this.request.profile?.jabatan;
      case 'unitKerja':
        return this.request.unitKerjaId !== this.request.profile?.unitKerja?.id;
      case 'nomorHP':
        return this.request.nomorHP !== this.request.profile?.nomorHP;
      default:
        return false;
    }
  }

  get displayError(): string {
    return this.error || this.validationError;
  }
}
