import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-modal.component.html',
  styleUrl: './confirm-modal.component.scss',
})
export class ConfirmModalComponent {
  @Input() isOpen = false;
  @Input() title = 'Konfirmasi';
  @Input() message = '';
  @Input() details: string[] = [];
  @Input() confirmText = 'OK';
  @Input() cancelText = 'Batal';
  @Input() showCancel = true;
  @Input() tone: 'danger' | 'primary' | 'neutral' = 'danger';

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onBackdropClick(): void {
    if (!this.showCancel) return;
    this.cancel.emit();
  }
}
