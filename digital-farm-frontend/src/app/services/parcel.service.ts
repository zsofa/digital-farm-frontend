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
  ParcelCreateRequest,
  ParcelDetails,
  ParcelSoil,
  ParcelSoilRequest,
  ParcelSummary,
  ParcelUpdateRequest,
} from '../models/parcel.model';


@Injectable({
  providedIn: 'root',
})
export class ParcelService {

  private readonly http =
    inject(HttpClient);


  getParcel(
    parcelId: number,
  ) {
    return this.http.get<ParcelDetails>(
      `${environment.apiUrl}/parcels/${parcelId}`
    );
  }


  getFarmParcels(
    farmId: number,
  ) {
    return this.http.get<ParcelSummary[]>(
      `${environment.apiUrl}/farms/${farmId}/parcels`
    );
  }


  createParcel(
    farmId: number,
    data: ParcelCreateRequest,
  ) {
    return this.http.post<ParcelDetails>(
      `${environment.apiUrl}/farms/${farmId}/parcels`,
      data
    );
  }


  updateParcel(
    parcelId: number,
    data: ParcelUpdateRequest,
  ) {
    return this.http.put<ParcelDetails>(
      `${environment.apiUrl}/parcels/${parcelId}`,
      data
    );
  }


  setParcelActive(
    parcelId: number,
    isActive: boolean,
  ) {
    return this.http.patch<ParcelDetails>(
      `${environment.apiUrl}/parcels/${parcelId}/status`,
      {
        is_active: isActive,
      }
    );
  }


  saveSoil(
    parcelId: number,
    data: ParcelSoilRequest,
  ) {
    return this.http.post<ParcelSoil>(
      `${environment.apiUrl}/parcels/${parcelId}/soil`,
      data
    );
  }


  deleteUserSoil(
    parcelId: number,
  ) {
    return this.http.delete<ParcelSoil | null>(
      `${environment.apiUrl}/parcels/${parcelId}/soil`
    );
  }


  deleteParcel(
    parcelId: number,
  ) {
    return this.http.delete<void>(
      `${environment.apiUrl}/parcels/${parcelId}`
    );
  }
}