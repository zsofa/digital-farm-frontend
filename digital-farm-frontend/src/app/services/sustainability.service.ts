import {
  Injectable,
} from '@angular/core';

import {
  HttpClient,
} from '@angular/common/http';

import {
  Observable,
} from 'rxjs';

import {
  ParcelDetails,
  ParcelSummary,
} from '../models/parcel.model';

import {
  FarmSustainabilityResult,
} from '../models/sustainability.model';


@Injectable({
  providedIn: 'root',
})
export class SustainabilityService {

  private readonly apiUrl =
    'http://127.0.0.1:5000/api';


  constructor(
    private http: HttpClient,
  ) {}


  getFarmParcels(
    farmId: number,
  ): Observable<ParcelSummary[]> {

    return this.http.get<ParcelSummary[]>(
      `${this.apiUrl}/farms/${farmId}/parcels`,
    );
  }


  getParcelDetails(
    parcelId: number,
  ): Observable<ParcelDetails> {

    return this.http.get<ParcelDetails>(
      `${this.apiUrl}/parcels/${parcelId}`,
    );
  }


  calculateFarm(
    farmId: number,
    parcelSeasonIds: number[],
  ): Observable<FarmSustainabilityResult> {

    return this.http.post<FarmSustainabilityResult>(
      `${this.apiUrl}/sustainability/farms/${farmId}/calculate`,
      {
        parcel_season_ids:
          parcelSeasonIds,
      },
    );
  }
}