import {
  Injectable,
  signal,
} from '@angular/core';

import {
  Farm,
  FarmDetails,
} from '../models/farm.model';

import {
  FarmService,
} from './farm.service';

@Injectable({
  providedIn: 'root',
})
export class FarmContextService {
  private readonly storageKey =
    'digital_farm_selected_farm';

  readonly farms =
    signal<Farm[]>([]);

  readonly selectedFarm =
    signal<FarmDetails | null>(null);

  readonly loading =
    signal(false);

  readonly errorMessage =
    signal<string | null>(null);

  constructor(
    private readonly farmService:
      FarmService,
  ) {}

  loadFarms(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.farmService
      .getFarms()
      .subscribe({
        next: farms => {
          this.farms.set(farms);

          if (
            farms.length === 0
          ) {
            this.selectedFarm.set(null);

            localStorage.removeItem(
              this.storageKey
            );

            this.loading.set(false);
            return;
          }

          const storedFarmId =
            this.getStoredFarmId();

          const selectedFarmId =
            farms.some(
              farm =>
                farm.id === storedFarmId
            )
              ? storedFarmId!
              : farms[0].id;

          this.selectFarm(
            selectedFarmId
          );
        },

        error: () => {
          this.errorMessage.set(
            'Unable to load farms.'
          );

          this.loading.set(false);
        },
      });
  }

  selectFarm(
    farmId: number,
  ): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.farmService
      .getFarm(farmId)
      .subscribe({
        next: farm => {
          this.selectedFarm.set(
            farm
          );

          localStorage.setItem(
            this.storageKey,
            farm.id.toString()
          );

          this.loading.set(false);
        },

        error: () => {
          this.errorMessage.set(
            'Unable to load the selected farm.'
          );

          this.loading.set(false);
        },
      });
  }

  refreshSelectedFarm(): void {
    const farm =
      this.selectedFarm();

    if (!farm) {
      return;
    }

    this.selectFarm(
      farm.id
    );
  }

  selectAndReloadFarms(
    farmId: number,
  ): void {
    this.loading.set(true);

    this.farmService
      .getFarms()
      .subscribe({
        next: farms => {
          this.farms.set(farms);

          const exists =
            farms.some(
              farm =>
                farm.id === farmId
            );

          if (exists) {
            this.selectFarm(
              farmId
            );
          } else {
            this.loadFarms();
          }
        },

        error: () => {
          this.errorMessage.set(
            'Unable to reload farms.'
          );

          this.loading.set(false);
        },
      });
  }

  clear(): void {
    this.farms.set([]);
    this.selectedFarm.set(null);
    this.errorMessage.set(null);
    this.loading.set(false);

    localStorage.removeItem(
      this.storageKey
    );
  }

  private getStoredFarmId():
    number | null {

    const value =
      localStorage.getItem(
        this.storageKey
      );

    if (!value) {
      return null;
    }

    const farmId =
      Number(value);

    return Number.isNaN(
      farmId
    )
      ? null
      : farmId;
  }
}