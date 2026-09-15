import {
  HttpClient,
} from '@angular/common/http';

import {
  inject,
  Injectable,
} from '@angular/core';

import {
  environment,
} from '../../environments/environment';

import {
  ParcelSeason,
  ParcelSeasonDetails,
} from '../models/parcel.model';


export type SeasonCrop =
  | 'wheat'
  | 'barley'
  | 'maize';


export interface NextSeasonTarget {
  crop: SeasonCrop;

  season_start_year: number;

  start_date: string;

  end_date: string;
}


export interface SeasonCreateRequest {
  plan_name: string;

  crop: SeasonCrop;

  farming_strategy:
    | 'conventional'
    | 'reduced';

  is_irrigated: boolean;

  machine_use:
    | 'low'
    | 'medium'
    | 'high'
    | null;

  fertilizer_type:
    | 'AN'
    | 'urea'
    | 'CAN'
    | null;

  fertilizer_quantity_kg_ha:
    number | null;
}


export interface SeasonUpdateRequest {
  plan_name: string;

  farming_strategy:
    | 'conventional'
    | 'reduced';

  is_irrigated: boolean;

  machine_use:
    | 'low'
    | 'medium'
    | 'high'
    | null;

  fertilizer_type:
    | 'AN'
    | 'urea'
    | 'CAN'
    | null;

  fertilizer_quantity_kg_ha:
    number | null;
}


@Injectable({
  providedIn: 'root',
})
export class SeasonService {

  private readonly http =
    inject(HttpClient);


  getNextSeasonTarget(
    crop: SeasonCrop,
  ) {
    return this.http.get<NextSeasonTarget>(
      `${environment.apiUrl}/crop-seasons/next`,
      {
        params: {
          crop,
        },
      },
    );
  }


  createSeason(
    parcelId: number,
    data: SeasonCreateRequest,
  ) {
    return this.http.post<ParcelSeason>(
      `${environment.apiUrl}/parcels/${parcelId}/seasons`,
      data,
    );
  }


  getSeason(
    seasonId: number,
  ) {
    return this.http.get<ParcelSeasonDetails>(
      `${environment.apiUrl}/parcel-seasons/${seasonId}`,
    );
  }


  updateSeason(
    seasonId: number,
    data: SeasonUpdateRequest,
  ) {
    return this.http.put<ParcelSeason>(
      `${environment.apiUrl}/parcel-seasons/${seasonId}`,
      data,
    );
  }


  deleteSeason(
    seasonId: number,
  ) {
    return this.http.delete<void>(
      `${environment.apiUrl}/parcel-seasons/${seasonId}`,
    );
  }
}