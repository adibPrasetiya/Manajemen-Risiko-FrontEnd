import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { TotpComponent } from './pages/totp/totp.component';

export const AUTH_ROUTES: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'totp', component: TotpComponent },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
