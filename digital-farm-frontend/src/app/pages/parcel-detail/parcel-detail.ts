import {
  Component,
  OnInit,
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
  RouterLink,
} from '@angular/router';

import {
  ParcelDetails,
  ParcelSoilRequest,
} from '../../models/parcel.model';

import {
  FarmContextService,
} from '../../services/farm-context.service';

import {
  ParcelService,
} from '../../services/parcel.service';


@Component({
  selector: 'app-parcel-detail',

  templateUrl:
    './parcel-detail.html',

  styleUrl:
    './parcel-detail.css',

  imports: [
    RouterLink,
    ReactiveFormsModule,
  ],
})
export class ParcelDetail
  implements OnInit {

  readonly parcel =
    signal<ParcelDetails | null>(
      null
    );

  readonly loading =
    signal(true);

  readonly deleting =
    signal(false);

  readonly changingStatus =
    signal(false);

  readonly editingSoil =
    signal(false);

  readonly savingSoil =
    signal(false);

  readonly deletingSoil =
    signal(false);

  readonly errorMessage =
    signal<string | null>(
      null
    );


  readonly soilForm;


  constructor(
    private readonly route:
      ActivatedRoute,

    private readonly router:
      Router,

    private readonly fb:
      FormBuilder,

    private readonly parcelService:
      ParcelService,

    private readonly farmContext:
      FarmContextService,
  ) {

    this.soilForm =
      this.fb.nonNullable.group({

        soil_ph: [
          7,
          [
            Validators.required,
            Validators.min(0),
            Validators.max(14),
          ],
        ],

        soil_soc_g_kg: [
          0,
          [
            Validators.required,
            Validators.min(0),
          ],
        ],

        soil_clay_pct: [
          0,
          [
            Validators.required,
            Validators.min(0),
            Validators.max(100),
          ],
        ],

        measured_at: [
          '',
        ],
      });
  }


  ngOnInit(): void {

    const parcelId =
      Number(
        this.route.snapshot
          .paramMap
          .get('parcelId')
      );


    if (!parcelId) {

      this.errorMessage.set(
        'Invalid parcel.'
      );

      this.loading.set(false);

      return;
    }


    this.loadParcel(
      parcelId
    );
  }


  goBack(): void {

    this.router.navigate([
      '/dashboard',
    ]);
  }


  startSoilEdit(): void {

    const parcel =
      this.parcel();

    if (
      !parcel ||
      !parcel.is_active
    ) {
      return;
    }


    if (
      parcel.soil?.source ===
      'user'
    ) {

      this.soilForm.patchValue({

        soil_ph:
          parcel.soil.soil_ph,

        soil_soc_g_kg:
          parcel.soil
            .soil_soc_g_kg,

        soil_clay_pct:
          parcel.soil
            .soil_clay_pct,

        measured_at:
          parcel.soil
            .measured_at ?? '',
      });

    } else {

      this.soilForm.reset({
        soil_ph:
          parcel.soil
            ?.soil_ph ?? 7,

        soil_soc_g_kg:
          parcel.soil
            ?.soil_soc_g_kg ?? 0,

        soil_clay_pct:
          parcel.soil
            ?.soil_clay_pct ?? 0,

        measured_at: '',
      });
    }


    this.errorMessage.set(
      null
    );

    this.editingSoil.set(
      true
    );
  }


  cancelSoilEdit(): void {

    this.editingSoil.set(
      false
    );

    this.soilForm.reset();
  }


  saveSoil(): void {

    const parcel =
      this.parcel();


    if (
      !parcel ||
      !parcel.is_active ||
      this.savingSoil()
    ) {
      return;
    }


    if (this.soilForm.invalid) {

      this.soilForm
        .markAllAsTouched();

      this.errorMessage.set(
        'Enter valid soil values.'
      );

      return;
    }


    const values =
      this.soilForm
        .getRawValue();


    const payload:
      ParcelSoilRequest = {

      soil_ph:
        values.soil_ph,

      soil_soc_g_kg:
        values.soil_soc_g_kg,

      soil_clay_pct:
        values.soil_clay_pct,

      measured_at:
        values.measured_at ||
        null,
    };


    this.savingSoil.set(
      true
    );

    this.errorMessage.set(
      null
    );


    this.parcelService
      .saveSoil(
        parcel.id,
        payload
      )
      .subscribe({

        next: () => {

          this.savingSoil.set(
            false
          );

          this.editingSoil.set(
            false
          );

          this.loadParcel(
            parcel.id
          );
        },


        error: error => {

          this.savingSoil.set(
            false
          );

          this.errorMessage.set(
            error.error?.error ??
              'Unable to save soil measurement.'
          );
        },
      });
  }


  removeUserSoil(): void {

    const parcel =
      this.parcel();


    if (
      !parcel ||
      !parcel.is_active ||
      parcel.soil?.source !==
        'user' ||
      this.deletingSoil()
    ) {
      return;
    }


    const confirmed =
      window.confirm(
        'Remove the user soil measurement? The parcel will return to the SoilGrids estimate.'
      );


    if (!confirmed) {
      return;
    }


    this.deletingSoil.set(
      true
    );

    this.errorMessage.set(
      null
    );


    this.parcelService
      .deleteUserSoil(
        parcel.id
      )
      .subscribe({

        next: () => {

          this.deletingSoil.set(
            false
          );

          this.editingSoil.set(
            false
          );

          this.loadParcel(
            parcel.id
          );
        },


        error: error => {

          this.deletingSoil.set(
            false
          );

          this.errorMessage.set(
            error.error?.error ??
              'Unable to remove soil measurement.'
          );
        },
      });
  }


  toggleActiveStatus(): void {

    const parcel =
      this.parcel();


    if (
      !parcel ||
      this.changingStatus()
    ) {
      return;
    }


    const nextStatus =
      !parcel.is_active;


    if (!nextStatus) {

      const confirmed =
        window.confirm(
          `Set "${parcel.name}" inactive? Historical seasons and simulations will remain available.`
        );


      if (!confirmed) {
        return;
      }
    }


    this.changingStatus.set(
      true
    );

    this.errorMessage.set(
      null
    );


    this.parcelService
      .setParcelActive(
        parcel.id,
        nextStatus
      )
      .subscribe({

        next: updated => {

          this.parcel.set(
            updated
          );


          this.farmContext
            .selectAndReloadFarms(
              updated.farm_id
            );


          this.changingStatus.set(
            false
          );
        },


        error: error => {

          this.changingStatus.set(
            false
          );


          this.errorMessage.set(
            error.error?.error ??
              'Unable to update parcel status.'
          );
        },
      });
  }


  deleteParcel(): void {

    const parcel =
      this.parcel();


    if (
      !parcel ||
      this.deleting()
    ) {
      return;
    }


    const confirmed =
      window.confirm(
        `Permanently delete "${parcel.name}"? This action cannot be undone.`
      );


    if (!confirmed) {
      return;
    }


    this.deleting.set(
      true
    );

    this.errorMessage.set(
      null
    );


    this.parcelService
      .deleteParcel(
        parcel.id
      )
      .subscribe({

        next: () => {

          this.farmContext
            .selectAndReloadFarms(
              parcel.farm_id
            );


          this.router.navigate([
            '/dashboard',
          ]);
        },


        error: error => {

          this.deleting.set(
            false
          );


          this.errorMessage.set(
            error.error?.error ??
              'Unable to delete parcel.'
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

    return labels[strategy] ?? strategy;
  }


  formatSoilSource(
    source: string,
  ): string {

    if (source === 'user') {
      return 'User measurement';
    }

    if (source === 'soilgrids') {
      return 'SoilGrids';
    }

    return source;
  }


  formatMachineUse(
    machineUse:
      string | null,
  ): string {

    if (!machineUse) {
      return 'Not specified';
    }

    const labels:
      Record<string, string> = {

      low: 'Low',
      medium: 'Medium',
      high: 'High',
    };

    return (
      labels[machineUse] ??
      machineUse
    );
  }


  private loadParcel(
    parcelId: number,
  ): void {

    this.loading.set(true);


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
              'Unable to load parcel details.'
          );

          this.loading.set(
            false
          );
        },
      });
  }
}