import {
  ParcelSummary,
} from './parcel.model';

export interface Farm {
  id: number;
  name: string;
  county_name: string;

  activity_type:
    | 'crop_production'
    | 'livestock'
    | 'mixed';

  legal_form:
    | 'individual'
    | 'family_farm'
    | 'company'
    | 'other'
    | null;

  description: string | null;

  created_at: string;
  updated_at: string;
}

export interface FarmDetails
  extends Farm {

  parcel_count: number;
  total_area_ha: number;
  parcels: ParcelSummary[];
}

export interface FarmRequest {
  name: string;
  county_name: string;

  activity_type:
    | 'crop_production'
    | 'livestock'
    | 'mixed';

  legal_form:
    | 'individual'
    | 'family_farm'
    | 'company'
    | 'other'
    | null;

  description: string | null;
}