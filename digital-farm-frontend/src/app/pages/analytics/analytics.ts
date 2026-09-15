import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';

import {
  catchError,
  finalize,
  forkJoin,
  of,
} from 'rxjs';

import {
  Chart,
  ChartConfiguration,
  registerables,
} from 'chart.js';

import {
  FarmDetails,
} from '../../models/farm.model';

import {
  ParcelDetails,
  ParcelSeason,
} from '../../models/parcel.model';

import {
  CompleteParcelSeasonSustainabilityResult,
  ParcelSeasonSustainabilityResult,
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


Chart.register(
  ...registerables,
);


type AnalyticsTab =
  | 'overview'
  | 'comparison';


interface AnalyticsPlanGroup {
  parcel: ParcelDetails;

  seasons: ParcelSeason[];
}


interface CropPerformance {
  crop: string;

  averageYield: number;

  area: number;
}


interface Recommendation {
  title: string;

  reason: string;

  tone:
  | 'a'
  | 'b'
  | 'neutral';
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
  selector: 'app-analytics',

  standalone: true,

  imports: [],

  templateUrl:
    './analytics.html',

  styleUrl:
    './analytics.css',
})
export class Analytics
  implements OnDestroy {

  private readonly farmContext =
    inject(FarmContextService);

  private readonly parcelService =
    inject(ParcelService);

  private readonly sustainabilityService =
    inject(SustainabilityService);


  private overviewRequestVersion = 0;

  private comparisonRequestVersion = 0;


  private yieldScatterChart:
    Chart | null = null;

  private cropPerformanceChart:
    Chart | null = null;

  private strategyProfileChart:
    Chart | null = null;

  private tradeoffChart:
    Chart | null = null;


  @ViewChild(
    'yieldScatterCanvas',
  )
  private yieldScatterCanvas?:
    ElementRef<HTMLCanvasElement>;


  @ViewChild(
    'cropPerformanceCanvas',
  )
  private cropPerformanceCanvas?:
    ElementRef<HTMLCanvasElement>;


  @ViewChild(
    'strategyProfileCanvas',
  )
  private strategyProfileCanvas?:
    ElementRef<HTMLCanvasElement>;


  @ViewChild(
    'tradeoffCanvas',
  )
  private tradeoffCanvas?:
    ElementRef<HTMLCanvasElement>;


  readonly farm =
    this.farmContext.selectedFarm;

  readonly farmLoading =
    this.farmContext.loading;


  readonly activeTab =
    signal<AnalyticsTab>(
      'overview',
    );


  readonly loadingPlans =
    signal(true);

  readonly loadingOverview =
    signal(false);

  readonly loadingComparison =
    signal(false);


  readonly errorMessage =
    signal<string | null>(
      null,
    );

  readonly overviewWarning =
    signal<string | null>(
      null,
    );

  readonly comparisonErrorMessage =
    signal<string | null>(
      null,
    );


  readonly planGroups =
    signal<AnalyticsPlanGroup[]>(
      [],
    );


  readonly selectedSeasonIds =
    signal<
      Record<
        number,
        number | null
      >
    >({});


  readonly detailBySeason =
    signal<
      Record<
        number,
        ParcelSeasonSustainabilityResult
      >
    >({});


  readonly comparisonParcelId =
    signal<number | null>(
      null,
    );

  readonly comparisonSeasonAId =
    signal<number | null>(
      null,
    );

  readonly comparisonSeasonBId =
    signal<number | null>(
      null,
    );


  readonly comparisonA =
    signal<
      ParcelSeasonSustainabilityResult
      | null
    >(null);

  readonly comparisonB =
    signal<
      ParcelSeasonSustainabilityResult
      | null
    >(null);


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


  readonly overviewCompleteDetails =
    computed<
      CompleteParcelSeasonSustainabilityResult[]
    >(() => {

      const details =
        this.detailBySeason();

      return this.selectedIds()
        .map(
          id =>
            details[id],
        )
        .filter(
          (
            result,
          ): result is CompleteParcelSeasonSustainabilityResult =>
            result !== undefined
            && isCompleteDetailedResult(
              result,
            ),
        );
    });


  readonly unselectedParcelCount =
    computed(() => {

      return this.planGroups()
        .filter(
          group =>
            group.seasons.length > 1
            && this.selectedSeasonIds()[
            group.parcel.id
            ] === null,
        )
        .length;
    });


  readonly incompletePlanCount =
    computed(() => {

      const details =
        this.detailBySeason();

      return this.selectedIds()
        .map(
          id =>
            details[id],
        )
        .filter(
          detail =>
            detail !== undefined
            && detail.calculation_status
            === 'incomplete',
        )
        .length;
    });


  readonly includedArea =
    computed(() => {

      return this.overviewCompleteDetails()
        .reduce(
          (
            total,
            detail,
          ) =>
            total
            + detail.parcel
              .official_area_ha,
          0,
        );
    });


  readonly averageYield =
    computed<number | null>(
      () => {

        const details =
          this.overviewCompleteDetails();

        return this.weightedAverage(
          details,
          detail =>
            detail.yield
              .expected_yield_t_ha,
        );
      },
    );


  readonly averageSustainability =
    computed<number | null>(
      () => {

        const details =
          this.overviewCompleteDetails();

        return this.weightedAverage(
          details,
          detail =>
            detail.sustainability
              .sustainability_score
            * 100,
        );
      },
    );


  readonly fertilizerCo2eTotal =
    computed<number | null>(
      () => {

        const details =
          this.overviewCompleteDetails();

        if (
          details.length === 0
        ) {
          return null;
        }

        return details.reduce(
          (
            total,
            detail,
          ) => {

            return (
              total
              + detail.sustainability
                .ghg
                .fertilizer_emission_kg_co2e_ha
              * detail.parcel
                .official_area_ha
            );
          },
          0,
        );
      },
    );


  readonly bestField =
    computed<
      CompleteParcelSeasonSustainabilityResult
      | null
    >(() => {

      const details =
        this.overviewCompleteDetails();

      if (
        details.length === 0
      ) {
        return null;
      }

      return details.reduce(
        (
          best,
          current,
        ) => {

          return (
            current
              .sustainability
              .sustainability_score
            >
            best
              .sustainability
              .sustainability_score
          )
            ? current
            : best;
        },
      );
    });


  readonly worstField =
    computed<
      CompleteParcelSeasonSustainabilityResult
      | null
    >(() => {

      const details =
        this.overviewCompleteDetails();

      if (
        details.length === 0
      ) {
        return null;
      }

      return details.reduce(
        (
          worst,
          current,
        ) => {

          return (
            current
              .sustainability
              .sustainability_score
            <
            worst
              .sustainability
              .sustainability_score
          )
            ? current
            : worst;
        },
      );
    });


  readonly cropPerformance =
    computed<CropPerformance[]>(
      () => {

        const crops =
          new Map<
            string,
            {
              weightedYield: number;
              area: number;
            }
          >();


        for (
          const detail
          of this.overviewCompleteDetails()
        ) {

          const crop =
            detail.season.crop;

          const area =
            detail.parcel
              .official_area_ha;

          const yieldValue =
            detail.yield
              .expected_yield_t_ha;


          const current =
            crops.get(
              crop,
            )
            ?? {
              weightedYield: 0,
              area: 0,
            };


          current.weightedYield +=
            yieldValue * area;

          current.area +=
            area;


          crops.set(
            crop,
            current,
          );
        }


        return Array.from(
          crops.entries(),
        )
          .map(
            (
              [
                crop,
                values,
              ],
            ) => ({
              crop,

              averageYield:
                values.area > 0
                  ? values.weightedYield
                  / values.area
                  : 0,

              area:
                values.area,
            }),
          )
          .sort(
            (
              a,
              b,
            ) =>
              b.averageYield
              - a.averageYield,
          );
      },
    );


  readonly comparisonGroups =
    computed(() => {

      return this.planGroups()
        .filter(
          group =>
            group.seasons.length >= 2,
        );
    });


  readonly comparisonSeasons =
    computed(() => {

      const parcelId =
        this.comparisonParcelId();

      if (
        parcelId === null
      ) {
        return [];
      }

      return (
        this.comparisonGroups()
          .find(
            group =>
              group.parcel.id
              === parcelId,
          )
          ?.seasons
        ?? []
      );
    });


  readonly comparisonAComplete =
    computed<
      CompleteParcelSeasonSustainabilityResult
      | null
    >(() => {

      const result =
        this.comparisonA();

      if (
        result
        && isCompleteDetailedResult(
          result,
        )
      ) {
        return result;
      }

      return null;
    });


  readonly comparisonBComplete =
    computed<
      CompleteParcelSeasonSustainabilityResult
      | null
    >(() => {

      const result =
        this.comparisonB();

      if (
        result
        && isCompleteDetailedResult(
          result,
        )
      ) {
        return result;
      }

      return null;
    });


  readonly yieldChangePct =
    computed<number | null>(
      () => {

        const a =
          this.comparisonAComplete();

        const b =
          this.comparisonBComplete();

        if (
          !a
          || !b
        ) {
          return null;
        }

        return this.calculateChange(
          a.yield
            .expected_yield_t_ha,

          b.yield
            .expected_yield_t_ha,
        );
      },
    );


  readonly sustainabilityChangePct =
    computed<number | null>(
      () => {

        const a =
          this.comparisonAComplete();

        const b =
          this.comparisonBComplete();

        if (
          !a
          || !b
        ) {
          return null;
        }

        return this.calculateChange(
          a.sustainability
            .sustainability_score,

          b.sustainability
            .sustainability_score,
        );
      },
    );


  readonly carbonChangePct =
    computed<number | null>(
      () => {

        const a =
          this.comparisonAComplete();

        const b =
          this.comparisonBComplete();

        if (
          !a
          || !b
        ) {
          return null;
        }

        return this.calculateChange(
          a.sustainability
            .ghg
            .fertilizer_emission_kg_co2e_ha,

          b.sustainability
            .ghg
            .fertilizer_emission_kg_co2e_ha,
        );
      },
    );


  readonly recommendation =
    computed<Recommendation>(
      () => {

        const a =
          this.comparisonAComplete();

        const b =
          this.comparisonBComplete();


        if (
          !a
          || !b
        ) {
          return {
            title:
              'Recommendation unavailable',

            reason:
              'Both plans need complete sustainability data before they can be compared.',

            tone:
              'neutral',
          };
        }


        const yieldA =
          a.yield
            .expected_yield_t_ha;

        const yieldB =
          b.yield
            .expected_yield_t_ha;

        const scoreA =
          a.sustainability
            .sustainability_score;

        const scoreB =
          b.sustainability
            .sustainability_score;

        const carbonA =
          a.sustainability
            .ghg
            .fertilizer_emission_kg_co2e_ha;

        const carbonB =
          b.sustainability
            .ghg
            .fertilizer_emission_kg_co2e_ha;


        const aDominates =
          yieldA >= yieldB
          && scoreA >= scoreB
          && carbonA <= carbonB
          && (
            yieldA > yieldB
            || scoreA > scoreB
            || carbonA < carbonB
          );


        const bDominates =
          yieldB >= yieldA
          && scoreB >= scoreA
          && carbonB <= carbonA
          && (
            yieldB > yieldA
            || scoreB > scoreA
            || carbonB < carbonA
          );


        if (aDominates) {
          return {
            title:
              `Recommended: ${this.planName(a)}`,

            reason:
              'Plan A provides equal or better yield and sustainability with equal or lower fertilizer-related emissions.',

            tone:
              'a',
          };
        }


        if (bDominates) {
          return {
            title:
              `Recommended: ${this.planName(b)}`,

            reason:
              'Plan B provides equal or better yield and sustainability with equal or lower fertilizer-related emissions.',

            tone:
              'b',
          };
        }


        const aYieldSimilar =
          yieldA
          >= yieldB * 0.95;

        const bYieldSimilar =
          yieldB
          >= yieldA * 0.95;


        if (
          scoreA > scoreB
          && carbonA < carbonB
          && aYieldSimilar
        ) {
          return {
            title:
              `Recommended: ${this.planName(a)}`,

            reason:
              'Plan A improves sustainability and lowers fertilizer-related emissions while expected yield remains within 5% of Plan B.',

            tone:
              'a',
          };
        }


        if (
          scoreB > scoreA
          && carbonB < carbonA
          && bYieldSimilar
        ) {
          return {
            title:
              `Recommended: ${this.planName(b)}`,

            reason:
              'Plan B improves sustainability and lowers fertilizer-related emissions while expected yield remains within 5% of Plan A.',

            tone:
              'b',
          };
        }


        return {
          title:
            'Trade-off — no plan clearly dominates',

          reason:
            'The plans provide different benefits across yield, sustainability and fertilizer-related emissions. Review the trade-off charts before deciding.',

          tone:
            'neutral',
        };
      },
    );


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


  ngOnDestroy(): void {

    this.destroyCharts();
  }


  setActiveTab(
    tab: AnalyticsTab,
  ): void {

    this.activeTab.set(
      tab,
    );

    this.scheduleChartRender();
  }


  private resetPage(): void {

    this.overviewRequestVersion += 1;

    this.comparisonRequestVersion += 1;

    this.planGroups.set([]);

    this.selectedSeasonIds.set({});

    this.detailBySeason.set({});

    this.comparisonParcelId.set(
      null,
    );

    this.comparisonSeasonAId.set(
      null,
    );

    this.comparisonSeasonBId.set(
      null,
    );

    this.comparisonA.set(
      null,
    );

    this.comparisonB.set(
      null,
    );

    this.errorMessage.set(
      null,
    );

    this.overviewWarning.set(
      null,
    );

    this.comparisonErrorMessage.set(
      null,
    );

    this.destroyCharts();
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
              ?? 'Could not load analytics data.',
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
      AnalyticsPlanGroup[] =
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


    const selection:
      Record<
        number,
        number | null
      > = {};


    for (
      const group
      of groups
    ) {

      selection[
        group.parcel.id
      ] =
        group.seasons.length
          === 1
          ? group.seasons[0].id
          : null;
    }


    this.selectedSeasonIds.set(
      selection,
    );


    this.loadOverviewDetails();

    this.initializeComparison();
  }


  private loadOverviewDetails(): void {

    const ids =
      this.selectedIds();

    const requestVersion =
      ++this.overviewRequestVersion;


    this.detailBySeason.set({});

    this.overviewWarning.set(
      null,
    );


    if (
      ids.length === 0
    ) {

      this.loadingOverview.set(
        false,
      );

      this.scheduleChartRender();

      return;
    }


    this.loadingOverview.set(
      true,
    );


    forkJoin(
      ids.map(
        id =>
          this.sustainabilityService
            .getParcelSeasonSustainability(
              id,
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
              === this.overviewRequestVersion
            ) {

              this.loadingOverview.set(
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
            !== this.overviewRequestVersion
          ) {
            return;
          }


          const mapped:
            Record<
              number,
              ParcelSeasonSustainabilityResult
            > = {};


          let failed = 0;


          results.forEach(
            (
              result,
              index,
            ) => {

              const id =
                ids[index];

              if (
                result
                && id !== undefined
              ) {

                mapped[id] =
                  result;

              } else {

                failed += 1;
              }
            },
          );


          this.detailBySeason.set(
            mapped,
          );


          if (
            failed > 0
          ) {

            this.overviewWarning.set(
              'Some selected plans could not be included in the analytics calculation.',
            );
          }


          this.scheduleChartRender();
        },
      );
  }


  onPlanChange(
    parcelId: number,
    event: Event,
  ): void {

    const value =
      this.selectNumber(
        event,
      );


    this.selectedSeasonIds.update(
      current => ({
        ...current,

        [parcelId]:
          value,
      }),
    );


    this.loadOverviewDetails();
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


  detailForSeason(
    seasonId: number,
  ):
    ParcelSeasonSustainabilityResult
    | null {

    return (
      this.detailBySeason()[
      seasonId
      ]
      ?? null
    );
  }


  private initializeComparison(): void {

    const group =
      this.comparisonGroups()[0];


    if (!group) {

      this.comparisonParcelId.set(
        null,
      );

      this.comparisonSeasonAId.set(
        null,
      );

      this.comparisonSeasonBId.set(
        null,
      );

      this.comparisonA.set(
        null,
      );

      this.comparisonB.set(
        null,
      );

      return;
    }


    this.comparisonParcelId.set(
      group.parcel.id,
    );

    this.comparisonSeasonAId.set(
      group.seasons[0].id,
    );

    this.comparisonSeasonBId.set(
      group.seasons[1].id,
    );


    this.loadComparisonDetails();
  }


  onComparisonParcelChange(
    event: Event,
  ): void {

    const parcelId =
      this.selectNumber(
        event,
      );


    this.comparisonParcelId.set(
      parcelId,
    );


    const group =
      this.comparisonGroups()
        .find(
          item =>
            item.parcel.id
            === parcelId,
        );


    if (
      !group
      || group.seasons.length < 2
    ) {

      this.comparisonSeasonAId.set(
        null,
      );

      this.comparisonSeasonBId.set(
        null,
      );

      return;
    }


    this.comparisonSeasonAId.set(
      group.seasons[0].id,
    );

    this.comparisonSeasonBId.set(
      group.seasons[1].id,
    );


    this.loadComparisonDetails();
  }


  onComparisonAChange(
    event: Event,
  ): void {

    this.comparisonSeasonAId.set(
      this.selectNumber(
        event,
      ),
    );

    this.loadComparisonDetails();
  }


  onComparisonBChange(
    event: Event,
  ): void {

    this.comparisonSeasonBId.set(
      this.selectNumber(
        event,
      ),
    );

    this.loadComparisonDetails();
  }


  private loadComparisonDetails(): void {

    const seasonAId =
      this.comparisonSeasonAId();

    const seasonBId =
      this.comparisonSeasonBId();


    const requestVersion =
      ++this.comparisonRequestVersion;


    this.comparisonA.set(
      null,
    );

    this.comparisonB.set(
      null,
    );

    this.comparisonErrorMessage.set(
      null,
    );


    if (
      seasonAId === null
      || seasonBId === null
      || seasonAId === seasonBId
    ) {

      this.loadingComparison.set(
        false,
      );

      return;
    }


    this.loadingComparison.set(
      true,
    );


    forkJoin([
      this.sustainabilityService
        .getParcelSeasonSustainability(
          seasonAId,
        )
        .pipe(
          catchError(
            () => of(null),
          ),
        ),

      this.sustainabilityService
        .getParcelSeasonSustainability(
          seasonBId,
        )
        .pipe(
          catchError(
            () => of(null),
          ),
        ),
    ])
      .pipe(
        finalize(
          () => {

            if (
              requestVersion
              === this.comparisonRequestVersion
            ) {

              this.loadingComparison.set(
                false,
              );
            }
          },
        ),
      )
      .subscribe(
        (
          [
            resultA,
            resultB,
          ],
        ) => {

          if (
            requestVersion
            !== this.comparisonRequestVersion
          ) {
            return;
          }


          this.comparisonA.set(
            resultA,
          );

          this.comparisonB.set(
            resultB,
          );


          if (
            !resultA
            || !resultB
          ) {

            this.comparisonErrorMessage.set(
              'One or both plans could not be loaded.',
            );
          }


          this.scheduleChartRender();
        },
      );
  }


  private weightedAverage(
    details:
      CompleteParcelSeasonSustainabilityResult[],

    value:
      (
        detail:
          CompleteParcelSeasonSustainabilityResult,
      ) => number,
  ): number | null {

    const totalArea =
      details.reduce(
        (
          total,
          detail,
        ) =>
          total
          + detail.parcel
            .official_area_ha,
        0,
      );


    if (
      totalArea <= 0
    ) {
      return null;
    }


    return (
      details.reduce(
        (
          total,
          detail,
        ) => {

          return (
            total
            + value(
              detail,
            )
            * detail.parcel
              .official_area_ha
          );
        },
        0,
      )
      / totalArea
    );
  }


  private calculateChange(
    oldValue: number,
    newValue: number,
  ): number | null {

    if (
      oldValue === 0
    ) {

      if (
        newValue === 0
      ) {
        return 0;
      }

      return null;
    }


    return (
      (
        newValue
        - oldValue
      )
      / oldValue
      * 100
    );
  }


  formatChange(
    value: number | null,
  ): string {

    if (
      value === null
    ) {
      return '—';
    }


    const prefix =
      value > 0
        ? '+'
        : '';


    return (
      `${prefix}${value.toFixed(1)}%`
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


  formatCarbonTotal(
    value: number | null,
  ): string {

    if (
      value === null
    ) {
      return '—';
    }


    if (
      value >= 1000
    ) {

      return (
        `${(
          value / 1000
        ).toFixed(2)} t`
      );
    }


    return (
      `${value.toFixed(0)} kg`
    );
  }


  score100(
    value: number,
  ): number {

    return Math.round(
      value * 100,
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


  formatPlanLabel(
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

  private planName(
    detail:
      CompleteParcelSeasonSustainabilityResult,
  ): string {

    return (
      `${detail.season.plan_name} — `
      + `${this.formatCrop(
        detail.season.crop,
      )} · `
      + `${this.formatStrategy(
        detail.season
          .farming_strategy,
      )}`
    );
  }


  private selectNumber(
    event: Event,
  ): number | null {

    const target =
      event.target;


    if (
      !(
        target
        instanceof HTMLSelectElement
      )
    ) {
      return null;
    }


    if (
      target.value === ''
    ) {
      return null;
    }


    const value =
      Number(
        target.value,
      );


    return Number.isFinite(
      value,
    )
      ? value
      : null;
  }


  private scheduleChartRender(): void {

    setTimeout(
      () => {
        this.renderActiveCharts();
      },
      0,
    );
  }


  private renderActiveCharts(): void {

    this.destroyCharts();


    if (
      this.activeTab()
      === 'overview'
    ) {

      this.renderYieldScatter();

      this.renderCropPerformance();

      return;
    }


    this.renderStrategyProfile();

    this.renderTradeoff();
  }


  private renderYieldScatter(): void {

    const canvas =
      this.yieldScatterCanvas
        ?.nativeElement;

    const details =
      this.overviewCompleteDetails();


    if (
      !canvas
      || details.length === 0
    ) {
      return;
    }


    const config:
      ChartConfiguration<
        'scatter',
        {
          x: number;
          y: number;
        }[],
        unknown
      > = {

      type:
        'scatter',

      data: {
        datasets: [
          {
            label:
              'Parcels',

            data:
              details.map(
                detail => ({
                  x:
                    detail.yield
                      .expected_yield_t_ha,

                  y:
                    detail.sustainability
                      .sustainability_score
                    * 100,
                }),
              ),

            backgroundColor:
              details.map(
                detail =>
                  this.cropColor(
                    detail.season.crop,
                  ),
              ),

            borderColor:
              '#ffffff',

            borderWidth:
              2,

            pointRadius:
              8,

            pointHoverRadius:
              10,
          },
        ],
      },

      options: {
        responsive:
          true,

        maintainAspectRatio:
          false,

        plugins: {
          legend: {
            display:
              false,
          },

          tooltip: {
            callbacks: {
              label:
                context => {

                  const detail =
                    details[
                    context.dataIndex
                    ];


                  if (!detail) {
                    return '';
                  }


                  return (
                    `${detail.parcel.name}: `
                    + `${detail.yield.expected_yield_t_ha.toFixed(2)} t/ha, `
                    + `${Math.round(
                      detail.sustainability
                        .sustainability_score
                      * 100,
                    )}/100`
                  );
                },
            },
          },
        },

        scales: {
          x: {
            title: {
              display:
                true,

              text:
                'Expected yield (t/ha)',
            },

            grid: {
              color:
                'rgba(70, 90, 78, 0.08)',
            },
          },

          y: {
            min:
              0,

            max:
              100,

            title: {
              display:
                true,

              text:
                'Sustainability score',
            },

            grid: {
              color:
                'rgba(70, 90, 78, 0.08)',
            },
          },
        },
      },
    };


    this.yieldScatterChart =
      new Chart(
        canvas,
        config,
      );
  }


  private renderCropPerformance(): void {

    const canvas =
      this.cropPerformanceCanvas
        ?.nativeElement;

    const crops =
      this.cropPerformance();


    if (
      !canvas
      || crops.length === 0
    ) {
      return;
    }


    const config:
      ChartConfiguration<
        'bar',
        number[],
        string
      > = {

      type:
        'bar',

      data: {
        labels:
          crops.map(
            crop =>
              this.formatCrop(
                crop.crop,
              ),
          ),

        datasets: [
          {
            label:
              'Average yield',

            data:
              crops.map(
                crop =>
                  crop.averageYield,
              ),

            backgroundColor:
              crops.map(
                crop =>
                  this.cropColor(
                    crop.crop,
                  ),
              ),

            borderRadius:
              8,

            borderSkipped:
              false,
          },
        ],
      },

      options: {
        responsive:
          true,

        maintainAspectRatio:
          false,

        plugins: {
          legend: {
            display:
              false,
          },

          tooltip: {
            callbacks: {
              label:
                context => {

                  const crop =
                    crops[
                    context.dataIndex
                    ];


                  if (!crop) {
                    return '';
                  }


                  return (
                    `${crop.averageYield.toFixed(2)} t/ha `
                    + `across ${crop.area.toFixed(1)} ha`
                  );
                },
            },
          },
        },

        scales: {
          x: {
            grid: {
              display:
                false,
            },
          },

          y: {
            beginAtZero:
              true,

            title: {
              display:
                true,

              text:
                'Average expected yield (t/ha)',
            },

            grid: {
              color:
                'rgba(70, 90, 78, 0.08)',
            },
          },
        },
      },
    };


    this.cropPerformanceChart =
      new Chart(
        canvas,
        config,
      );
  }


  private renderStrategyProfile(): void {

    const canvas =
      this.strategyProfileCanvas
        ?.nativeElement;

    const a =
      this.comparisonAComplete();

    const b =
      this.comparisonBComplete();


    if (
      !canvas
      || !a
      || !b
    ) {
      return;
    }


    const yieldA =
      a.yield
        .expected_yield_t_ha;

    const yieldB =
      b.yield
        .expected_yield_t_ha;

    const maxYield =
      Math.max(
        yieldA,
        yieldB,
      );


    const carbonA =
      a.sustainability
        .ghg
        .fertilizer_emission_kg_co2e_ha;

    const carbonB =
      b.sustainability
        .ghg
        .fertilizer_emission_kg_co2e_ha;


    const config:
      ChartConfiguration<
        'bar',
        number[],
        string
      > = {

      type:
        'bar',

      data: {
        labels: [
          'Yield performance',
          'Sustainability',
          'Carbon performance',
        ],

        datasets: [
          {
            label:
              'Plan A',

            data: [
              maxYield > 0
                ? yieldA
                / maxYield
                * 100
                : 0,

              a.sustainability
                .sustainability_score
              * 100,

              this.carbonPerformance(
                carbonA,
                carbonB,
              ),
            ],

            backgroundColor:
              '#3b82f6',

            borderRadius:
              7,

            borderSkipped:
              false,
          },

          {
            label:
              'Plan B',

            data: [
              maxYield > 0
                ? yieldB
                / maxYield
                * 100
                : 0,

              b.sustainability
                .sustainability_score
              * 100,

              this.carbonPerformance(
                carbonB,
                carbonA,
              ),
            ],

            backgroundColor:
              '#f97316',

            borderRadius:
              7,

            borderSkipped:
              false,
          },
        ],
      },

      options: {
        responsive:
          true,

        maintainAspectRatio:
          false,

        plugins: {
          legend: {
            position:
              'top',
          },
        },

        scales: {
          x: {
            grid: {
              display:
                false,
            },
          },

          y: {
            min:
              0,

            max:
              100,

            title: {
              display:
                true,

              text:
                'Decision performance index',
            },

            grid: {
              color:
                'rgba(70, 90, 78, 0.08)',
            },
          },
        },
      },
    };


    this.strategyProfileChart =
      new Chart(
        canvas,
        config,
      );
  }


  private renderTradeoff(): void {

    const canvas =
      this.tradeoffCanvas
        ?.nativeElement;

    const a =
      this.comparisonAComplete();

    const b =
      this.comparisonBComplete();


    if (
      !canvas
      || !a
      || !b
    ) {
      return;
    }


    const config:
      ChartConfiguration<
        'scatter',
        {
          x: number;
          y: number;
        }[],
        unknown
      > = {

      type:
        'scatter',

      data: {
        datasets: [
          {
            label:
              'Plan A',

            data: [
              {
                x:
                  a.yield
                    .expected_yield_t_ha,

                y:
                  a.sustainability
                    .sustainability_score
                  * 100,
              },
            ],

            backgroundColor:
              '#3b82f6',

            borderColor:
              '#ffffff',

            borderWidth:
              2,

            pointRadius:
              10,

            pointHoverRadius:
              12,
          },

          {
            label:
              'Plan B',

            data: [
              {
                x:
                  b.yield
                    .expected_yield_t_ha,

                y:
                  b.sustainability
                    .sustainability_score
                  * 100,
              },
            ],

            backgroundColor:
              '#f97316',

            borderColor:
              '#ffffff',

            borderWidth:
              2,

            pointRadius:
              10,

            pointHoverRadius:
              12,
          },
        ],
      },

      options: {
        responsive:
          true,

        maintainAspectRatio:
          false,

        plugins: {
          legend: {
            position:
              'top',
          },

          tooltip: {
            callbacks: {
              label:
                context => {

                  const detail =
                    context.datasetIndex
                      === 0
                      ? a
                      : b;


                  return (
                    `${this.planName(
                      detail,
                    )}: `
                    + `${detail.yield.expected_yield_t_ha.toFixed(2)} t/ha, `
                    + `${Math.round(
                      detail.sustainability
                        .sustainability_score
                      * 100,
                    )}/100`
                  );
                },
            },
          },
        },

        scales: {
          x: {
            title: {
              display:
                true,

              text:
                'Expected yield (t/ha)',
            },

            grid: {
              color:
                'rgba(70, 90, 78, 0.08)',
            },
          },

          y: {
            min:
              0,

            max:
              100,

            title: {
              display:
                true,

              text:
                'Sustainability score',
            },

            grid: {
              color:
                'rgba(70, 90, 78, 0.08)',
            },
          },
        },
      },
    };


    this.tradeoffChart =
      new Chart(
        canvas,
        config,
      );
  }


  private carbonPerformance(
    value: number,
    otherValue: number,
  ): number {

    if (
      value === 0
      && otherValue === 0
    ) {
      return 100;
    }


    if (
      value === 0
    ) {
      return 100;
    }


    const minimum =
      Math.min(
        value,
        otherValue,
      );


    if (
      minimum === 0
    ) {
      return 0;
    }


    return (
      minimum
      / value
      * 100
    );
  }


  private cropColor(
    crop: string,
  ): string {

    const colors:
      Record<string, string> = {

      wheat:
        '#f59e0b',

      barley:
        '#8b5cf6',

      maize:
        '#22a35a',
    };


    return (
      colors[crop]
      ?? '#3b82f6'
    );
  }


  private destroyCharts(): void {

    this.yieldScatterChart
      ?.destroy();

    this.cropPerformanceChart
      ?.destroy();

    this.strategyProfileChart
      ?.destroy();

    this.tradeoffChart
      ?.destroy();


    this.yieldScatterChart =
      null;

    this.cropPerformanceChart =
      null;

    this.strategyProfileChart =
      null;

    this.tradeoffChart =
      null;
  }
}