import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '../../environments/environment';
import { ParcelSeasonDetails } from '../models/parcel.model';

@Injectable({
  providedIn: 'root',
})
export class ParcelSeasonService {
  private readonly http = inject(HttpClient);

  getSeason(seasonId: number) {
    return this.http.get<ParcelSeasonDetails>(
      `${environment.apiUrl}/parcel-seasons/${seasonId}`
    );
  }
}