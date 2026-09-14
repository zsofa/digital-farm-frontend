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
  Farm,
  FarmDetails,
  FarmRequest,
} from '../models/farm.model';

@Injectable({
  providedIn: 'root',
})
export class FarmService {
  private readonly http =
    inject(HttpClient);

  getFarms() {
    return this.http.get<Farm[]>(
      `${environment.apiUrl}/farms`
    );
  }

  getFarm(
    farmId: number,
  ) {
    return this.http.get<FarmDetails>(
      `${environment.apiUrl}/farms/${farmId}`
    );
  }

  createFarm(
    data: FarmRequest,
  ) {
    return this.http.post<Farm>(
      `${environment.apiUrl}/farms`,
      data
    );
  }

  updateFarm(
    farmId: number,
    data: FarmRequest,
  ) {
    return this.http.put<Farm>(
      `${environment.apiUrl}/farms/${farmId}`,
      data
    );
  }

  deleteFarm(
    farmId: number,
  ) {
    return this.http.delete(
      `${environment.apiUrl}/farms/${farmId}`
    );
  }
}