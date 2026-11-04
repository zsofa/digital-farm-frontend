import { Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { CompleteParcelSeasonSustainabilityResult } from '../../models/sustainability.model';

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

  template: `
    @let d = detail();
    @let m = metrics();
    @let score = displayScore();

    <section class="panel">
      <header class="parcel-header">
        <div class="parcel-heading">
          <span class="eyebrow">GHG impact</span>

          <h2>{{ d.parcel.name }}</h2>

          <p>
            {{ d.season.plan_name }} · {{ cropLabel() }}
          </p>
        </div>

        @if (m.regionName) {
          <span class="region">
            {{ m.regionName }}
          </span>
        }
      </header>

      <div class="cards">
        <article class="metric-card management">
          <div class="card-heading">
            <span class="icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M5 4v16M12 4v16M19 4v16" />
                <path d="M2 8h6M9 16h6M16 10h6" />
              </svg>
            </span>

            <h3>Management score</h3>
          </div>

          <div class="score-value">
            <strong>
              {{
                score === null
                  ? '—'
                  : (score | number:'1.0-1')
              }}
            </strong>

            <span>/ 100</span>
          </div>

          <div class="scale" aria-hidden="true">
            <div class="track">
              @if (score !== null) {
                <span
                  class="fill"
                  [style.width.%]="score"
                ></span>
              }
            </div>

            <div class="scale-labels">
              <span>0</span>
              <span>100</span>
            </div>
          </div>
        </article>

        <article class="metric-card emissions">
          <div class="card-heading">
            <span class="icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  d="M7 17a4 4 0 1 1 .5-8A6 6 0 0 1 19 10a3.5 3.5 0 0 1-1 7H7Z"
                />
              </svg>
            </span>

            <h3>Estimated emissions</h3>
          </div>

          <div class="emission-value">
            <strong>
              {{
                m.emissionPerHa === null
                  ? '—'
                  : (m.emissionPerHa | number:'1.2-2')
              }}
            </strong>

            <span>kg CO₂eq/ha</span>
          </div>

          <div class="parcel-total">
            <span class="total-label">
              Whole parcel
            </span>

            <div>
              <strong>
                {{
                  m.totalEmission === null
                    ? '—'
                    : (m.totalEmission | number:'1.2-2')
                }}
              </strong>

              <span>kg CO₂eq</span>
            </div>
          </div>
        </article>
      </div>
    </section>
  `,

  styles: [`
    :host {
      display: block;
      margin-bottom: 24px;
      color: #213c32;
    }

    * {
      box-sizing: border-box;
    }

    .panel {
      padding: 28px;
      background: #fff;
      border: 1px solid #e3e9e4;
      border-radius: 24px;
      box-shadow: 0 6px 24px rgb(32 60 45 / 4%);
    }

    .parcel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 24px;
    }

    .parcel-heading {
      min-width: 0;
      overflow-wrap: anywhere;
    }

    .eyebrow {
      color: #6b8074;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .14em;
    }

    h2 {
      margin: 7px 0;
      font-size: 23px;
      font-weight: 650;
      letter-spacing: -.03em;
    }

    p {
      margin: 0;
      color: #63776b;
      font-size: 13px;
      line-height: 1.5;
    }

    .region {
      padding: 8px 13px;
      border: 1px solid #e1e8df;
      border-radius: 999px;
      background: #f7f9f5;
      color: #526b5b;
      font-size: 12px;
    }

    .cards {
      display: grid;
      grid-template-columns:
        minmax(0, 1fr)
        minmax(0, 1.35fr);
      gap: 20px;
    }

    .metric-card {
      min-width: 0;
      padding: 25px;
      border-radius: 19px;
      border: 1px solid #e0e7de;
    }

    .management {
      display: flex;
      flex-direction: column;
      background: #f0f5ec;
    }

    .emissions {
      background: #fbfcfa;
    }

    .card-heading {
      display: flex;
      align-items: center;
      gap: 11px;
    }

    .icon {
      display: grid;
      place-items: center;
      flex: 0 0 36px;
      width: 36px;
      height: 36px;
      border: 1px solid #dce5d7;
      border-radius: 11px;
      background: #fff;
      color: #526e56;
    }

    svg {
      width: 20px;
      height: 20px;
    }

    h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      line-height: 1.4;
    }

    .score-value {
      display: flex;
      align-items: baseline;
      gap: 9px;
      margin: 25px 0;
    }

    .score-value strong {
      font-size: clamp(42px, 5vw, 60px);
      line-height: 1.1;
      font-weight: 600;
      letter-spacing: -.05em;
      font-variant-numeric: tabular-nums;
    }

    .score-value > span {
      color: #64775c;
      font-size: 17px;
    }

    .scale {
      margin-top: auto;
      padding-top: 8px;
    }

    .track {
      height: 7px;
      overflow: hidden;
      background: #dce5d6;
      border-radius: 99px;
    }

    .fill {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: #657a55;
    }

    .scale-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 9px;
      font-size: 11px;
      color: #65765e;
    }

    .emission-value {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 7px 12px;
      margin: 25px 0 24px;
    }

    .emission-value strong {
      min-width: 0;
      font-size: clamp(30px, 3.5vw, 44px);
      font-weight: 600;
      line-height: 1.15;
      letter-spacing: -.04em;
      font-variant-numeric: tabular-nums;
      overflow-wrap: anywhere;
    }

    .emission-value > span,
    .parcel-total div > span {
      color: #65776b;
      font-size: 12px;
    }

    .parcel-total {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
      padding-top: 18px;
      border-top: 1px solid #e2e8df;
    }

    .total-label {
      font-size: 12px;
      color: #65776b;
    }

    .parcel-total > div {
      display: flex;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 8px;
      min-width: 0;
    }

    .parcel-total strong {
      font-size: 20px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      overflow-wrap: anywhere;
    }

    @media (max-width: 760px) {
      .cards {
        grid-template-columns: 1fr;
      }

      .panel {
        padding: 20px;
        border-radius: 20px;
      }

      .metric-card {
        padding: 22px;
      }
    }

    @media (max-width: 380px) {
      .panel,
      .metric-card {
        padding: 16px;
      }

      .emission-value strong {
        font-size: 29px;
      }
    }
  `],
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