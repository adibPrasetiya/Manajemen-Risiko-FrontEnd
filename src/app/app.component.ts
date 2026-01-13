import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoadingOverlayComponent } from './core/components/loading-overlay/loading-overlay.component';
import { ErrorToastComponent } from './core/components/error-toast/error-toast.component';
import { RouteLoadingService } from './core/services/route-loading.service';
import { UiToastComponent } from './core/components/ui-toast/ui-toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LoadingOverlayComponent, ErrorToastComponent, UiToastComponent],
  template: `
    <router-outlet></router-outlet>

    <!-- Global loading overlay -->
    <app-loading-overlay></app-loading-overlay>

        <app-loading-overlay></app-loading-overlay>

    <!-- ✅ toast sukses/info/error dari UiService -->
    <app-ui-toast></app-ui-toast>

    <!-- ✅ error list dari ErrorService -->
    <app-error-toast></app-error-toast>
    
    <!-- Global toast (success/error/info) -->
    <app-error-toast></app-error-toast>
  `,
})
export class AppComponent {
  constructor(_rl: RouteLoadingService) {}
}
