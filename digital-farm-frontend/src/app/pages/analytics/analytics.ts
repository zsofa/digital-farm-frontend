import {
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { catchError, forkJoin, of, Subscription } from 'rxjs';

import { calculateGhgImpact } from '../../calculations/ghg-calculations';
import { ParcelDetails, ParcelSeason } from '../../models/parcel.model';
import {
  CompleteParcelSeasonSustainabilityResult,
  ParcelSeasonSustainabilityResult,
} from '../../models/sustainability.model';
import { FarmContextService } from '../../services/farm-context.service';
import { ParcelService } from '../../services/parcel.service';
import { SustainabilityService } from '../../services/sustainability.service';

type Detail = CompleteParcelSeasonSustainabilityResult;
type MetricValue = number | null;

interface Metric {
  label: string;
  unit: string;
  deltaUnit: string;
  a: MetricValue;
  b: MetricValue;
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  templateUrl: './analytics.html',
  styleUrl: './analytics.css',
})
export class Analytics implements OnDestroy {
  private readonly context = inject(FarmContextService);
  private readonly parcelsApi = inject(ParcelService);
  private readonly sustainabilityApi = inject(SustainabilityService);
  private readonly subscriptions = new Subscription();

  private plansVersion = 0;
  private comparisonVersion = 0;

  readonly loading = signal(true);
  readonly comparing = signal(false);
  readonly selectedFarm = this.context.selectedFarm;

  readonly error = signal<string | null>(null);
  readonly comparisonError = signal<string | null>(null);

  readonly parcels = signal<ParcelDetails[]>([]);
  readonly parcelId = signal<number | null>(null);
  readonly planAId = signal<number | null>(null);
  readonly planBId = signal<number | null>(null);

  readonly resultA = signal<ParcelSeasonSustainabilityResult | null>(null);
  readonly resultB = signal<ParcelSeasonSustainabilityResult | null>(null);

  readonly selectedParcel = computed(() =>
    this.parcels().find(parcel => parcel.id === this.parcelId()) ?? null
  );

  readonly plans = computed(() => this.selectedParcel()?.seasons ?? []);

  readonly planA = computed(() =>
    this.plans().find(plan => plan.id === this.planAId()) ?? null
  );

  readonly planB = computed(() =>
    this.plans().find(plan => plan.id === this.planBId()) ?? null
  );

  readonly detailA = computed(() => this.complete(this.resultA()));
  readonly detailB = computed(() => this.complete(this.resultB()));

  readonly ghgA = computed(() => {
    const detail = this.detailA();
    return detail ? calculateGhgImpact(detail) : null;
  });

  readonly ghgB = computed(() => {
    const detail = this.detailB();
    return detail ? calculateGhgImpact(detail) : null;
  });

  readonly metrics = computed<Metric[]>(() => {
    const a = this.detailA();
    const b = this.detailB();
    const ga = this.ghgA();
    const gb = this.ghgB();

    return [
      {
        label: 'Expected yield',
        unit: 't/ha',
        deltaUnit: 't/ha',
        a: this.numeric(a?.yield.expected_yield_t_ha),
        b: this.numeric(b?.yield.expected_yield_t_ha),
      },
      {
        label: 'Partial nitrogen balance',
        unit: 'kg N/ha',
        deltaUnit: 'kg N/ha',
        a: this.numeric(a?.sustainability.nitrogen.nitrogen_balance_kg_ha),
        b: this.numeric(b?.sustainability.nitrogen.nitrogen_balance_kg_ha),
      },
      {
        label: 'Estimated emissions',
        unit: 'kg CO₂eq/ha',
        deltaUnit: 'kg CO₂eq/ha',
        a: ga?.emissionPerHa ?? null,
        b: gb?.emissionPerHa ?? null,
      },
      {
        label: 'Management score',
        unit: '/100',
        deltaUnit: 'points',
        a: ga?.managementScore == null ? null : ga.managementScore * 100,
        b: gb?.managementScore == null ? null : gb.managementScore * 100,
      },
    ];
  });

  readonly yieldBars = computed(() => [
    {
      label: 'Plan A',
      plan: this.planA(),
      value: this.metrics()[0].a,
      tone: 'a',
    },
    {
      label: 'Plan B',
      plan: this.planB(),
      value: this.metrics()[0].b,
      tone: 'b',
    },
  ]);

  readonly nitrogenBars = computed(() => [
    {
      label: 'Applied N',
      a: this.numeric(this.detailA()?.sustainability.nitrogen.applied_nitrogen_kg_ha),
      b: this.numeric(this.detailB()?.sustainability.nitrogen.applied_nitrogen_kg_ha),
    },
    {
      label: 'Removed N',
      a: this.numeric(this.detailA()?.sustainability.nitrogen.removed_nitrogen_kg_ha),
      b: this.numeric(this.detailB()?.sustainability.nitrogen.removed_nitrogen_kg_ha),
    },
  ]);

  readonly yieldMax = computed(() =>
    this.axisMax(this.yieldBars().map(bar => bar.value))
  );

  readonly nitrogenMax = computed(() =>
    this.axisMax(this.nitrogenBars().flatMap(group => [group.a, group.b]))
  );

  readonly settings = computed(() => {
    const a = this.planA();
    const b = this.planB();

    if (!a) {
      return [];
    }

    return [
      {
        label: 'Crop',
        a: this.crop(a.crop),
        b: b ? this.crop(b.crop) : '—',
      },
      {
        label: 'Season start year',
        a: String(a.season_start_year),
        b: b ? String(b.season_start_year) : '—',
      },
      {
        label: 'Farming strategy',
        a: this.strategy(a.farming_strategy),
        b: b ? this.strategy(b.farming_strategy) : '—',
      },
      {
        label: 'Machine use',
        a: this.machine(a.machine_use),
        b: b ? this.machine(b.machine_use) : '—',
      },
      {
        label: 'Fertilizer',
        a: a.fertilizer_type ?? 'None',
        b: b ? b.fertilizer_type ?? 'None' : '—',
      },
      {
        label: 'Fertilizer quantity',
        a: this.quantity(a.fertilizer_quantity_kg_ha),
        b: b ? this.quantity(b.fertilizer_quantity_kg_ha) : '—',
      },
      {
        label: 'Irrigation',
        a: a.is_irrigated ? 'Yes' : 'No',
        b: b ? (b.is_irrigated ? 'Yes' : 'No') : '—',
      },
    ];
  });

  constructor() {
    effect(() => {
      const waiting = this.context.loading();
      const farmError = this.context.errorMessage();
      const farm = this.selectedFarm();

      untracked(() => {
        const version = ++this.plansVersion;
        ++this.comparisonVersion;

        this.parcels.set([]);
        this.parcelId.set(null);
        this.planAId.set(null);
        this.planBId.set(null);
        this.resultA.set(null);
        this.resultB.set(null);
        this.error.set(null);
        this.comparisonError.set(null);
        this.comparing.set(false);
        this.loading.set(true);

        if (waiting) {
          return;
        }

        if (farmError || !farm) {
          this.error.set(farmError);
          this.loading.set(false);
          return;
        }

        const active = farm.parcels.filter(parcel => parcel.is_active);

        if (!active.length) {
          this.loading.set(false);
          return;
        }

        this.subscriptions.add(
          forkJoin(
            active.map(parcel =>
              this.parcelsApi.getParcel(parcel.id).pipe(
                catchError(() => of(null))
              )
            )
          ).subscribe(results => {
            if (version !== this.plansVersion) {
              return;
            }

            const available = results.filter(
              (parcel): parcel is ParcelDetails => parcel !== null
            );

            this.parcels.set(available);
            this.loading.set(false);

            if (available.length !== active.length) {
              this.error.set('Some parcels could not be loaded.');
            }

            this.chooseParcel(available[0]?.id ?? null);
          })
        );
      });
    });
  }

  ngOnDestroy(): void {
    ++this.plansVersion;
    ++this.comparisonVersion;
    this.subscriptions.unsubscribe();
  }

  changeParcel(event: Event): void {
    this.chooseParcel(this.selectId(event));
  }

  changePlan(side: 'a' | 'b', event: Event): void {
    const id = this.selectId(event);

    if (side === 'a') {
      this.planAId.set(id);
    } else {
      this.planBId.set(id);
    }

    this.loadComparison();
  }

  private chooseParcel(id: number | null): void {
    this.parcelId.set(id);

    const plans = this.plans();
    this.planAId.set(plans.length === 1 ? plans[0].id : null);
    this.planBId.set(null);

    this.loadComparison();
  }

  private loadComparison(): void {
    const version = ++this.comparisonVersion;

    this.resultA.set(null);
    this.resultB.set(null);
    this.comparisonError.set(null);
    this.comparing.set(false);

    const a = this.planA();
    const b = this.planB();

    if (!a || a.id === b?.id) {
      return;
    }

    this.comparing.set(true);

    this.subscriptions.add(
      forkJoin([
        this.sustainabilityApi.getParcelSeasonSustainability(a.id).pipe(
          catchError(() => of(null))
        ),
        b
          ? this.sustainabilityApi.getParcelSeasonSustainability(b.id).pipe(
              catchError(() => of(null))
            )
          : of(null),
      ]).subscribe(([ra, rb]) => {
        if (version !== this.comparisonVersion) {
          return;
        }

        this.resultA.set(ra);
        this.resultB.set(rb);
        this.comparing.set(false);

        if (!ra || (b && !rb)) {
          this.comparisonError.set('Some selected plan data could not be loaded.');
        }
      })
    );
  }

  private complete(result: ParcelSeasonSustainabilityResult | null): Detail | null {
    return result?.calculation_status === 'complete' ? result : null;
  }

  private numeric(value: number | undefined): MetricValue {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  private selectId(event: Event): number | null {
    const target = event.target;

    if (!(target instanceof HTMLSelectElement) || !target.value) {
      return null;
    }

    const id = Number(target.value);
    return Number.isFinite(id) ? id : null;
  }

  private axisMax(values: MetricValue[]): number {
    const max = Math.max(0, ...values.map(value => value ?? 0));

    if (!max) {
      return 1;
    }

    const step = Math.pow(10, Math.floor(Math.log10(max))) / 2;
    return Math.ceil(max / step) * step;
  }

  width(value: MetricValue, max: number): number {
    return value === null ? 0 : Math.max(0, Math.min(100, value / max * 100));
  }

  number(value: MetricValue, digits = 2): string {
    return value === null
      ? '—'
      : value.toLocaleString('en-GB', { maximumFractionDigits: digits });
  }

  difference(metric: Metric): string {
    if (metric.a === null || metric.b === null) {
      return '—';
    }

    const delta = Math.round((metric.b - metric.a) * 100) / 100;
    return `${delta > 0 ? '+' : ''}${this.number(delta)} ${metric.deltaUnit}`;
  }

  crop(value: string): string {
    const labels: Record<string, string> = {
      wheat: 'Wheat',
      barley: 'Barley',
      maize: 'Maize',
    };

    return labels[value] ?? value;
  }

  strategy(value: string): string {
    return value === 'reduced' ? 'Reduced' : 'Conventional';
  }

  machine(value: string | null): string {
    return value
      ? value.charAt(0).toUpperCase() + value.slice(1)
      : 'Not specified';
  }

  quantity(value: number | null): string {
    return value === null ? 'Not specified' : `${this.number(value)} kg/ha`;
  }

  planLabel(plan: ParcelSeason): string {
    return `${plan.plan_name} · ${this.crop(plan.crop)} · ` +
      `${plan.season_start_year} · ${this.strategy(plan.farming_strategy)}`;
  }

  source(detail: Detail | null): string {
    if (!detail) {
      return 'Unavailable';
    }

    return detail.yield.source === 'current_simulation'
      ? 'Current simulation'
      : 'Regional recent yield';
  }

  missing(result: ParcelSeasonSustainabilityResult | null): string {
    return result?.calculation_status === 'incomplete'
      ? result.missing_inputs.map(value => value.replaceAll('_', ' ')).join(', ')
      : '';
  }
}