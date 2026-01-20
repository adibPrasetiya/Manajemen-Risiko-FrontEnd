import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { UiService } from '../../services/ui.service';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-overlay.component.html',
  styleUrl: './loading-overlay.component.scss',
})
export class LoadingOverlayComponent {
  constructor(public ui: UiService) {}
}
