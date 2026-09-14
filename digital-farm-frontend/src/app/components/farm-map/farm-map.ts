import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

import {
  GeoJSONSource,
  LngLatBounds,
  Map,
  NavigationControl,
} from 'maplibre-gl';

import type {
  FeatureCollection,
  Polygon,
} from 'geojson';

import {
  ParcelSummary,
} from '../../models/parcel.model';

@Component({
  selector: 'app-farm-map',
  templateUrl: './farm-map.html',
  styleUrl: './farm-map.css',
})
export class FarmMap
  implements
    AfterViewInit,
    OnChanges,
    OnDestroy {

  @Input()
  parcels: ParcelSummary[] = [];

  @Output()
  parcelSelected =
    new EventEmitter<
      ParcelSummary
    >();

  @ViewChild('mapContainer')
  private mapContainer!:
    ElementRef<HTMLDivElement>;

  private map?: Map;
  private mapReady = false;

  ngAfterViewInit(): void {
    this.initializeMap();
  }

  ngOnChanges(
    changes: SimpleChanges,
  ): void {
    if (
      changes['parcels'] &&
      this.mapReady
    ) {
      this.updateParcels();
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
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

        this.addParcelLayers();

        this.updateParcels();

        this.registerParcelEvents();
      }
    );
  }

  private addParcelLayers(): void {
    if (!this.map) {
      return;
    }

    this.map.addSource(
      'parcels',
      {
        type: 'geojson',

        data:
          this.createFeatureCollection(),
      }
    );

    this.map.addLayer({
      id: 'parcel-fill',

      type: 'fill',

      source: 'parcels',

      paint: {
        'fill-color': '#00ad4e',
        'fill-opacity': 0.22,
      },
    });

    this.map.addLayer({
      id: 'parcel-outline',

      type: 'line',

      source: 'parcels',

      paint: {
        'line-color': '#008f40',
        'line-width': 2.5,
      },
    });

    this.map.addLayer({
      id: 'parcel-label',

      type: 'symbol',

      source: 'parcels',

      layout: {
        'text-field': [
          'get',
          'name',
        ],

        'text-size': 13,

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

  private updateParcels(): void {
    if (!this.map) {
      return;
    }

    const source =
      this.map.getSource(
        'parcels'
      ) as
        | GeoJSONSource
        | undefined;

    if (!source) {
      return;
    }

    source.setData(
      this.createFeatureCollection()
    );

    this.fitMapToParcels();
  }

  private createFeatureCollection():
    FeatureCollection<Polygon> {

    return {
      type: 'FeatureCollection',

      features:
        this.parcels.map(
          parcel => ({
            type: 'Feature',

            properties: {
              id: parcel.id,

              name:
                parcel.name,

              official_area_ha:
                parcel.official_area_ha,

              county_name:
                parcel.county_name,
            },

            geometry: {
              type: 'Polygon',

              coordinates:
                parcel.geometry
                  .coordinates,
            },
          })
        ),
    };
  }

  private fitMapToParcels():
    void {

    if (
      !this.map ||
      this.parcels.length === 0
    ) {
      return;
    }

    const bounds =
      new LngLatBounds();

    for (
      const parcel
      of this.parcels
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

    if (bounds.isEmpty()) {
      return;
    }

    this.map.fitBounds(
      bounds,
      {
        padding: 70,
        maxZoom: 15,
        duration: 800,
      }
    );
  }

  private registerParcelEvents():
    void {

    if (!this.map) {
      return;
    }

    this.map.on(
      'click',
      'parcel-fill',
      event => {

        const feature =
          event.features?.[0];

        if (!feature) {
          return;
        }

        const parcelId =
          Number(
            feature
              .properties?.['id']
          );

        const parcel =
          this.parcels.find(
            item =>
              item.id === parcelId
          );

        if (parcel) {
          this.parcelSelected.emit(
            parcel
          );
        }
      }
    );

    this.map.on(
      'mouseenter',
      'parcel-fill',
      () => {

        if (!this.map) {
          return;
        }

        this.map
          .getCanvas()
          .style.cursor =
          'pointer';
      }
    );

    this.map.on(
      'mouseleave',
      'parcel-fill',
      () => {

        if (!this.map) {
          return;
        }

        this.map
          .getCanvas()
          .style.cursor =
          '';
      }
    );
  }
}