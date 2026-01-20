import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { UiService } from '../../services/ui.service';

@Component({
  selector: 'app-ui-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-toast.component.html',
  styleUrl: './ui-toast.component.scss',
})
export class UiToastComponent {
  constructor(public ui: UiService) {}
}
