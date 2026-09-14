import {
  HttpClient,
} from '@angular/common/http';

import {
  Injectable,
  inject,
} from '@angular/core';

import {
  environment,
} from '../../environments/environment';

import {
  FarmSustainabilityResult,
} from '../models/sustainability.model';


@Injectable({
  providedIn: 'root',
})
export class SustainabilityService {

  private readonly http =
    inject(HttpClient);


  calculateFarm(
    farmId: number,
    parcelSeasonIds: number[],
  ) {
    return this.http.post<FarmSustainabilityResult>(
      `${environment.apiUrl}/sustainability/farms/${farmId}/calculate`,
      {
        parcel_season_ids:
          parcelSeasonIds,
      },
    );
  }
}