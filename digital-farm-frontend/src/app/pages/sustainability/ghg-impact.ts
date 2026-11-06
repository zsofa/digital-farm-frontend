import { Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import {
  CompleteParcelSeasonSustainabilityResult,
} from '../../models/sustainability.model';

const REGIONS = [
  {
    code: 'HU10',
    name: 'Közép-Magyarország',
    counties: ['Budapest', 'Pest'],
    barley: [1525.7, 3601.2],
    maize: [1125.06, 5185.44],
  },
  {
    code: 'HU21',
    name: 'Közép-Dunántúl',
    counties: ['Fejér', 'Komárom-Esztergom', 'Veszprém'],
    barley: [1793.7, 4318.2],
    maize: [1472.09, 6196.13],
  },
  {
    code: 'HU22',
    name: 'Nyugat-Dunántúl',
    counties: ['Győr-Moson-Sopron', 'Vas', 'Zala'],
    barley: [1866.3, 4371.0],
    maize: [1608.46, 6280.84],
  },
  {
    code: 'HU23',
    name: 'Dél-Dunántúl',
    counties: ['Baranya', 'Somogy', 'Tolna'],
    barley: [1951.4, 4081.9],
    maize: [2171.71, 6783.96],
  },
  {
    code: 'HU31',
    name: 'Észak-Magyarország',
    counties: ['Borsod-Abaúj-Zemplén', 'Heves', 'Nógrád'],
    barley: [1556.6, 3935.4],
    maize: [1295.75, 5346.80],
  },
  {
    code: 'HU32',
    name: 'Észak-Alföld',
    counties: [
      'Hajdú-Bihar',
      'Jász-Nagykun-Szolnok',
      'Szabolcs-Szatmár-Bereg',
    ],
    barley: [1737.8, 4164.4],
    maize: [1405.91, 6086.16],
  },
  {
    code: 'HU33',
    name: 'Dél-Alföld',
    counties: [
      'Bács-Kiskun',
      'Békés',
      'Csongrád-Csanád',
      'Csongrád',
    ],
    barley: [1562.7, 3880.0],
    maize: [1203.76, 5553.79],
  },
] as const;

const MACHINE_FACTORS: Record<string, number> = {
  low: 0.25,
  medium: 0.60,
  high: 1.00,
};

const STRATEGY_FACTORS: Record<string, number> = {
  conventional: 1.00,
  reduced: 0.70,
};

function normalizeCounty(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+(varmegye|megye)$/, '')
    .replace(/[–—]/g, '-');
}

function nonNegative(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0
  );
}

export function calculateGhgImpact(
  detail: CompleteParcelSeasonSustainabilityResult,
) {
  const machine = detail.season.machine_use;
  const strategy = detail.season.farming_strategy;

  const machineFactor =
    machine && Object.hasOwn(MACHINE_FACTORS, machine)
      ? MACHINE_FACTORS[machine]
      : null;

  const strategyFactor =
    Object.hasOwn(STRATEGY_FACTORS, strategy)
      ? STRATEGY_FACTORS[strategy]
      : null;

  const managementScore =
    machineFactor !== null && strategyFactor !== null
      ? machineFactor * strategyFactor
      : null;

  const county = normalizeCounty(
    detail.parcel.county_name ?? '',
  );

  const region = REGIONS.find((r) =>
    r.counties.some((c) => normalizeCounty(c) === county),
  );

  const crop = detail.season.crop;

  const reference = !region
    ? null
    : crop === 'maize'
      ? region.maize
      : crop === 'barley' || crop === 'wheat'
        ? region.barley
        : null;

  const dryYield = detail.yield.expected_yield_t_ha;
  const area = detail.parcel.official_area_ha;

  const intensity = reference
    ? reference[0] / reference[1]
    : null;

  const emissionPerHa =
    intensity !== null && nonNegative(dryYield)
      ? intensity * dryYield * 1000
      : null;

  const totalEmission =
    emissionPerHa !== null &&
    nonNegative(area) &&
    area > 0
      ? emissionPerHa * area
      : null;

  return {
    machineFactor,
    strategyFactor,
    managementScore,

    regionName: region?.name ?? null,
    regionCode: region?.code ?? null,

    referenceEmission: reference?.[0] ?? null,
    referenceDryYield: reference?.[1] ?? null,

    intensity,
    emissionPerHa,
    totalEmission,

    dryYield: nonNegative(dryYield) ? dryYield : null,
    area: nonNegative(area) && area > 0 ? area : null,
  };
}

@Component({
  selector: 'app-ghg-impact',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './ghg-impact.html',
  styleUrl: './ghg-impact.css',
})
export class GhgImpact {
  readonly detail =
    input.required<CompleteParcelSeasonSustainabilityResult>();

  readonly metrics = computed(() =>
    calculateGhgImpact(this.detail()),
  );

  readonly displayScore = computed(() => {
    const score = this.metrics().managementScore;
    return score === null ? null : score * 100;
  });

  readonly cropLabel = computed(() => ({
    wheat: 'Wheat',
    barley: 'Barley',
    maize: 'Maize',
  })[this.detail().season.crop]);
}