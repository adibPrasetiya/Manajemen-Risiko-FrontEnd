import { Routes } from '@angular/router';

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
  },
  {
    path: 'user-management',
    loadChildren: () =>
      import('./features/user-management/user-management.routes').then(
        (m) => m.USER_MANAGEMENT_ROUTES
      ),
  },
  {
    path: 'konteks-management',
    loadChildren: () =>
      import('./features/konteks/konteks-management.routes').then(
        (m) => m.KONTEKS_MANAGEMENT_ROUTES
      ),
  },
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
  { path: '**', redirectTo: 'auth/login' },
];
