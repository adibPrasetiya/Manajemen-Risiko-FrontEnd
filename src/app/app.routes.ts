import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then(
        (m) => m.DASHBOARD_ROUTES
      ),
    canActivate: [authGuard],
  },
  {
    path: 'user-management',
    loadChildren: () =>
      import('./features/user-management/user-management.routes').then(
        (m) => m.USER_MANAGEMENT_ROUTES
      ),
    canActivate: [authGuard, roleGuard(['ADMINISTRATOR'])],
  },
  {
    path: 'konteks-management',
    loadChildren: () =>
      import('./features/konteks/konteks-management.routes').then(
        (m) => m.KONTEKS_MANAGEMENT_ROUTES
      ),
    canActivate: [authGuard, roleGuard(['ADMINISTRATOR', 'KOMITE_PUSAT'])],
  },
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
  { path: '**', redirectTo: 'auth/login' },
];
