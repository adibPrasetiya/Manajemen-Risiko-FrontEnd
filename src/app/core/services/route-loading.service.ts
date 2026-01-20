import { Injectable } from '@angular/core';
import { Router, NavigationCancel, NavigationEnd, NavigationError, NavigationStart } from '@angular/router';
import { UiService } from './ui.service';

@Injectable({ providedIn: 'root' })
export class RouteLoadingService {
  constructor(router: Router, ui: UiService) {
    router.events.subscribe((ev) => {
      if (ev instanceof NavigationStart) ui.showLoading();
      if (ev instanceof NavigationEnd || ev instanceof NavigationCancel || ev instanceof NavigationError) ui.hideLoading();
    });
  }
}
