import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '../../environments/environment';
import {
  RunSimulationResponse,
  SimulationDetails,
} from '../models/simulation.model';

@Injectable({
  providedIn: 'root',
})
export class SimulationService {
  private readonly http = inject(HttpClient);

  runSimulation(parcelSeasonId: number) {
    return this.http.post<RunSimulationResponse>(
      `${environment.apiUrl}/yield-simulations/parcel-seasons/${parcelSeasonId}`,
      {}
    );
  }

  getSimulation(simulationId: number) {
    return this.http.get<SimulationDetails>(
      `${environment.apiUrl}/yield-simulations/${simulationId}`
    );
  }
}