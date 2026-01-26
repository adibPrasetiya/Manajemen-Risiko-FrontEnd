import { Routes } from '@angular/router';
import { DashboardLayoutComponent } from '../../layouts/dashboard/dashboard-layout.component';
import { AssetCategoriesComponent } from './pages/asset-categories/asset-categories.component';

export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    component: DashboardLayoutComponent,
    children: [
      { path: 'asset-categories', component: AssetCategoriesComponent },
      { path: '', redirectTo: 'asset-categories', pathMatch: 'full' },
    ],
  },
];
