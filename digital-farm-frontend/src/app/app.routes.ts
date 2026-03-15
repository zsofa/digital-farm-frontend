import { Routes } from '@angular/router';

import { Dashboard } from './pages/dashboard/dashboard';
import { Fields } from './pages/fields/fields';
import { Analytics } from './pages/analytics/analytics';
import { Sustainability } from './pages/sustainability/sustainability';
import { Settings } from './pages/settings/settings';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  { path: 'dashboard', component: Dashboard },
  { path: 'fields', component: Fields },
  { path: 'analytics', component: Analytics },
  { path: 'sustainability', component: Sustainability },
  { path: 'settings', component: Settings },
];