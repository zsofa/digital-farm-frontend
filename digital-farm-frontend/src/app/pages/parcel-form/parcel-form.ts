import {
  Component,
  computed,
  OnInit,
  signal,
  ViewChild,
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
  area,
} from '@turf/area';

import type {
  Polygon,
} from 'geojson';

import {
  ParcelDrawMap,
} from '../../components/parcel-draw-map/parcel-draw-map';

import {
  ParcelCreateRequest,
  ParcelDetails,
  ParcelUpdateRequest,
  PolygonGeometry,
} from '../../models/parcel.model';

import {
  FarmContextService,
} from '../../services/farm-context.service';

import {
  ParcelService,
} from '../../services/parcel.service';


type AreaDifferenceLevel =
  | 'ok'
  | 'warning'
  | 'strong'
  | null;


@Component({
  selector: 'app-parcel-form',

  imports: [
    ReactiveFormsModule,
    ParcelDrawMap,
  ],

  templateUrl:
    './parcel-form.html',

  styleUrl:
    './parcel-form.css',
})
export class ParcelForm
  implements OnInit {

  @ViewChild(ParcelDrawMap)
  private drawMap?:
    ParcelDrawMap;


  readonly farm;

  readonly editingParcel =
    signal<ParcelDetails | null>(
      null
    );

  readonly geometry =
    signal<PolygonGeometry | null>(
      null
    );

  readonly isEditMode =
    signal(false);

  readonly loading =
    signal(false);

  readonly saving =
    signal(false);

  readonly errorMessage =
    signal<string | null>(
      null
    );


  readonly officialAreaHa =
    signal(0);

  readonly mappedAreaHa =
    signal<number | null>(
      null
    );


  readonly signedAreaDifferencePercent =
    computed(() => {

      const officialArea =
        this.officialAreaHa();

      const mappedArea =
        this.mappedAreaHa();


      if (
        officialArea <= 0 ||
        mappedArea === null
      ) {
        return null;
      }


      return (
        (
          mappedArea -
          officialArea
        ) /
        officialArea
      ) * 100;
    });


  readonly absoluteAreaDifferencePercent =
    computed(() => {

      const difference =
        this.signedAreaDifferencePercent();


      if (difference === null) {
        return null;
      }


      return Math.abs(
        difference
      );
    });


  readonly areaDifferenceLevel =
    computed<AreaDifferenceLevel>(
      () => {

        const difference =
          this.absoluteAreaDifferencePercent();


        if (difference === null) {
          return null;
        }


        if (difference <= 10) {
          return 'ok';
        }


        if (difference < 20) {
          return 'warning';
        }


        return 'strong';
      }
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

    private readonly farmContext:
      FarmContextService,
  ) {

    this.farm =
      this.farmContext.selectedFarm;


    this.form =
      this.fb.nonNullable.group({

        name: [
          '',
          [
            Validators.required,
            Validators.maxLength(120),
          ],
        ],

        official_area_ha: [
          0,
          [
            Validators.required,
            Validators.min(0.01),
          ],
        ],
      });


    this.form.controls
      .official_area_ha
      .valueChanges
      .subscribe(
        value => {

          this.officialAreaHa.set(
            value
          );
        }
      );
  }


  ngOnInit(): void {

    const parcelId =
      Number(
        this.route.snapshot
          .paramMap
          .get('parcelId')
      );


    if (parcelId) {

      this.isEditMode.set(
        true
      );

      this.loadParcel(
        parcelId
      );
    }
  }


  onGeometryChange(
    geometry:
      PolygonGeometry | null,
  ): void {

    this.geometry.set(
      geometry
    );


    if (!geometry) {

      this.mappedAreaHa.set(
        null
      );

      return;
    }


    const mappedAreaSquareMeters =
      area(
        geometry as Polygon
      );


    const mappedAreaHectares =
      mappedAreaSquareMeters /
      10_000;


    this.mappedAreaHa.set(
      mappedAreaHectares
    );


    this.errorMessage.set(
      null
    );
  }


  formatMappedArea(): string {

    const value =
      this.mappedAreaHa();


    if (value === null) {
      return '—';
    }


    return value.toFixed(2);
  }


  formatAreaDifference(): string {

    const difference =
      this.signedAreaDifferencePercent();


    if (difference === null) {
      return '—';
    }


    const sign =
      difference > 0
        ? '+'
        : '';


    return (
      `${sign}${difference.toFixed(1)}%`
    );
  }


  areaDifferenceMessage(): string {

    const level =
      this.areaDifferenceLevel();


    if (level === 'ok') {

      return (
        'The mapped area is close to the official area.'
      );
    }


    if (level === 'warning') {

      return (
        'The mapped area differs from the official area. Check the boundary before saving.'
      );
    }


    if (level === 'strong') {

      return (
        'The mapped boundary differs significantly from the official area. Confirmation will be required before saving.'
      );
    }


    return '';
  }


  save(): void {

    if (
      this.loading() ||
      this.saving()
    ) {
      return;
    }


    if (
      this.form.controls
        .name.invalid
    ) {

      this.form.controls
        .name.markAsTouched();

      this.errorMessage.set(
        'Parcel name is required.'
      );

      return;
    }


    if (this.isEditMode()) {

      this.saveEdit();

      return;
    }


    this.saveCreate();
  }


  cancel(): void {

    const parcel =
      this.editingParcel();


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


  private saveCreate(): void {

    if (this.form.invalid) {

      this.form.markAllAsTouched();

      this.errorMessage.set(
        'Complete the required parcel information.'
      );

      return;
    }


    const currentFarm =
      this.farm();


    if (!currentFarm) {

      this.errorMessage.set(
        'No active farm selected.'
      );

      return;
    }


    const geometry =
      this.drawMap
        ?.getCurrentGeometry()
      ?? this.geometry();


    if (!geometry) {

      this.errorMessage.set(
        'Draw and finish the parcel boundary before saving.'
      );

      return;
    }


    const values =
      this.form.getRawValue();


    const name =
      values.name.trim();


    if (!name) {

      this.errorMessage.set(
        'Parcel name is required.'
      );

      return;
    }


    const difference =
      this.absoluteAreaDifferencePercent();


    if (
      difference !== null &&
      difference >= 20
    ) {

      const confirmed =
        window.confirm(
          `The mapped boundary differs from the official area by ${difference.toFixed(1)}%. Save the parcel anyway?`
        );


      if (!confirmed) {
        return;
      }
    }


    const payload:
      ParcelCreateRequest = {

      name,

      official_area_ha:
        values.official_area_ha,

      geometry,
    };


    this.saving.set(
      true
    );

    this.errorMessage.set(
      null
    );


    this.parcelService
      .createParcel(
        currentFarm.id,
        payload
      )
      .subscribe({

        next: () => {

          this.saving.set(
            false
          );


          this.farmContext
            .selectAndReloadFarms(
              currentFarm.id
            );


          this.router.navigate([
            '/dashboard',
          ]);
        },


        error: error => {

          this.saving.set(
            false
          );


          this.errorMessage.set(
            error.error?.error ??
              'Unable to create parcel.'
          );
        },
      });
  }


  private saveEdit(): void {

    const parcel =
      this.editingParcel();


    if (!parcel) {

      this.errorMessage.set(
        'Parcel is not available.'
      );

      return;
    }


    const name =
      this.form.controls
        .name.value
        .trim();


    if (!name) {

      this.errorMessage.set(
        'Parcel name is required.'
      );

      return;
    }


    const payload:
      ParcelUpdateRequest = {
      name,
    };


    this.saving.set(
      true
    );

    this.errorMessage.set(
      null
    );


    this.parcelService
      .updateParcel(
        parcel.id,
        payload
      )
      .subscribe({

        next: updated => {

          this.saving.set(
            false
          );


          this.farmContext
            .selectAndReloadFarms(
              updated.farm_id
            );


          this.router.navigate([
            '/parcels',
            updated.id,
          ]);
        },


        error: error => {

          this.saving.set(
            false
          );


          this.errorMessage.set(
            error.error?.error ??
              'Unable to update parcel.'
          );
        },
      });
  }


  private loadParcel(
    parcelId: number,
  ): void {

    this.loading.set(
      true
    );

    this.errorMessage.set(
      null
    );


    this.parcelService
      .getParcel(
        parcelId
      )
      .subscribe({

        next: parcel => {

          this.editingParcel.set(
            parcel
          );


          this.form.patchValue({

            name:
              parcel.name,

            official_area_ha:
              parcel.official_area_ha,
          });


          this.officialAreaHa.set(
            parcel.official_area_ha
          );


          this.form.controls
            .official_area_ha
            .disable();


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
}