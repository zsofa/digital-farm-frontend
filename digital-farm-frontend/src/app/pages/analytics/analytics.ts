import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';

import { calculateGhgImpact } from '../../calculations/ghg-calculations';
import { ParcelDetails, ParcelSeason } from '../../models/parcel.model';
import { ParcelSeasonSustainabilityResult } from '../../models/sustainability.model';
import { FarmContextService } from '../../services/farm-context.service';
import { ParcelService } from '../../services/parcel.service';
import { SustainabilityService } from '../../services/sustainability.service';

const crops = { wheat: 'Wheat', barley: 'Barley', maize: 'Maize' };
const settings = [
  'Crop', 'Season start year', 'Farming strategy', 'Machine use',
  'Fertilizer', 'Fertilizer quantity', 'Irrigation',
];

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.html',
  styleUrl: './analytics.css',
})
export class Analytics {
  readonly context = inject(FarmContextService);
  private readonly parcelsApi = inject(ParcelService);
  private readonly api = inject(SustainabilityService);

  readonly letters = ['A', 'B', 'C', 'D'];
  readonly parcels = signal<ParcelDetails[]>([]);
  readonly parcelId = signal<number | null>(null);
  readonly selected = signal<number[]>([]);
  readonly loading = signal(true);
  readonly parcelError = signal('');
  readonly results = signal<ReadonlyMap<number, ParcelSeasonSustainabilityResult | null>>(new Map());

  readonly plans = computed(() =>
    this.parcels().find(p => p.id === this.parcelId())?.seasons ?? []
  );

  readonly available = computed(() =>
    this.plans().filter(p => !this.selected().includes(p.id))
  );

  readonly columns = computed(() => this.selected().flatMap((id, index) => {
    const plan = this.plans().find(p => p.id === id);
    if (!plan) return [];

    const result = this.results().get(id);
    const detail = result?.calculation_status === 'complete' ? result : null;
    const nitrogen = detail?.sustainability.nitrogen;
    const ghg = detail ? calculateGhgImpact(detail) : null;

    let status = '';
    if (result === undefined) status = 'Loading results…';
    else if (result === null) status = 'Results could not be loaded.';
    else if (result.calculation_status === 'incomplete') {
      status = 'Missing: ' + result.missing_inputs.map(s => s.replaceAll('_', ' ')).join(', ');
    } else if (detail) {
      status = detail.yield.source === 'current_simulation'
        ? 'Current simulation'
        : 'Regional recent yield';
    }

    return [{
      plan,
      letter: this.letters[index],
      status,
      failed: result === null,
      values: [
        detail?.yield.expected_yield_t_ha ?? null,
        nitrogen?.nitrogen_balance_kg_ha ?? null,
        ghg?.emissionPerHa ?? null,
        ghg?.managementScore == null ? null : ghg.managementScore * 100,
      ],
      nitrogen: [
        nitrogen?.applied_nitrogen_kg_ha ?? null,
        nitrogen?.removed_nitrogen_kg_ha ?? null,
      ],
      settings: [
        crops[plan.crop],
        String(plan.season_start_year),
        plan.farming_strategy === 'reduced' ? 'Reduced' : 'Conventional',
        plan.machine_use
          ? plan.machine_use[0].toUpperCase() + plan.machine_use.slice(1)
          : 'Not specified',
        plan.fertilizer_type ?? 'None',
        plan.fertilizer_quantity_kg_ha == null
          ? 'Not specified'
          : this.number(plan.fertilizer_quantity_kg_ha) + ' kg/ha',
        plan.is_irrigated ? 'Yes' : 'No',
      ],
    }];
  }));

  readonly settings = settings;

  readonly metrics = [
    { label: 'Expected yield', unit: 't/ha' },
    { label: 'Partial nitrogen balance', unit: 'kg N/ha' },
    { label: 'Estimated emissions', unit: 'kg CO₂eq/ha' },
    { label: 'Management score', unit: '/100' },
  ];

  readonly charts = computed(() => {
    const columns = this.columns();
    const yieldRows = columns.map(c => ({ letter: c.letter, value: c.values[0] }));

    const nitrogenGroups = ['Applied N', 'Removed N'].map((label, i) => ({
      label,
      rows: columns.map(c => ({ letter: c.letter, value: c.nitrogen[i] })),
    }));

    return [
      { title: 'Expected yield', unit: 't/ha', groups: [{ label: '', rows: yieldRows }] },
      { title: 'Nitrogen input & removal', unit: 'kg N/ha', groups: nitrogenGroups },
    ].map(chart => ({
      ...chart,
      max: Math.max(0, ...chart.groups.flatMap(g => g.rows.map(r => r.value ?? 0))),
    }));
  });

  constructor() {
    effect(onCleanup => {
      const waiting = this.context.loading();
      const farm = this.context.selectedFarm();
      const error = this.context.errorMessage();

      this.parcels.set([]);
      this.parcelId.set(null);
      this.selected.set([]);
      this.results.set(new Map());
      this.parcelError.set(error ?? '');

      const active = farm?.parcels.filter(p => p.is_active) ?? [];
      this.loading.set(waiting || (!error && active.length > 0));
      if (waiting || error || !active.length) return;

      const subscription = forkJoin(active.map(p =>
        this.parcelsApi.getParcel(p.id).pipe(catchError(() => of(null)))
      )).subscribe(rows => {
        const parcels = rows.filter((p): p is ParcelDetails => p !== null);
        this.parcels.set(parcels);

        if (parcels.length < active.length) {
          this.parcelError.set('Some parcels could not be loaded.');
        }

        this.openParcel(parcels[0] ?? null);
        this.loading.set(false);
      });

      onCleanup(() => subscription.unsubscribe());
    });

    effect(onCleanup => {
      const cache = untracked(this.results);
      const ids = this.selected().filter(id => !cache.has(id));
      if (!ids.length) return;

      const subscriptions = ids.map(id =>
        this.api.getParcelSeasonSustainability(id).pipe(catchError(() => of(null)))
          .subscribe(result => this.results.update(old => new Map(old).set(id, result)))
      );

      onCleanup(() => subscriptions.forEach(s => s.unsubscribe()));
    });
  }

  changeParcel(value: string): void {
    this.openParcel(this.parcels().find(p => p.id === Number(value)) ?? null);
  }

  private openParcel(parcel: ParcelDetails | null): void {
    this.parcelId.set(parcel?.id ?? null);
    this.results.set(new Map());
    const plans = parcel?.seasons ?? [];
    this.selected.set(plans.length === 1 ? [plans[0].id] : []);
  }

  addPlan(value: string): void {
    const id = Number(value);
    if (this.selected().length >= 4 || !this.available().some(p => p.id === id)) return;
    this.selected.update(ids => [...ids, id]);
  }

  removePlan(id: number): void {
    this.selected.update(ids => ids.filter(item => item !== id));
  }

  planLabel(plan: ParcelSeason): string {
    return [
      plan.plan_name,
      crops[plan.crop],
      plan.season_start_year,
      plan.farming_strategy === 'reduced' ? 'Reduced' : 'Conventional',
    ].join(' · ');
  }

  number(value: number | null): string {
    return value == null ? '—' : value.toLocaleString('en-GB', { maximumFractionDigits: 2 });
  }

  delta(value: number | null, baseline: number | null): string {
    if (value == null || baseline == null) return '—';
    const change = Math.round((value - baseline) * 100) / 100;
    return (change > 0 ? '+' : '') + this.number(change);
  }
}