
import {
  SimulationSummary,
} from './simulation.model';

export interface PolygonGeometry {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface ParcelSummary {
  id: number;
  name: string;
  official_area_ha: number;
  county_name: string;
  geometry: PolygonGeometry;
  is_active: boolean;
  deactivated_at: string | null;
}

export interface ParcelSoil {
  source: 'soilgrids' | 'user';
  soil_ph: number;
  soil_soc_g_kg: number;
  soil_clay_pct: number;
  measured_at: string | null;
}

export interface ParcelSeason {
  id: number;
  parcel_id: number;
  season_start_year: number;

  crop:
    | 'wheat'
    | 'barley'
    | 'maize';

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

  created_at: string;
  updated_at: string;
}

export interface ParcelSeasonDetails
  extends ParcelSeason {

  simulations: SimulationSummary[];
}
export interface ParcelDetails {
  id: number;
  farm_id: number;
  name: string;
  official_area_ha: number;
  county_name: string;
  geometry: PolygonGeometry;
  soil: ParcelSoil | null;
  seasons: ParcelSeason[];
  created_at: string;
  updated_at: string;
  is_active: boolean;
  deactivated_at: string | null;
  revision: number;
}

export interface ParcelCreateRequest {
  name: string;
  official_area_ha: number;
  geometry: PolygonGeometry;
}

export interface ParcelUpdateRequest {
  name: string;
}

export interface ParcelRequest {
  name: string;
  official_area_ha: number;
  geometry: PolygonGeometry;
}

export interface ParcelSoilRequest {
  soil_ph: number;
  soil_soc_g_kg: number;
  soil_clay_pct: number;
  measured_at: string | null;
}