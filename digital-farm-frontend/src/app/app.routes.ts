import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';

import { AppLayout } from './layout/app-layout/app-layout';

import { Login } from './pages/auth/login/login';
import { Register } from './pages/auth/register/register';

import { Analytics } from './pages/analytics/analytics';
import { Dashboard } from './pages/dashboard/dashboard';
import { Fields } from './pages/fields/fields';
import { ParcelDetail } from './pages/parcel-detail/parcel-detail';
import { SeasonDetail } from './pages/season-detail/season-detail';
import { SimulationDetail } from './pages/simulation-detail/simulation-detail';
import { Sustainability } from './pages/sustainability/sustainability';
import { FarmForm } from './pages/farm-form/farm-form';
import { ParcelForm } from './pages/parcel-form/parcel-form';
import { SeasonForm } from './pages/season-form/season-form';

export const routes: Routes = [
  {
    path: 'login',
    component: Login,
  },
  {
    path: 'register',
    component: Register,
  },
  {
    path: '',
    component: AppLayout,
    canActivate: [authGuard],

    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },

      {
        path: 'dashboard',
        component: Dashboard,
      },

      {
        path: 'fields',
        component: Fields,
      },

      {
        path: 'farms/new',
        component: FarmForm,
      },

      {
        path: 'farms/:farmId/edit',
        component: FarmForm,
      },

      {
        path: 'parcels/new',
        component: ParcelForm,
      },
      {
        path: 'parcels/:parcelId/edit',
        component: ParcelForm,
      },
      {
        path: 'parcels/:parcelId',
        component: ParcelDetail,
      },

      {
        path: 'parcel-seasons/:seasonId',
        component: SeasonDetail,
      },

      {
        path: 'simulations/:simulationId',
        component: SimulationDetail,
      },

      {
        path: 'analytics',
        component: Analytics,
      },

      {
        path: 'sustainability',
        component: Sustainability,
      },
      {
        path: 'parcels/:parcelId/seasons/new',
        component: SeasonForm,
      },
      {
        path: 'parcel-seasons/:seasonId/edit',
        component: SeasonForm,
      },
      {
        path: 'parcel-seasons/:seasonId',
        component: SeasonDetail,
      },
    ],
  },

  {
    path: '**',
    redirectTo: '',
  },
];