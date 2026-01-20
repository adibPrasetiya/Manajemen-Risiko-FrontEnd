import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { UiService } from '../../services/ui.service';

@Component({
  selector: 'app-success-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './success-toast.component.html',
  styleUrl: './success-toast.component.scss',
})
export class SuccessToastComponent {
  ui = this.uiService;
  constructor(private uiService: UiService) {}
}
