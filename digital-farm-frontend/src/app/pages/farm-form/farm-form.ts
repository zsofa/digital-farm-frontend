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
} from '@angular/router';

import {
  FarmRequest,
} from '../../models/farm.model';
import {
  FarmContextService,
} from '../../services/farm-context.service';
import {
  FarmService,
} from '../../services/farm.service';

@Component({
  selector: 'app-farm-form',
  imports: [
    ReactiveFormsModule,
  ],
  templateUrl: './farm-form.html',
  styleUrl: './farm-form.css',
})
export class FarmForm implements OnInit {
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);

  readonly errorMessage =
    signal<string | null>(null);

  readonly editMode = signal(false);

  private farmId: number | null = null;

  readonly counties = [
    'Bács-Kiskun',
    'Baranya',
    'Békés',
    'Borsod-Abaúj-Zemplén',
    'Csongrád-Csanád',
    'Fejér',
    'Győr-Moson-Sopron',
    'Hajdú-Bihar',
    'Heves',
    'Jász-Nagykun-Szolnok',
    'Komárom-Esztergom',
    'Nógrád',
    'Pest',
    'Somogy',
    'Szabolcs-Szatmár-Bereg',
    'Tolna',
    'Vas',
    'Veszprém',
    'Zala',
  ];

  readonly form;

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly farmService: FarmService,
    private readonly farmContext: FarmContextService,
  ) {
    this.form = this.fb.nonNullable.group({
      name: [
        '',
        [
          Validators.required,
          Validators.maxLength(120),
        ],
      ],

      county_name: [
        '',
        Validators.required,
      ],

      activity_type: [
        'crop_production' as
          FarmRequest['activity_type'],
        Validators.required,
      ],

      legal_form: [
        '' as
          | ''
          | 'individual'
          | 'family_farm'
          | 'company'
          | 'other',
      ],

      description: [
        '',
      ],
    });
  }

  ngOnInit(): void {
    const farmId = Number(
      this.route.snapshot.paramMap.get(
        'farmId'
      )
    );

    if (farmId) {
      this.editMode.set(true);
      this.farmId = farmId;

      this.loadFarm(farmId);
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const values =
      this.form.getRawValue();

    const payload: FarmRequest = {
      name: values.name.trim(),

      county_name:
        values.county_name,

      activity_type:
        values.activity_type,

      legal_form:
        values.legal_form || null,

      description:
        values.description.trim() || null,
    };

    this.saving.set(true);
    this.errorMessage.set(null);

    if (
      this.editMode() &&
      this.farmId
    ) {
      this.updateFarm(
        this.farmId,
        payload
      );

      return;
    }

    this.createFarm(payload);
  }

  cancel(): void {
    this.router.navigate([
      '/dashboard',
    ]);
  }

  deleteFarm(): void {
    if (!this.farmId) {
      return;
    }

    const confirmed =
      window.confirm(
        'Are you sure you want to delete this farm? This action cannot be undone.'
      );

    if (!confirmed) {
      return;
    }

    this.deleting.set(true);
    this.errorMessage.set(null);

    this.farmService
      .deleteFarm(this.farmId)
      .subscribe({
        next: () => {
          this.deleting.set(false);

          this.farmContext.loadFarms();

          this.router.navigate([
            '/dashboard',
          ]);
        },

        error: error => {
          this.deleting.set(false);

          this.errorMessage.set(
            error.error?.error ??
              'Unable to delete farm.'
          );
        },
      });
  }

  private loadFarm(
    farmId: number,
  ): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.farmService
      .getFarm(farmId)
      .subscribe({
        next: farm => {
          this.form.patchValue({
            name:
              farm.name,

            county_name:
              farm.county_name,

            activity_type:
              farm.activity_type,

            legal_form:
              farm.legal_form ?? '',

            description:
              farm.description ?? '',
          });

          this.loading.set(false);
        },

        error: () => {
          this.errorMessage.set(
            'Unable to load farm.'
          );

          this.loading.set(false);
        },
      });
  }

  private createFarm(
    payload: FarmRequest,
  ): void {
    this.farmService
      .createFarm(payload)
      .subscribe({
        next: farm => {
          this.saving.set(false);

          this.farmContext
            .selectAndReloadFarms(
              farm.id
            );

          this.router.navigate([
            '/dashboard',
          ]);
        },

        error: error => {
          this.saving.set(false);

          this.errorMessage.set(
            error.error?.error ??
              'Unable to create farm.'
          );
        },
      });
  }

  private updateFarm(
    farmId: number,
    payload: FarmRequest,
  ): void {
    this.farmService
      .updateFarm(
        farmId,
        payload
      )
      .subscribe({
        next: () => {
          this.saving.set(false);

          this.farmContext
            .selectAndReloadFarms(
              farmId
            );

          this.router.navigate([
            '/dashboard',
          ]);
        },

        error: error => {
          this.saving.set(false);

          this.errorMessage.set(
            error.error?.error ??
              'Unable to update farm.'
          );
        },
      });
  }
}