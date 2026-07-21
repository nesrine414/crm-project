import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Register } from './components/register/register';
import { Dashboard } from './components/dashboard/dashboard';
import { Clients } from './components/clients/clients';
import { Partners } from './components/partners/partners';
import { Pipeline } from './components/pipeline/pipeline';
import { Reclamations } from './components/reclamations/reclamations';
import { Loyalty } from './components/loyalty/loyalty';
import { Campagnes } from './components/campagnes/campagnes';
import { Rapports } from './components/rapports/rapports';
import { Configuration } from './components/configuration/configuration';
import { authGuard } from './guards/auth-guard';
import { ForgotPassword } from './components/forgot-password/forgot-password';
import { ResetPassword } from './components/reset-password/reset-password';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  { path: 'clients', component: Clients, canActivate: [authGuard] },
  { path: 'partners', component: Partners, canActivate: [authGuard] },
  { path: 'pipeline', component: Pipeline, canActivate: [authGuard] },
  { path: 'reclamations', component: Reclamations, canActivate: [authGuard] },
  { path: 'loyalty', component: Loyalty, canActivate: [authGuard] },
  { path: 'campagnes', component: Campagnes, canActivate: [authGuard] },
  { path: 'configuration', component: Configuration, canActivate: [authGuard] },
  { path: 'rapports', component: Rapports, canActivate: [authGuard] },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'forgot-password', component: ForgotPassword },
  { path: 'reset-password', component: ResetPassword },
];