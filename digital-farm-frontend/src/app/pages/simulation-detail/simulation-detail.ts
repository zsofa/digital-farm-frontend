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
} from '@angular/router';

import {
  SimulationDetails,
  SimulationScenario,
  SimulationStatus,
} from '../../models/simulation.model';

import {
  SimulationService,
} from '../../services/simulation.service';


@Component({
  selector: 'app-simulation-detail',

  templateUrl:
    './simulation-detail.html',

  styleUrl:
    './simulation-detail.css',

  imports: [
    DatePipe,
  ],
})
export class SimulationDetail
  implements OnInit {

  readonly simulation =
    signal<SimulationDetails | null>(
      null
    );

  readonly loading =
    signal(true);

  readonly errorMessage =
    signal<string | null>(
      null
    );


  constructor(
    private readonly route:
      ActivatedRoute,

    private readonly router:
      Router,

    private readonly simulationService:
      SimulationService,
  ) {}


  ngOnInit(): void {

    const simulationId = Number(
      this.route.snapshot
        .paramMap
        .get('simulationId')
    );

    if (!simulationId) {

      this.errorMessage.set(
        'Invalid simulation.'
      );

      this.loading.set(
        false
      );

      return;
    }

    this.loadSimulation(
      simulationId
    );
  }


  goBack(): void {

    const simulation =
      this.simulation();

    if (!simulation) {

      this.router.navigate([
        '/dashboard',
      ]);

      return;
    }

    this.router.navigate([
      '/parcel-seasons',
      simulation.parcel_season_id,
    ]);
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


  formatStatus(
    status: SimulationStatus,
  ): string {

    if (status === 'outdated') {
      return 'Outdated';
    }

    return 'Current';
  }


  getScenario(
    key:
      | 'dry_hot'
      | 'expected'
      | 'wet_cool',
  ): SimulationScenario | null {

    return (
      this.simulation()
        ?.scenarios[key]
      ?? null
    );
  }


  private loadSimulation(
    simulationId: number,
  ): void {

    this.simulationService
      .getSimulation(
        simulationId
      )
      .subscribe({

        next: simulation => {

          this.simulation.set(
            simulation
          );

          this.loading.set(
            false
          );
        },


        error: () => {

          this.errorMessage.set(
            'Unable to load simulation results.'
          );

          this.loading.set(
            false
          );
        },
      });
  }
}