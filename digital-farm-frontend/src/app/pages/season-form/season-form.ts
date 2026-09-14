import {
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  ActivatedRoute,
  Router,
} from '@angular/router';

import {
  takeUntilDestroyed,
} from '@angular/core/rxjs-interop';

import {
  ParcelDetails,
  ParcelSeasonDetails,
} from '../../models/parcel.model';

import {
  ParcelService,
} from '../../services/parcel.service';

import {
  NextSeasonTarget,
  SeasonCreateRequest,
  SeasonCrop,
  SeasonService,
  SeasonUpdateRequest,
} from '../../services/season.service';


@Component({
  selector: 'app-season-form',

  imports: [
    ReactiveFormsModule,
  ],

  templateUrl:
    './season-form.html',

  styleUrl:
    './season-form.css',
})
export class SeasonForm
  implements OnInit {

  private readonly destroyRef =
    inject(DestroyRef);


  readonly parcel =
    signal<ParcelDetails | null>(
      null
    );

  readonly season =
    signal<ParcelSeasonDetails | null>(
      null
    );

  readonly isEditMode =
    signal(false);

  readonly loading =
    signal(true);

  readonly saving =
    signal(false);

  readonly targetSeasonLoading =
    signal(false);

  readonly targetSeason =
    signal<NextSeasonTarget | null>(
      null
    );

  readonly errorMessage =
    signal<string | null>(
      null
    );


  readonly form;


  constructor(
    private readonly fb:
      FormBuilder,

    private readonly route:
      ActivatedRoute,

    private readonly router:
      Router,

    private readonly parcelService:
      ParcelService,

    private readonly seasonService:
      SeasonService,
  ) {

    this.form =
      this.fb.nonNullable.group({

        crop: [
          'maize' as SeasonCrop,
          Validators.required,
        ],

        farming_strategy: [
          'conventional' as
            | 'conventional'
            | 'reduced',

          Validators.required,
        ],

        is_irrigated: [
          false,
        ],

        machine_use: [
          '' as
            | ''
            | 'low'
            | 'medium'
            | 'high',
        ],

        fertilizer_type: [
          '' as
            | ''
            | 'AN'
            | 'urea'
            | 'CAN',
        ],

        fertilizer_quantity_kg_ha: [
          null as number | null,
          [
            Validators.min(0),
          ],
        ],
      });
  }


  ngOnInit(): void {

    const seasonId =
      Number(
        this.route.snapshot
          .paramMap
          .get('seasonId')
      );

    const parcelId =
      Number(
        this.route.snapshot
          .paramMap
          .get('parcelId')
      );


    if (seasonId) {

      this.isEditMode.set(
        true
      );

      this.loadSeason(
        seasonId
      );

      return;
    }


    this.form.controls.crop
      .valueChanges
      .pipe(
        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe(crop => {

        this.loadTargetSeason(
          crop
        );
      });


    this.loadTargetSeason(
      this.form.controls.crop.value
    );


    if (parcelId) {

      this.loadParcel(
        parcelId
      );

      return;
    }


    this.errorMessage.set(
      'Invalid growing season route.'
    );

    this.loading.set(false);
  }


  save(): void {

    if (
      this.saving() ||
      this.loading()
    ) {
      return;
    }


    if (this.form.invalid) {

      this.form.markAllAsTouched();

      this.errorMessage.set(
        'Complete the required growing season information.'
      );

      return;
    }


    const parcel =
      this.parcel();


    if (!parcel) {

      this.errorMessage.set(
        'Parcel is not available.'
      );

      return;
    }


    if (!parcel.is_active) {

      this.errorMessage.set(
        'Inactive parcels cannot be modified.'
      );

      return;
    }


    const values =
      this.form.getRawValue();


    const fertilizerType =
      values.fertilizer_type ||
      null;


    let fertilizerQuantity =
      values
        .fertilizer_quantity_kg_ha;


    if (!fertilizerType) {

      fertilizerQuantity =
        null;
    }


    if (
      fertilizerType &&
      fertilizerQuantity === null
    ) {

      this.errorMessage.set(
        'Enter fertilizer quantity when a fertilizer type is selected.'
      );

      return;
    }


    if (this.isEditMode()) {

      const season =
        this.season();


      if (!season) {

        this.errorMessage.set(
          'Growing season is not available.'
        );

        return;
      }


      const payload:
        SeasonUpdateRequest = {

        farming_strategy:
          values.farming_strategy,

        is_irrigated:
          values.is_irrigated,

        machine_use:
          values.machine_use ||
          null,

        fertilizer_type:
          fertilizerType,

        fertilizer_quantity_kg_ha:
          fertilizerQuantity,
      };


      this.updateSeason(
        season.id,
        payload
      );

      return;
    }


    if (!this.targetSeason()) {

      this.errorMessage.set(
        'Target growing season is not available.'
      );

      return;
    }


    const payload:
      SeasonCreateRequest = {

      crop:
        values.crop,

      farming_strategy:
        values.farming_strategy,

      is_irrigated:
        values.is_irrigated,

      machine_use:
        values.machine_use ||
        null,

      fertilizer_type:
        fertilizerType,

      fertilizer_quantity_kg_ha:
        fertilizerQuantity,
    };


    this.createSeason(
      parcel.id,
      payload
    );
  }


  cancel(): void {

    const season =
      this.season();


    if (season) {

      this.router.navigate([
        '/parcel-seasons',
        season.id,
      ]);

      return;
    }


    const parcel =
      this.parcel();


    if (parcel) {

      this.router.navigate([
        '/parcels',
        parcel.id,
      ]);

      return;
    }


    this.router.navigate([
      '/dashboard',
    ]);
  }


  formatDate(
    value: string,
  ): string {

    return new Intl.DateTimeFormat(
      'en-GB',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }
    ).format(
      new Date(
        `${value}T00:00:00`
      )
    );
  }


  private loadTargetSeason(
    crop: SeasonCrop,
  ): void {

    if (this.isEditMode()) {
      return;
    }


    this.targetSeasonLoading.set(
      true
    );

    this.targetSeason.set(
      null
    );


    this.seasonService
      .getNextSeasonTarget(
        crop
      )
      .subscribe({

        next: result => {

          this.targetSeason.set(
            result
          );

          this.targetSeasonLoading.set(
            false
          );
        },


        error: error => {

          this.targetSeasonLoading.set(
            false
          );

          this.errorMessage.set(
            error.error?.error ??
              'Unable to determine the next growing season.'
          );
        },
      });
  }


  private loadParcel(
    parcelId: number,
  ): void {

    this.parcelService
      .getParcel(
        parcelId
      )
      .subscribe({

        next: parcel => {

          this.parcel.set(
            parcel
          );

          this.loading.set(
            false
          );
        },


        error: error => {

          this.errorMessage.set(
            error.error?.error ??
              'Unable to load parcel.'
          );

          this.loading.set(
            false
          );
        },
      });
  }


  private loadSeason(
    seasonId: number,
  ): void {

    this.seasonService
      .getSeason(
        seasonId
      )
      .subscribe({

        next: season => {

          this.season.set(
            season
          );


          this.form.patchValue({

            crop:
              season.crop,

            farming_strategy:
              season.farming_strategy,

            is_irrigated:
              season.is_irrigated,

            machine_use:
              season.machine_use ?? '',

            fertilizer_type:
              season.fertilizer_type ?? '',

            fertilizer_quantity_kg_ha:
              season
                .fertilizer_quantity_kg_ha,
          });


          this.form.controls
            .crop
            .disable();


          this.loadParcelForSeason(
            season.parcel_id
          );
        },


        error: error => {

          this.errorMessage.set(
            error.error?.error ??
              'Unable to load growing season.'
          );

          this.loading.set(
            false
          );
        },
      });
  }


  private loadParcelForSeason(
    parcelId: number,
  ): void {

    this.parcelService
      .getParcel(
        parcelId
      )
      .subscribe({

        next: parcel => {

          this.parcel.set(
            parcel
          );

          this.loading.set(
            false
          );
        },


        error: error => {

          this.errorMessage.set(
            error.error?.error ??
              'Unable to load parcel.'
          );

          this.loading.set(
            false
          );
        },
      });
  }


  private createSeason(
    parcelId: number,
    payload: SeasonCreateRequest,
  ): void {

    this.saving.set(true);

    this.errorMessage.set(null);


    this.seasonService
      .createSeason(
        parcelId,
        payload
      )
      .subscribe({

        next: season => {

          this.saving.set(false);

          this.router.navigate([
            '/parcel-seasons',
            season.id,
          ]);
        },


        error: error => {

          this.saving.set(false);

          this.errorMessage.set(
            error.error?.error ??
              'Unable to create growing season.'
          );
        },
      });
  }


  private updateSeason(
    seasonId: number,
    payload: SeasonUpdateRequest,
  ): void {

    this.saving.set(true);

    this.errorMessage.set(null);


    this.seasonService
      .updateSeason(
        seasonId,
        payload
      )
      .subscribe({

        next: season => {

          this.saving.set(false);

          this.router.navigate([
            '/parcel-seasons',
            season.id,
          ]);
        },


        error: error => {

          this.saving.set(false);

          this.errorMessage.set(
            error.error?.error ??
              'Unable to update growing season.'
          );
        },
      });
  }
}