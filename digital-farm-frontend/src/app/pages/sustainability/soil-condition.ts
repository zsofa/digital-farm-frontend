import { Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import {
  CompleteParcelSeasonSustainabilityResult,
} from '../../models/sustainability.model';

interface TextureClayRange {
  name: string;
  min: number;
  max: number;
  includeMax?: boolean;
}

const TEXTURE_CLAY_RANGES: readonly TextureClayRange[] = [
  { name: 'Sand', min: 0, max: 10 },
  { name: 'Loamy sand', min: 0, max: 15 },
  { name: 'Sandy loam', min: 0, max: 20 },
  { name: 'Loam', min: 7, max: 27 },
  { name: 'Silt loam', min: 0, max: 27 },
  { name: 'Silt', min: 0, max: 12 },
  { name: 'Sandy clay loam', min: 20, max: 35 },
  { name: 'Clay loam', min: 27, max: 40 },
  { name: 'Silty clay loam', min: 27, max: 40 },
  { name: 'Sandy clay', min: 35, max: 55 },
  { name: 'Silty clay', min: 40, max: 60, includeMax: true },
  { name: 'Clay', min: 40, max: 100, includeMax: true },
];

@Component({
  selector: 'app-soil-condition',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './soil-condition.html',
  styleUrl: './soil-condition.css',
})
export class SoilCondition {
  readonly detail =
    input.required<CompleteParcelSeasonSustainabilityResult>();

  readonly phTicks = [0, 2, 4, 6, 7, 8, 10, 12, 14];
  readonly clayTicks = [0, 20, 40, 60, 80, 100];
  readonly quarterTicks = [0, 0.25, 0.5, 0.75, 1];

  readonly ph = computed(() =>
    this.valid(this.detail().soil.soil_ph, 14)
  );

  readonly soc = computed(() =>
    this.valid(this.detail().soil.soil_soc_g_kg, 1000)
  );

  readonly clay = computed(() =>
    this.valid(this.detail().soil.soil_clay_pct, 100)
  );

  readonly possibleTextures = computed(() => {
    const clay = this.clay();

    if (clay === null) {
      return [];
    }

    return TEXTURE_CLAY_RANGES
      .filter(range =>
        clay >= range.min &&
        (
          range.includeMax
            ? clay <= range.max
            : clay < range.max
        )
      )
      .map(range => range.name);
  });

  readonly socPct = computed(() => {
    const value = this.soc();
    return value === null ? null : value / 10;
  });

  readonly ratio = computed(() => {
    const soc = this.soc();
    const clay = this.clay();

    if (soc === null || clay === null || clay === 0) {
      return null;
    }

    return soc / (10 * clay);
  });

  readonly socMax = computed(() =>
    Math.max(
      5,
      Math.ceil((this.socPct() ?? 0) / 5) * 5,
    )
  );

  readonly phLabel = computed(() => {
    const ph = this.ph();

    if (ph === null) {
      return '';
    }

    if (ph < 7) {
      return 'Acidic';
    }

    if (ph > 7) {
      return 'Alkaline';
    }

    return 'Neutral';
  });

  readonly sourceLabel = computed(() =>
    this.detail().soil.source === 'soilgrids'
      ? 'SoilGrids · 0–30 cm'
      : 'User measurement'
  );

  private valid(
    value: number | null | undefined,
    maximum: number,
  ): number | null {
    return (
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= 0 &&
      value <= maximum
    )
      ? value
      : null;
  }

  position(
    value: number | null,
    maximum: number,
  ): number {
    if (value === null) {
      return 0;
    }

    return Math.min(
      100,
      Math.max(0, value / maximum * 100),
    );
  }
}