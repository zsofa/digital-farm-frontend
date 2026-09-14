export type SustainabilityCalculationStatus =
  | 'complete'
  | 'partial'
  | 'unavailable';


export type ParcelSustainabilityCalculationStatus =
  | 'complete'
  | 'incomplete';


export type SustainabilityYieldSource =
  | 'current_simulation'
  | 'regional_recent_yield';


export interface SustainabilityScores {
  sustainability_score: number;
  sustainability_score_100: number;

  nitrogen_score: number;
  nitrogen_score_100: number;

  soil_health_score: number;
  soil_health_score_100: number;

  ghg_score: number;
  ghg_score_100: number;
}


export interface ParcelSustainabilityResult {
  calculation_status:
    ParcelSustainabilityCalculationStatus;

  parcel_season_id: number;
  parcel_id: number;
  parcel_name: string;
  official_area_ha: number;

  season_start_year: number;

  crop:
    | 'wheat'
    | 'barley'
    | 'maize';

  farming_strategy:
    | 'conventional'
    | 'reduced';

  yield_source?:
    SustainabilityYieldSource;

  missing_inputs?: string[];

  scores:
    SustainabilityScores | null;
}


export interface FarmSustainabilitySummary {
  active_parcel_count: number;

  selected_season_count: number;

  complete_season_count: number;

  incomplete_season_count: number;

  parcels_without_season_count: number;

  parcels_without_selection_count: number;

  weighted_area_sum_ha: number;
}


export interface ParcelWithoutSeason {
  parcel_id: number;
  parcel_name: string;
  official_area_ha: number;
}


export interface ParcelWithoutSelection {
  parcel_id: number;
  parcel_name: string;
  official_area_ha: number;

  available_season_ids: number[];
}


export interface FarmSustainabilityResult {
  calculation_status:
    SustainabilityCalculationStatus;

  farm_id: number;

  aggregation_method:
    'official_area_weighted';

  scores:
    SustainabilityScores | null;

  summary:
    FarmSustainabilitySummary;

  parcel_seasons:
    ParcelSustainabilityResult[];

  parcels_without_season:
    ParcelWithoutSeason[];

  parcels_without_selection:
    ParcelWithoutSelection[];
}