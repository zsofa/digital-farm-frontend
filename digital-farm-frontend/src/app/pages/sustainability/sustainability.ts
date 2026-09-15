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
  CompleteParcelSeasonSustainabilityResult,
  FarmSustainabilityResult,
  ParcelSeasonSustainabilityResult,
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


type SustainabilityTab =
  | 'overview'
  | 'nitrogen'
  | 'soil'
  | 'ghg';


interface ParcelPlanGroup {
  parcel:
    ParcelDetails;

  seasons:
    ParcelSeason[];
}


function isCompleteDetailedResult(
  result:
    ParcelSeasonSustainabilityResult,
): result is CompleteParcelSeasonSustainabilityResult {

  return (
    result.calculation_status
    === 'complete'
  );
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


  private calculationRequestVersion = 0;

  private detailRequestVersion = 0;


  readonly farm =
    this.farmContext.selectedFarm;

  readonly farmLoading =
    this.farmContext.loading;


  readonly activeTab =
    signal<SustainabilityTab>(
      'overview',
    );


  readonly loadingPlans =
    signal(true);

  readonly calculating =
    signal(false);

  readonly loadingDetails =
    signal(false);


  readonly errorMessage =
    signal<string | null>(
      null,
    );

  readonly analysisErrorMessage =
    signal<string | null>(
      null,
    );


  readonly planGroups =
    signal<ParcelPlanGroup[]>(
      [],
    );


  readonly selectedSeasonIds =
    signal<
      Record<
        number,
        number | null
      >
    >({});


  readonly farmResult =
    signal<FarmSustainabilityResult | null>(
      null,
    );


  readonly detailedResults =
    signal<
      ParcelSeasonSustainabilityResult[]
    >([]);


  readonly selectedIds =
    computed(() => {

      return this.planGroups()
        .map(
          group =>
            this.selectedSeasonIds()[
              group.parcel.id
            ],
        )
        .filter(
          (
            id,
          ): id is number =>
            id !== null
            && id !== undefined,
        );
    });


  readonly completeDetailedResults =
    computed<
      CompleteParcelSeasonSustainabilityResult[]
    >(() => {

      return this.detailedResults()
        .filter(
          isCompleteDetailedResult,
        );
    });


  readonly incompleteDetailedCount =
    computed(() => {

      return this.detailedResults()
        .filter(
          result =>
            result.calculation_status
            === 'incomplete',
        )
        .length;
    });


  constructor() {

    effect(() => {

      const loading =
        this.farmLoading();

      const farm =
        this.farm();


      if (loading) {

        this.loadingPlans.set(
          true,
        );

        return;
      }


      if (!farm) {

        this.resetPage();

        this.loadingPlans.set(
          false,
        );

        this.errorMessage.set(
          'No farm available.',
        );

        return;
      }


      this.loadPlans(
        farm,
      );
    });
  }


  setActiveTab(
    tab: SustainabilityTab,
  ): void {

    this.activeTab.set(
      tab,
    );
  }


  private resetPage(): void {

    this.calculationRequestVersion += 1;

    this.detailRequestVersion += 1;

    this.planGroups.set([]);

    this.selectedSeasonIds.set({});

    this.farmResult.set(
      null,
    );

    this.detailedResults.set([]);

    this.errorMessage.set(
      null,
    );

    this.analysisErrorMessage.set(
      null,
    );
  }


  private loadPlans(
    farm: FarmDetails,
  ): void {

    this.resetPage();

    this.loadingPlans.set(
      true,
    );


    const activeParcels =
      farm.parcels.filter(
        parcel =>
          parcel.is_active,
      );


    if (
      activeParcels.length === 0
    ) {

      this.buildPlanGroups(
        [],
      );

      this.loadingPlans.set(
        false,
      );

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

            this.loadingPlans.set(
              false,
            );
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
      Record<
        number,
        number | null
      > = {};


    for (
      const group
      of groups
    ) {

      initialSelection[
        group.parcel.id
      ] =
        group.seasons.length
        === 1
          ? group.seasons[0].id
          : null;
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


    const selectedIds =
      this.selectedIds();


    const requestVersion =
      ++this.calculationRequestVersion;


    this.calculating.set(
      true,
    );

    this.errorMessage.set(
      null,
    );

    this.analysisErrorMessage.set(
      null,
    );


    this.sustainabilityService
      .calculateFarm(
        farm.id,
        selectedIds,
      )
      .pipe(
        finalize(
          () => {

            if (
              requestVersion
              === this.calculationRequestVersion
            ) {

              this.calculating.set(
                false,
              );
            }
          },
        ),
      )
      .subscribe({

        next: result => {

          if (
            requestVersion
            !== this.calculationRequestVersion
          ) {
            return;
          }


          this.farmResult.set(
            result,
          );


          this.loadDetailedResults(
            selectedIds,
          );
        },


        error: error => {

          if (
            requestVersion
            !== this.calculationRequestVersion
          ) {
            return;
          }


          this.errorMessage.set(
            error?.error?.error
            ?? 'Could not calculate sustainability.',
          );
        },
      });
  }


  private loadDetailedResults(
    seasonIds: number[],
  ): void {

    const requestVersion =
      ++this.detailRequestVersion;


    this.detailedResults.set([]);

    this.analysisErrorMessage.set(
      null,
    );


    if (
      seasonIds.length === 0
    ) {

      this.loadingDetails.set(
        false,
      );

      return;
    }


    this.loadingDetails.set(
      true,
    );


    forkJoin(
      seasonIds.map(
        seasonId =>
          this.sustainabilityService
            .getParcelSeasonSustainability(
              seasonId,
            )
            .pipe(
              catchError(
                () => of(null),
              ),
            ),
      ),
    )
      .pipe(
        finalize(
          () => {

            if (
              requestVersion
              === this.detailRequestVersion
            ) {

              this.loadingDetails.set(
                false,
              );
            }
          },
        ),
      )
      .subscribe(
        results => {

          if (
            requestVersion
            !== this.detailRequestVersion
          ) {
            return;
          }


          const availableResults =
            results.filter(
              (
                result,
              ): result is ParcelSeasonSustainabilityResult =>
                result !== null,
            );


          this.detailedResults.set(
            availableResults,
          );


          if (
            availableResults.length
            !== seasonIds.length
          ) {

            this.analysisErrorMessage.set(
              'Some detailed sustainability data could not be loaded.',
            );
          }
        },
      );
  }


  onPlanChange(
    parcelId: number,
    event: Event,
  ): void {

    const target =
      event.target;


    if (
      !(
        target
        instanceof HTMLSelectElement
      )
    ) {
      return;
    }


    const seasonId =
      target.value
        ? Number(
            target.value,
          )
        : null;


    this.selectedSeasonIds.update(
      current => ({
        ...current,

        [parcelId]:
          seasonId,
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


  formatPlan(
    season: ParcelSeason,
  ): string {

    return (
      `${season.plan_name} — `
      + `${this.formatCrop(
        season.crop,
      )} · `
      + `${this.formatStrategy(
        season.farming_strategy,
      )}`
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


  formatMachineUse(
    value: string | null,
  ): string {

    if (!value) {
      return 'Not specified';
    }


    const labels:
      Record<string, string> = {

        low:
          'Low',

        medium:
          'Medium',

        high:
          'High',
      };


    return (
      labels[value]
      ?? value
    );
  }


  formatFertilizer(
    value: string | null,
  ): string {

    return value ?? 'None';
  }


  formatSoilSource(
    value: string,
  ): string {

    if (
      value === 'user'
    ) {
      return 'User measurement';
    }

    if (
      value === 'soilgrids'
    ) {
      return 'SoilGrids';
    }

    return value;
  }


  formatYieldSource(
    value: string,
  ): string {

    if (
      value
      === 'current_simulation'
    ) {
      return 'Current simulation';
    }

    if (
      value
      === 'regional_recent_yield'
    ) {
      return 'Regional recent yield';
    }

    return value;
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


  formatNumber(
    value: number,
    digits = 1,
  ): string {

    return value.toFixed(
      digits,
    );
  }


  formatSignedNumber(
    value: number,
    digits = 1,
  ): string {

    const prefix =
      value > 0
        ? '+'
        : '';


    return (
      `${prefix}${value.toFixed(
        digits,
      )}`
    );
  }


  scorePercent(
    value: number,
  ): number {

    return Math.round(
      Math.min(
        1,
        Math.max(
          0,
          value,
        ),
      )
      * 100,
    );
  }
}