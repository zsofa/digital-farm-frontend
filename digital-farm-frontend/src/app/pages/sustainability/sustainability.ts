import {
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import {
  catchError,
  finalize,
  forkJoin,
  of,
  switchMap,
} from 'rxjs';

import {
  SustainabilityService,
} from '../../services/sustainability.service';

import {
  FarmSustainabilityResult,
  ParcelSustainabilityResult,
} from '../../models/sustainability.model';

import {
  ParcelDetails,
  ParcelSeason,
} from '../../models/parcel.model';



interface ParcelPlanGroup {
  parcel: ParcelDetails;
  seasons: ParcelSeason[];
}


@Component({
  selector: 'app-sustainability',
  standalone: true,
  imports: [
    CommonModule,
  ],
  templateUrl: './sustainability.html',
  styleUrl: './sustainability.css',
})
export class Sustainability {

  private readonly route = inject(
    ActivatedRoute,
  );

  private readonly sustainabilityService =
    inject(SustainabilityService);


  readonly farmId =
    signal<number | null>(null);

  readonly loadingPlans =
    signal(true);

  readonly calculating =
    signal(false);

  readonly errorMessage =
    signal<string | null>(null);

  readonly planGroups =
    signal<ParcelPlanGroup[]>([]);

  readonly selectedSeasonIds =
    signal<Record<number, number | null>>(
      {},
    );

  readonly farmResult =
    signal<FarmSustainabilityResult | null>(
      null,
    );


  readonly selectedIds = computed(
    () => {
      return Object.values(
        this.selectedSeasonIds(),
      ).filter(
        (
          id,
        ): id is number => id !== null,
      );
    },
  );


  constructor() {
    this.loadFarmFromRoute();
  }


  private loadFarmFromRoute(): void {
    const routeFarmId =
      this.route.snapshot.paramMap.get(
        'farmId',
      );

    const queryFarmId =
      this.route.snapshot.queryParamMap.get(
        'farmId',
      );

    const rawFarmId =
      routeFarmId ?? queryFarmId;

    if (!rawFarmId) {
      this.loadingPlans.set(false);

      this.errorMessage.set(
        'No farm selected.',
      );

      return;
    }

    const farmId = Number(rawFarmId);

    if (
      !Number.isInteger(farmId)
      || farmId <= 0
    ) {
      this.loadingPlans.set(false);

      this.errorMessage.set(
        'Invalid farm selection.',
      );

      return;
    }

    this.farmId.set(farmId);

    this.loadPlans();
  }


  private loadPlans(): void {
    const farmId = this.farmId();

    if (farmId === null) {
      return;
    }

    this.loadingPlans.set(true);
    this.errorMessage.set(null);

    this.sustainabilityService
      .getFarmParcels(farmId)
      .pipe(
        switchMap(
          parcels => {

            const activeParcels =
              parcels.filter(
                parcel =>
                  parcel.is_active,
              );

            if (
              activeParcels.length === 0
            ) {
              return of(
                [] as ParcelDetails[],
              );
            }

            return forkJoin(
              activeParcels.map(
                parcel =>
                  this.sustainabilityService
                    .getParcelDetails(
                      parcel.id,
                    ),
              ),
            );
          },
        ),

        catchError(
          error => {
            this.errorMessage.set(
              error?.error?.error
              ?? 'Could not load sustainability data.',
            );

            return of(
              [] as ParcelDetails[],
            );
          },
        ),

        finalize(
          () => {
            this.loadingPlans.set(false);
          },
        ),
      )
      .subscribe(
        parcels => {
          this.buildPlanGroups(
            parcels,
          );
        },
      );
  }


  private buildPlanGroups(
    parcels: ParcelDetails[],
  ): void {

    const groups: ParcelPlanGroup[] =
      parcels.map(
        parcel => ({
          parcel,
          seasons: [
            ...parcel.seasons,
          ],
        }),
      );

    this.planGroups.set(groups);

    const initialSelection:
      Record<number, number | null> = {};

    for (const group of groups) {

      if (
        group.seasons.length === 1
      ) {
        initialSelection[
          group.parcel.id
        ] = group.seasons[0].id;

      } else {
        initialSelection[
          group.parcel.id
        ] = null;
      }
    }

    this.selectedSeasonIds.set(
      initialSelection,
    );

    this.calculate();
  }


  calculate(): void {
    const farmId = this.farmId();

    if (farmId === null) {
      return;
    }

    this.calculating.set(true);
    this.errorMessage.set(null);

    this.sustainabilityService
      .calculateFarm(
        farmId,
        this.selectedIds(),
      )
      .pipe(
        finalize(
          () => {
            this.calculating.set(false);
          },
        ),
      )
      .subscribe({
        next: result => {
          this.farmResult.set(result);
        },

        error: error => {
          this.errorMessage.set(
            error?.error?.error
            ?? 'Could not calculate sustainability.',
          );
        },
      });
  }


  onPlanChange(
    parcelId: number,
    event: Event,
  ): void {

    const select =
      event.target as HTMLSelectElement;

    const value =
      select.value;

    const seasonId =
      value
        ? Number(value)
        : null;

    this.selectedSeasonIds.update(
      current => ({
        ...current,
        [parcelId]: seasonId,
      }),
    );

    this.calculate();
  }


  selectedPlanId(
    parcelId: number,
  ): number | null {

    return (
      this.selectedSeasonIds()[
        parcelId
      ] ?? null
    );
  }


  resultForParcel(
    parcelId: number,
  ): ParcelSustainabilityResult | null {

    return (
      this.farmResult()
        ?.parcel_seasons
        .find(
          result =>
            result.parcel_id
            === parcelId,
        )
      ?? null
    );
  }


  formatCrop(
    crop: string,
  ): string {

    const labels:
      Record<string, string> = {
        wheat: 'Wheat',
        barley: 'Barley',
        maize: 'Maize',
      };

    return labels[crop] ?? crop;
  }


  formatStrategy(
    strategy: string,
  ): string {

    const labels:
      Record<string, string> = {
        conventional:
          'Conventional',

        reduced:
          'Reduced',
      };

    return (
      labels[strategy]
      ?? strategy
    );
  }


  formatMissingInput(
    input: string,
  ): string {

    const labels:
      Record<string, string> = {
        machine_use:
          'Machine use',

        farming_strategy:
          'Farming strategy',

        soil_ph:
          'Soil pH',

        soil_soc_g_kg:
          'Soil organic carbon',

        soil_clay_pct:
          'Clay content',
      };

    return (
      labels[input]
      ?? input
    );
  }
}