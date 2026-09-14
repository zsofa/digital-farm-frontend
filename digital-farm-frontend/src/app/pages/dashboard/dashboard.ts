import {
  Component,
  computed,
  effect,
  signal,
} from '@angular/core';

import {
  FarmMap,
} from '../../components/farm-map/farm-map';

import {
  ParcelSummary,
} from '../../models/parcel.model';

import {
  FarmContextService,
} from '../../services/farm-context.service';

import {
  RouterLink,
} from '@angular/router';


@Component({
  selector: 'app-dashboard',

  imports: [
    FarmMap,
    RouterLink,
  ],

  templateUrl:
    './dashboard.html',

  styleUrl:
    './dashboard.css',
})
export class Dashboard {

  readonly farm;

  readonly loading;

  readonly errorMessage;


  readonly selectedParcel =
    signal<ParcelSummary | null>(
      null
    );


  readonly activeParcels =
    computed(() => {

      const farm =
        this.farm();

      if (!farm) {
        return [];
      }

      return farm.parcels.filter(
        parcel =>
          parcel.is_active
      );
    });


  readonly activeParcelCount =
    computed(
      () =>
        this.activeParcels().length
    );


  readonly activeTotalArea =
    computed(() => {

      const total =
        this.activeParcels()
          .reduce(
            (
              sum,
              parcel,
            ) =>
              sum +
              parcel.official_area_ha,
            0
          );

      return Math.round(
        total * 1000
      ) / 1000;
    });


  constructor(
    private readonly farmContext:
      FarmContextService,
  ) {

    this.farm =
      this.farmContext.selectedFarm;

    this.loading =
      this.farmContext.loading;

    this.errorMessage =
      this.farmContext.errorMessage;


    effect(() => {

      this.farm();

      this.selectedParcel.set(
        null
      );
    });
  }


  selectParcel(
    parcel: ParcelSummary,
  ): void {

    this.selectedParcel.set(
      parcel
    );
  }


  clearSelectedParcel(): void {

    this.selectedParcel.set(
      null
    );
  }
}