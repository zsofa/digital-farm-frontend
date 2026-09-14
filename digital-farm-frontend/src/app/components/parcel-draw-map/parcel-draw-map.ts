import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  signal,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

import {
  LngLatBounds,
  Map,
  NavigationControl,
} from 'maplibre-gl';

import type {
  GeoJSONSource,
} from 'maplibre-gl';

import type {
  FeatureCollection,
  LineString,
  Point,
  Polygon,
} from 'geojson';

import {
  ParcelSummary,
  PolygonGeometry,
} from '../../models/parcel.model';


@Component({
  selector: 'app-parcel-draw-map',
  templateUrl: './parcel-draw-map.html',
  styleUrl: './parcel-draw-map.css',
})
export class ParcelDrawMap
  implements
    AfterViewInit,
    OnChanges,
    OnDestroy {

  @Input()
  existingParcels: ParcelSummary[] = [];

  @Input()
  initialGeometry: PolygonGeometry | null = null;

  @Output()
  geometryChange =
    new EventEmitter<PolygonGeometry | null>();

  @ViewChild('mapContainer')
  private mapContainer!:
    ElementRef<HTMLDivElement>;

  readonly ready =
    signal(false);

  readonly drawing =
    signal(false);

  readonly hasDrawing =
    signal(false);

  readonly pointCount =
    signal(0);

  private map?: Map;

  private mapReady = false;

  private draftCoordinates:
    [number, number][] = [];

  private currentGeometry:
    PolygonGeometry | null = null;


  ngAfterViewInit(): void {
    this.initializeMap();
  }


  ngOnChanges(
    changes: SimpleChanges,
  ): void {

    if (
      changes['existingParcels'] &&
      this.mapReady
    ) {
      this.updateExistingParcels();
    }

    if (
      changes['initialGeometry'] &&
      this.mapReady
    ) {
      this.applyInitialGeometry();
    }
  }


  ngOnDestroy(): void {
    this.map?.remove();
  }


  startDrawing(): void {
    if (!this.mapReady) {
      return;
    }

    this.resetDraft();

    this.drawing.set(true);

    this.map?.doubleClickZoom.disable();

    if (this.map) {
      this.map.getCanvas().style.cursor =
        'crosshair';
    }
  }


  finishDrawing(): void {
    if (
      this.draftCoordinates.length < 3
    ) {
      return;
    }

    const firstPoint =
      this.draftCoordinates[0];

    const closedRing = [
      ...this.draftCoordinates,
      firstPoint,
    ];

    this.currentGeometry = {
      type: 'Polygon',

      coordinates: [
        closedRing,
      ],
    };

    this.drawing.set(false);

    this.hasDrawing.set(true);

    this.map?.doubleClickZoom.enable();

    if (this.map) {
      this.map.getCanvas().style.cursor = '';
    }

    this.updateDraftSources();

    this.geometryChange.emit(
      this.currentGeometry
    );
  }


  clearDrawing(): void {
    this.resetDraft();

    this.map?.doubleClickZoom.enable();

    if (this.map) {
      this.map.getCanvas().style.cursor = '';
    }
  }


  getCurrentGeometry():
    PolygonGeometry | null {

    return this.currentGeometry;
  }


  private resetDraft(): void {
    this.draftCoordinates = [];

    this.currentGeometry = null;

    this.pointCount.set(0);

    this.drawing.set(false);

    this.hasDrawing.set(false);

    this.updateDraftSources();

    this.geometryChange.emit(null);
  }


  private applyInitialGeometry(): void {
    if (!this.initialGeometry) {
      return;
    }

    const ring =
      this.initialGeometry.coordinates[0];

    if (
      !ring ||
      ring.length < 4
    ) {
      return;
    }

    let coordinates =
      ring.map(
        coordinate =>
          [
            coordinate[0],
            coordinate[1],
          ] as [number, number]
      );

    const first =
      coordinates[0];

    const last =
      coordinates[
        coordinates.length - 1
      ];

    if (
      first[0] === last[0] &&
      first[1] === last[1]
    ) {
      coordinates =
        coordinates.slice(
          0,
          -1
        );
    }

    this.draftCoordinates =
      coordinates;

    this.currentGeometry = {
      type: 'Polygon',

      coordinates:
        this.initialGeometry.coordinates,
    };

    this.pointCount.set(
      coordinates.length
    );

    this.drawing.set(false);

    this.hasDrawing.set(true);

    this.updateDraftSources();

    this.fitToGeometry(
      this.initialGeometry
    );

    this.geometryChange.emit(
      this.currentGeometry
    );
  }


  private initializeMap(): void {
    this.map = new Map({
      container:
        this.mapContainer.nativeElement,

      style: {
        version: 8,

        glyphs:
          'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',

        sources: {
          osm: {
            type: 'raster',

            tiles: [
              'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            ],

            tileSize: 256,

            attribution:
              '© OpenStreetMap contributors',
          },
        },

        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
          },
        ],
      },

      center: [
        19.5033,
        47.1625,
      ],

      zoom: 6.5,
    });


    this.map.addControl(
      new NavigationControl(),
      'top-right'
    );


    this.map.on(
      'load',
      () => {

        this.mapReady = true;

        this.addExistingParcelLayers();

        this.addDraftLayers();

        this.updateExistingParcels();

        this.registerDrawingEvents();

        if (this.initialGeometry) {
          this.applyInitialGeometry();
        }

        this.ready.set(true);
      }
    );
  }


  private registerDrawingEvents():
    void {

    if (!this.map) {
      return;
    }


    this.map.on(
      'click',
      event => {

        if (!this.drawing()) {
          return;
        }

        this.draftCoordinates.push([
          event.lngLat.lng,
          event.lngLat.lat,
        ]);

        this.pointCount.set(
          this.draftCoordinates.length
        );

        this.updateDraftSources();
      }
    );
  }


  private addExistingParcelLayers():
    void {

    if (!this.map) {
      return;
    }


    this.map.addSource(
      'existing-parcels',
      {
        type: 'geojson',

        data:
          this.createExistingFeatureCollection(),
      }
    );


    this.map.addLayer({
      id: 'existing-parcel-fill',

      type: 'fill',

      source: 'existing-parcels',

      paint: {
        'fill-color':
          '#00ad4e',

        'fill-opacity':
          0.16,
      },
    });


    this.map.addLayer({
      id: 'existing-parcel-outline',

      type: 'line',

      source: 'existing-parcels',

      paint: {
        'line-color':
          '#008f40',

        'line-width':
          2,

        'line-opacity':
          0.9,
      },
    });


    this.map.addLayer({
      id: 'existing-parcel-label',

      type: 'symbol',

      source: 'existing-parcels',

      layout: {
        'text-field': [
          'get',
          'name',
        ],

        'text-size':
          12,

        'text-font': [
          'Open Sans Regular',
        ],

        'text-anchor':
          'center',

        'text-allow-overlap':
          false,
      },

      paint: {
        'text-color':
          '#101828',

        'text-halo-color':
          '#ffffff',

        'text-halo-width':
          2,
      },
    });
  }


  private addDraftLayers():
    void {

    if (!this.map) {
      return;
    }


    this.map.addSource(
      'draft-polygon',
      {
        type: 'geojson',

        data: {
          type:
            'FeatureCollection',

          features: [],
        },
      }
    );


    this.map.addSource(
      'draft-line',
      {
        type: 'geojson',

        data: {
          type:
            'FeatureCollection',

          features: [],
        },
      }
    );


    this.map.addSource(
      'draft-points',
      {
        type: 'geojson',

        data: {
          type:
            'FeatureCollection',

          features: [],
        },
      }
    );


    this.map.addLayer({
      id: 'draft-polygon-fill',

      type: 'fill',

      source: 'draft-polygon',

      paint: {
        'fill-color':
          '#00ad4e',

        'fill-opacity':
          0.22,
      },
    });


    this.map.addLayer({
      id: 'draft-polygon-outline',

      type: 'line',

      source: 'draft-polygon',

      paint: {
        'line-color':
          '#008f40',

        'line-width':
          2.5,
      },
    });


    this.map.addLayer({
      id: 'draft-line-layer',

      type: 'line',

      source: 'draft-line',

      paint: {
        'line-color':
          '#008f40',

        'line-width':
          2.5,
      },
    });


    this.map.addLayer({
      id: 'draft-point-layer',

      type: 'circle',

      source: 'draft-points',

      paint: {
        'circle-radius':
          5,

        'circle-color':
          '#ffffff',

        'circle-stroke-color':
          '#008f40',

        'circle-stroke-width':
          2,
      },
    });
  }


  private updateDraftSources():
    void {

    if (!this.map) {
      return;
    }

    this.updateDraftPoints();

    this.updateDraftLine();

    this.updateDraftPolygon();
  }


  private updateDraftPoints():
    void {

    if (!this.map) {
      return;
    }


    const source =
      this.map.getSource(
        'draft-points'
      ) as
        | GeoJSONSource
        | undefined;


    if (!source) {
      return;
    }


    const data:
      FeatureCollection<Point> = {

      type:
        'FeatureCollection',

      features:
        this.drawing()
          ? this.draftCoordinates.map(
              coordinate => ({
                type: 'Feature',

                properties: {},

                geometry: {
                  type: 'Point',

                  coordinates:
                    coordinate,
                },
              })
            )
          : [],
    };


    source.setData(
      data
    );
  }


  private updateDraftLine():
    void {

    if (!this.map) {
      return;
    }


    const source =
      this.map.getSource(
        'draft-line'
      ) as
        | GeoJSONSource
        | undefined;


    if (!source) {
      return;
    }


    const data:
      FeatureCollection<LineString> = {

      type:
        'FeatureCollection',

      features: [],
    };


    if (
      this.drawing() &&
      this.draftCoordinates.length >= 2
    ) {

      data.features.push({
        type: 'Feature',

        properties: {},

        geometry: {
          type: 'LineString',

          coordinates:
            this.draftCoordinates,
        },
      });
    }


    source.setData(
      data
    );
  }


  private updateDraftPolygon():
    void {

    if (!this.map) {
      return;
    }


    const source =
      this.map.getSource(
        'draft-polygon'
      ) as
        | GeoJSONSource
        | undefined;


    if (!source) {
      return;
    }


    const data:
      FeatureCollection<Polygon> = {

      type:
        'FeatureCollection',

      features: [],
    };


    if (
      this.draftCoordinates.length >= 3
    ) {

      const closedRing = [
        ...this.draftCoordinates,
        this.draftCoordinates[0],
      ];


      data.features.push({
        type: 'Feature',

        properties: {},

        geometry: {
          type: 'Polygon',

          coordinates: [
            closedRing,
          ],
        },
      });
    }


    source.setData(
      data
    );
  }


  private updateExistingParcels():
    void {

    if (!this.map) {
      return;
    }


    const source =
      this.map.getSource(
        'existing-parcels'
      ) as
        | GeoJSONSource
        | undefined;


    if (!source) {
      return;
    }


    source.setData(
      this.createExistingFeatureCollection()
    );


    if (!this.initialGeometry) {
      this.fitToExistingParcels();
    }
  }


  private createExistingFeatureCollection():
    FeatureCollection<Polygon> {

    return {
      type:
        'FeatureCollection',

      features:
        this.existingParcels.map(
          parcel => ({
            type:
              'Feature',

            properties: {
              id:
                parcel.id,

              name:
                parcel.name,

              official_area_ha:
                parcel.official_area_ha,

              county_name:
                parcel.county_name,
            },

            geometry: {
              type:
                'Polygon',

              coordinates:
                parcel.geometry
                  .coordinates,
            },
          })
        ),
    };
  }


  private fitToExistingParcels():
    void {

    if (
      !this.map ||
      this.existingParcels.length === 0
    ) {
      return;
    }


    const bounds =
      new LngLatBounds();


    for (
      const parcel
      of this.existingParcels
    ) {

      for (
        const ring
        of parcel.geometry.coordinates
      ) {

        for (
          const coordinate
          of ring
        ) {

          bounds.extend([
            coordinate[0],
            coordinate[1],
          ]);
        }
      }
    }


    if (!bounds.isEmpty()) {

      this.map.fitBounds(
        bounds,
        {
          padding:
            70,

          maxZoom:
            15,

          duration:
            600,
        }
      );
    }
  }


  private fitToGeometry(
    geometry: PolygonGeometry,
  ): void {

    if (!this.map) {
      return;
    }


    const bounds =
      new LngLatBounds();


    for (
      const ring
      of geometry.coordinates
    ) {

      for (
        const coordinate
        of ring
      ) {

        bounds.extend([
          coordinate[0],
          coordinate[1],
        ]);
      }
    }


    if (!bounds.isEmpty()) {

      this.map.fitBounds(
        bounds,
        {
          padding:
            90,

          maxZoom:
            16,

          duration:
            500,
        }
      );
    }
  }
}