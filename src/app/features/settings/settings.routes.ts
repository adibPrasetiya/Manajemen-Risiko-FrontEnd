import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { DashboardLayoutComponent } from '../../layouts/dashboard/dashboard-layout.component';
import { AssetCategoriesComponent } from './pages/asset-categories/asset-categories.component';
import { AssetsComponent } from './pages/assets/assets.component';
import { RiskWorksheetsComponent } from './pages/risk-worksheets/risk-worksheets.component';

export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    component: DashboardLayoutComponent,
    children: [
      {
        path: 'asset-categories',
        component: AssetCategoriesComponent,
        canActivate: [roleGuard(['ADMINISTRATOR'])],
      },
      {
        path: 'assets',
        component: AssetsComponent,
        canActivate: [roleGuard(['PENGELOLA_RISIKO_UKER'])],
      },
      {
        path: 'risk-worksheets',
        component: RiskWorksheetsComponent,
        canActivate: [roleGuard(['PENGELOLA_RISIKO_UKER', 'KOMITE_PUSAT'])],
      },
      { path: '', redirectTo: 'asset-categories', pathMatch: 'full' },
    ],
  },
];
