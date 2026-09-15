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


export type SustainabilityCrop =
  | 'wheat'
  | 'barley'
  | 'maize';


export type SustainabilityStrategy =
  | 'conventional'
  | 'reduced';


export type SustainabilityMachineUse =
  | 'low'
  | 'medium'
  | 'high';


export type SustainabilityFertilizer =
  | 'AN'
  | 'urea'
  | 'CAN';


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

  plan_name: string;

  season_start_year: number;

  crop:
    SustainabilityCrop;

  farming_strategy:
    SustainabilityStrategy;

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


export interface NitrogenMetrics {
  applied_nitrogen_kg_ha: number;

  removed_nitrogen_kg_ha: number;

  nitrogen_balance_kg_ha: number;

  nitrogen_input_score: number;

  nitrogen_balance_score: number;

  nitrogen_score: number;
}


export interface SoilMetrics {
  ph_score: number;

  soc_score: number;

  clay_score: number;

  strategy_score: number;

  crop_impact_score: number;

  soil_condition_score: number;

  soil_management_score: number;

  soil_health_score: number;
}


export interface GhgMetrics {
  fertilizer_emission_kg_co2e_ha:
    number;

  fertilizer_emission_score:
    number;

  machinery_relative_emission:
    number;

  machinery_emission_score:
    number;

  ghg_score:
    number;
}


export interface SustainabilityDetails {
  sustainability_score:
    number;

  sustainability_score_100:
    number;

  yield_source:
    SustainabilityYieldSource;

  expected_yield_t_ha:
    number;

  nitrogen:
    NitrogenMetrics;

  soil:
    SoilMetrics;

  ghg:
    GhgMetrics;
}


export interface SustainabilityParcelInfo {
  id: number;

  name: string;

  official_area_ha:
    number;

  county_name:
    string;
}


export interface SustainabilitySeasonInfo {
  plan_name:
    string;

  season_start_year:
    number;

  crop:
    SustainabilityCrop;

  farming_strategy:
    SustainabilityStrategy;

  machine_use:
    SustainabilityMachineUse | null;

  fertilizer_type:
    SustainabilityFertilizer | null;

  fertilizer_quantity_kg_ha:
    number | null;
}


export interface SustainabilitySoilInfo {
  source:
    'soilgrids'
    | 'user';

  soil_ph:
    number;

  soil_soc_g_kg:
    number;

  soil_clay_pct:
    number;
}


export interface SustainabilityYieldInfo {
  source:
    SustainabilityYieldSource;

  expected_yield_t_ha:
    number;

  simulation_id:
    number | null;

  recent_yield_years:
    number[] | null;
}


export interface CompleteParcelSeasonSustainabilityResult {
  calculation_status:
    'complete';

  parcel_season_id:
    number;

  parcel:
    SustainabilityParcelInfo;

  season:
    SustainabilitySeasonInfo;

  soil:
    SustainabilitySoilInfo;

  yield:
    SustainabilityYieldInfo;

  sustainability:
    SustainabilityDetails;
}


export interface IncompleteParcelSeasonSustainabilityResult {
  calculation_status:
    'incomplete';

  parcel_season_id:
    number;

  parcel_id:
    number;

  plan_name:
    string;

  season_start_year:
    number;

  crop:
    SustainabilityCrop;

  missing_inputs:
    string[];

  sustainability:
    null;
}


export type ParcelSeasonSustainabilityResult =
  | CompleteParcelSeasonSustainabilityResult
  | IncompleteParcelSeasonSustainabilityResult;