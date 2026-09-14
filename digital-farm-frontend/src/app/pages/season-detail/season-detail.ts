import {
  DatePipe,
} from '@angular/common';

import {
  Component,
  OnInit,
  signal,
} from '@angular/core';

import {
  ActivatedRoute,
  Router,
  RouterLink,
} from '@angular/router';

import {
  ParcelSeasonDetails,
} from '../../models/parcel.model';

import {
  ParcelSeasonService,
} from '../../services/parcel-season.service';

import {
  SimulationService,
} from '../../services/simulation.service';


@Component({
  selector: 'app-season-detail',

  templateUrl:
    './season-detail.html',

  styleUrl:
    './season-detail.css',

  imports: [
    RouterLink,
    DatePipe,
  ],
})
export class SeasonDetail
  implements OnInit {

  readonly season =
    signal<ParcelSeasonDetails | null>(
      null
    );

  readonly loading =
    signal(true);

  readonly runningSimulation =
    signal(false);

  readonly errorMessage =
    signal<string | null>(
      null
    );

  private seasonId = 0;


  constructor(
    private readonly route:
      ActivatedRoute,

    private readonly router:
      Router,

    private readonly parcelSeasonService:
      ParcelSeasonService,

    private readonly simulationService:
      SimulationService,
  ) {}


  ngOnInit(): void {

    this.seasonId = Number(
      this.route.snapshot
        .paramMap
        .get('seasonId')
    );

    if (!this.seasonId) {

      this.errorMessage.set(
        'Invalid growing season.'
      );

      this.loading.set(false);

      return;
    }

    this.loadSeason();
  }


  goBack(): void {

    const currentSeason =
      this.season();

    if (!currentSeason) {

      this.router.navigate([
        '/dashboard',
      ]);

      return;
    }

    this.router.navigate([
      '/parcels',
      currentSeason.parcel_id,
    ]);
  }


  openSimulation(
    simulationId: number,
  ): void {

    this.router.navigate([
      '/simulations',
      simulationId,
    ]);
  }


  runSimulation(): void {

    if (!this.seasonId) {
      return;
    }

    this.runningSimulation.set(
      true
    );

    this.errorMessage.set(
      null
    );

    this.simulationService
      .runSimulation(
        this.seasonId
      )
      .subscribe({

        next: response => {

          this.runningSimulation.set(
            false
          );

          this.router.navigate([
            '/simulations',
            response.simulation_id,
          ]);
        },


        error: error => {

          this.runningSimulation.set(
            false
          );

          this.errorMessage.set(
            error.error?.error ??
              'Unable to run yield simulation.'
          );
        },
      });
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
      labels[strategy] ??
      strategy
    );
  }


  formatMachineUse(
    value: string | null,
  ): string {

    if (!value) {
      return 'Not specified';
    }

    return (
      value.charAt(0).toUpperCase() +
      value.slice(1)
    );
  }


  private loadSeason(): void {

    this.loading.set(true);

    this.errorMessage.set(
      null
    );

    this.parcelSeasonService
      .getSeason(
        this.seasonId
      )
      .subscribe({

        next: season => {

          this.season.set(
            season
          );

          this.loading.set(
            false
          );
        },


        error: () => {

          this.errorMessage.set(
            'Unable to load growing season.'
          );

          this.loading.set(
            false
          );
        },
      });
  }
}