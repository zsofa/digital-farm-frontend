export type SimulationStatus =
  | 'current'
  | 'outdated';


export interface SimulationScenario {
  estimated_total_t: number;
  precipitation_mm: number;
  predicted_yield_t_ha: number;
  temperature_c: number;
}


export interface SimulationScenarios {
  dry_hot: SimulationScenario;
  expected: SimulationScenario;
  wet_cool: SimulationScenario;
}


export interface SimulationParcel {
  id: number;
  name: string;
  official_area_ha: number;
}


export interface SimulationSeason {
  crop: string;
  season_start_year: number;
}


export interface SimulationSoil {
  soil_clay_pct: number;
  soil_ph: number;
  soil_soc_g_kg: number;
  source: 'soilgrids' | 'user';
}


export interface SimulationSummary {
  simulation_id: number;
  created_at: string;
  model_type: string;
  recent_yield_mean_t_ha: number;

  parcel_revision_at_run: number;
  current_parcel_revision: number;

  expected_yield_t_ha: number | null;
  expected_total_t: number | null;

  status: SimulationStatus;
}


export interface SimulationDetails {
  simulation_id: number;
  parcel_season_id: number;

  county_name: string;
  created_at: string;

  model_type: string;
  recent_yield_mean_t_ha: number;

  parcel_revision_at_run: number;
  current_parcel_revision: number;

  status: SimulationStatus;

  parcel: SimulationParcel;
  season: SimulationSeason;
  soil: SimulationSoil;
  scenarios: SimulationScenarios;
}


export interface RunSimulationResponse {
  simulation_id: number;
}