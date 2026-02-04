import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { DashboardLayoutComponent } from '../../layouts/dashboard/dashboard-layout.component';
import { AssetCategoriesComponent } from './pages/asset-categories/asset-categories.component';
import { AssetsComponent } from './pages/assets/assets.component';
import { RiskRegisterComponent } from './pages/risk-register/risk-register.component';
import { RiskRegisterCreateComponent } from './pages/risk-register-create/risk-register-create.component';
import { RiskMitigateComponent } from './pages/risk-mitigate/risk-mitigate.component';
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
      {
        path: 'risk-register',
        component: RiskRegisterComponent,
        canActivate: [roleGuard(['PENGELOLA_RISIKO_UKER', 'KOMITE_PUSAT'])],
      },
      {
        path: 'risk-register/create',
        component: RiskRegisterCreateComponent,
        canActivate: [roleGuard(['PENGELOLA_RISIKO_UKER', 'KOMITE_PUSAT'])],
      },
      {
        path: 'risk-mitigate',
        component: RiskMitigateComponent,
        canActivate: [roleGuard(['PENGELOLA_RISIKO_UKER', 'KOMITE_PUSAT'])],
      },
      { path: '', redirectTo: 'asset-categories', pathMatch: 'full' },
    ],
  },
];
