import {
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';

import {
  CommonModule,
} from '@angular/common';

import {
  catchError,
  finalize,
  forkJoin,
  of,
} from 'rxjs';

import {
  FarmDetails,
} from '../../models/farm.model';

import {
  ParcelDetails,
  ParcelSeason,
} from '../../models/parcel.model';

import {
  FarmSustainabilityResult,
  ParcelSustainabilityResult,
} from '../../models/sustainability.model';

import {
  FarmContextService,
} from '../../services/farm-context.service';

import {
  ParcelService,
} from '../../services/parcel.service';

import {
  SustainabilityService,
} from '../../services/sustainability.service';


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

  templateUrl:
    './sustainability.html',

  styleUrl:
    './sustainability.css',
})
export class Sustainability {

  private readonly farmContext =
    inject(FarmContextService);

  private readonly parcelService =
    inject(ParcelService);

  private readonly sustainabilityService =
    inject(SustainabilityService);


  readonly farm =
    this.farmContext.selectedFarm;

  readonly farmLoading =
    this.farmContext.loading;


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


  readonly selectedIds =
    computed(() => {

      return Object.values(
        this.selectedSeasonIds(),
      ).filter(
        (
          id,
        ): id is number =>
          id !== null,
      );
    });


  constructor() {

    effect(() => {

      const loading =
        this.farmLoading();

      const farm =
        this.farm();

      if (loading) {
        this.loadingPlans.set(true);
        return;
      }

      if (!farm) {

        this.resetPage();

        this.loadingPlans.set(false);

        this.errorMessage.set(
          'No farm available.',
        );

        return;
      }

      this.loadPlans(farm);
    });
  }


  private resetPage(): void {

    this.planGroups.set([]);

    this.selectedSeasonIds.set({});

    this.farmResult.set(null);

    this.errorMessage.set(null);
  }


  private loadPlans(
    farm: FarmDetails,
  ): void {

    this.resetPage();

    this.loadingPlans.set(true);


    const activeParcels =
      farm.parcels.filter(
        parcel =>
          parcel.is_active,
      );


    if (
      activeParcels.length === 0
    ) {

      this.buildPlanGroups([]);

      this.loadingPlans.set(false);

      return;
    }


    forkJoin(
      activeParcels.map(
        parcel =>
          this.parcelService
            .getParcel(
              parcel.id,
            ),
      ),
    )
      .pipe(
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

          if (
            this.errorMessage()
          ) {
            return;
          }

          this.buildPlanGroups(
            parcels,
          );
        },
      );
  }


  private buildPlanGroups(
    parcels: ParcelDetails[],
  ): void {

    const groups:
      ParcelPlanGroup[] =
        parcels.map(
          parcel => ({
            parcel,

            seasons: [
              ...parcel.seasons,
            ],
          }),
        );


    this.planGroups.set(
      groups,
    );


    const initialSelection:
      Record<number, number | null> =
        {};


    for (
      const group of groups
    ) {

      if (
        group.seasons.length === 1
      ) {

        initialSelection[
          group.parcel.id
        ] =
          group.seasons[0].id;

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

    const farm =
      this.farm();

    if (!farm) {
      return;
    }


    this.calculating.set(true);

    this.errorMessage.set(null);


    this.sustainabilityService
      .calculateFarm(
        farm.id,
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

          this.farmResult.set(
            result,
          );
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
  const select = event.target as HTMLSelectElement;

  const seasonId = select.value
    ? Number(select.value)
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
      ]
      ?? null
    );
  }


  resultForParcel(
    parcelId: number,
  ):
    ParcelSustainabilityResult
    | null {

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

        wheat:
          'Wheat',

        barley:
          'Barley',

        maize:
          'Maize',
      };


    return (
      labels[crop]
      ?? crop
    );
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