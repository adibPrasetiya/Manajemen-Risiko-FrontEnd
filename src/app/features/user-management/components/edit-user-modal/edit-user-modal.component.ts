import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface EditUserData {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  isVerified: boolean;
  roles: string[];
}

export interface EditUserResult {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  isVerified: boolean;
  roles: string[];
}

@Component({
  selector: 'app-edit-user-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-user-modal.component.html',
  styleUrl: './edit-user-modal.component.scss',
})
export class EditUserModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() user: EditUserData | null = null;
  @Input() loading = false;
  @Input() error = '';

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<EditUserResult>();

  // Internal form model
  formData = {
    id: '',
    email: '',
    name: '',
    isActive: false,
    isVerified: false,
    roles: { USER: false, ADMIN: false },
  };

  validationError = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user'] && this.user) {
      this.formData = {
        id: this.user.id,
        email: this.user.email ?? '',
        name: this.user.name ?? '',
        isActive: !!this.user.isActive,
        isVerified: !!this.user.isVerified,
        roles: {
          USER: (this.user.roles ?? []).includes('USER'),
          ADMIN: (this.user.roles ?? []).includes('ADMIN') || (this.user.roles ?? []).includes('ADMINISTRATOR'),
        },
      };

      // Minimal 1 role
      if (!this.formData.roles.USER && !this.formData.roles.ADMIN) {
        this.formData.roles.USER = true;
      }

      this.validationError = '';
    }

    if (changes['isOpen'] && !this.isOpen) {
      this.validationError = '';
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.onClose();
    }
  }

  onClose(): void {
    this.validationError = '';
    this.close.emit();
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  onSave(): void {
    this.validationError = '';

    // Validation
    if (!this.formData.name.trim()) {
      this.validationError = 'Name wajib diisi.';
      return;
    }

    if (!this.isValidEmail(this.formData.email)) {
      this.validationError = 'Email tidak valid.';
      return;
    }

    const roles: string[] = [];
    if (this.formData.roles.USER) roles.push('USER');
    if (this.formData.roles.ADMIN) roles.push('ADMINISTRATOR');

    if (roles.length === 0) {
      this.validationError = 'Minimal pilih 1 role.';
      return;
    }

    const result: EditUserResult = {
      id: this.formData.id,
      email: this.formData.email.trim(),
      name: this.formData.name.trim(),
      isActive: this.formData.isActive,
      isVerified: this.formData.isVerified,
      roles,
    };

    this.save.emit(result);
  }

  // Get displayed error (external error takes precedence)
  get displayError(): string {
    return this.error || this.validationError;
  }
}
