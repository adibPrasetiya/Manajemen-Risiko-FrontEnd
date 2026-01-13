import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ErrorService } from '../../services/error.service';

@Component({
  selector: 'app-error-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './error-toast.component.html',
  styleUrl: './error-toast.component.scss',
})
export class ErrorToastComponent {
  constructor(public errors: ErrorService) {}
  close(time: number) {
    this.errors.remove(time);
  }
}
