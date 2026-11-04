import { Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import {
  CompleteParcelSeasonSustainabilityResult,
} from '../../models/sustainability.model';

interface TextureClayRange {
  name: string;
  min: number;
  max: number;
  includeMax?: boolean;
}

const TEXTURE_CLAY_RANGES: readonly TextureClayRange[] = [
  { name: 'Sand', min: 0, max: 10 },
  { name: 'Loamy sand', min: 0, max: 15 },
  { name: 'Sandy loam', min: 0, max: 20 },
  { name: 'Loam', min: 7, max: 27 },
  { name: 'Silt loam', min: 0, max: 27 },
  { name: 'Silt', min: 0, max: 12 },
  { name: 'Sandy clay loam', min: 20, max: 35 },
  { name: 'Clay loam', min: 27, max: 40 },
  { name: 'Silty clay loam', min: 27, max: 40 },
  { name: 'Sandy clay', min: 35, max: 55 },
  { name: 'Silty clay', min: 40, max: 60, includeMax: true },
  { name: 'Clay', min: 40, max: 100, includeMax: true },
];

@Component({
  selector: 'app-soil-condition',
  standalone: true,
  imports: [DecimalPipe],

  template: `
    <section class="parcel">
      <header>
        <div>
          <span class="eyebrow">Soil condition</span>
          <h2>{{ detail().parcel.name }}</h2>
          <p>{{ detail().season.plan_name }}</p>
        </div>

        <span class="source">{{ sourceLabel() }}</span>
      </header>

      <div class="grid">
        <article>
          <h3>SOC/clay ratio</h3>

          <div class="value">
            {{
              ratio() === null
                ? '—'
                : (ratio() | number:'1.3-3')
            }}
          </div>

          <details class="info">
            <summary>Calculation</summary>
            <p class="formula">
              SOC [g/kg] / (10 × clay [%])
            </p>
          </details>

          @if (clay() === 0) {
            <p>Not defined at 0% clay.</p>
          } @else if (ratio() === null) {
            <p>Valid SOC and clay values are required.</p>
          }
        </article>

        <article>
          <h3>Soil pH</h3>

          <div class="value">
            {{
              ph() === null
                ? '—'
                : (ph() | number:'1.2-2')
            }}
          </div>

          @if (ph() !== null) {
            <p class="status">{{ phLabel() }}</p>

            <div
              class="scale"
              role="img"
              [attr.aria-label]="
                'Soil pH ' + ph()
                + ', ' + phLabel()
                + ', scale 0 to 14'
              "
            >
              <div class="track ph">
                <span class="neutral"></span>

                <span
                  class="marker"
                  [style.left.%]="position(ph(), 14)"
                ></span>
              </div>

              <div class="ticks">
                @for (tick of phTicks; track tick) {
                  <span
                    [style.left.%]="tick / 14 * 100"
                    [class.first]="tick === 0"
                    [class.last]="tick === 14"
                  >
                    {{ tick }}
                  </span>
                }
              </div>
            </div>

            <div class="legend">
              <span>Acidic</span>
              <span>Neutral 7</span>
              <span>Alkaline</span>
            </div>
          } @else {
            <p>No valid pH value.</p>
          }
        </article>

        <article>
          <h3>Soil organic carbon</h3>

          <div class="value">
            {{
              socPct() === null
                ? '—'
                : (socPct() | number:'1.2-2')
            }}
            <small>%</small>
          </div>

          @if (socPct() !== null) {
            <p>{{ soc() | number:'1.2-2' }} g/kg</p>

            <div
              class="scale"
              role="img"
              [attr.aria-label]="
                'Organic carbon ' + socPct()
                + ' percent, scale 0 to '
                + socMax() + ' percent'
              "
            >
              <div class="track carbon">
                <span
                  class="marker"
                  [style.left.%]="position(socPct(), socMax())"
                ></span>
              </div>

              <div class="ticks">
                @for (fraction of quarterTicks; track fraction) {
                  <span
                    [style.left.%]="fraction * 100"
                    [class.first]="fraction === 0"
                    [class.last]="fraction === 1"
                  >
                    {{ fraction * socMax() | number:'1.0-2' }}%
                  </span>
                }
              </div>
            </div>

            <details class="info">
              <summary>About this value</summary>
              <p>SOC [%] = SOC [g/kg] / 10.</p>
              <p>
                Carbon concentration by soil mass;
                not total organic matter.
              </p>
            </details>
          } @else {
            <p>No valid SOC value.</p>
          }
        </article>

        <article>
          <h3>Clay content</h3>

          <div class="value">
            {{
              clay() === null
                ? '—'
                : (clay() | number:'1.2-2')
            }}
            <small>%</small>
          </div>

          @if (clay() !== null) {
            <div
              class="scale"
              role="img"
              [attr.aria-label]="
                'Clay content ' + clay()
                + ' percent, scale 0 to 100 percent'
              "
            >
              <div class="track clay">
                <span
                  class="marker"
                  [style.left.%]="position(clay(), 100)"
                ></span>
              </div>

              <div class="ticks">
                @for (tick of clayTicks; track tick) {
                  <span
                    [style.left.%]="tick"
                    [class.first]="tick === 0"
                    [class.last]="tick === 100"
                  >
                    {{ tick }}%
                  </span>
                }
              </div>
            </div>

            <div class="legend">
              <span>Less clay</span>
              <span>More clay</span>
            </div>

            <div class="texture-options">
              <p class="status">Possible USDA textures</p>

              <ul class="texture-list">
                @for (texture of possibleTextures(); track texture) {
                  <li>{{ texture }}</li>
                }
              </ul>

              @if (possibleTextures().length > 1) {
                <p>Sand and silt determine the exact class.</p>
              } @else {
                <p>
                  Only this USDA class is compatible
                  with this clay content.
                </p>
              }
            </div>
          } @else {
            <p>No valid clay value.</p>
          }
        </article>
      </div>
    </section>
  `,

  styles: [`
    :host {
      display: block;
      margin-bottom: 20px;
      color: #263d32;
      container-type: inline-size;
    }

    * {
      box-sizing: border-box;
    }

    .parcel {
      padding: 20px;
      border: 1px solid #e0e7df;
      border-radius: 20px;
      background: #fff;
      box-shadow: 0 4px 20px rgb(33 60 43 / 3%);
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 18px;
    }

    header > div {
      min-width: 0;
    }

    .eyebrow {
      color: #647b6b;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .12em;
    }

    h2 {
      margin: 5px 0;
      font-size: 20px;
      letter-spacing: -.025em;
      overflow-wrap: anywhere;
    }

    header p {
      margin: 0;
    }

    .source {
      padding: 6px 10px;
      border: 1px solid #e1e8de;
      border-radius: 999px;
      background: #f6f8f3;
      font-size: 11px;
      color: #526b59;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      align-items: start;
    }

    article {
      min-width: 0;
      padding: 18px;
      border: 1px solid #e2e8df;
      border-radius: 14px;
      background: #fbfcfa;
    }

    article:first-child {
      background: #f1f5ec;
    }

    h3 {
      margin: 0 0 12px;
      color: #506756;
      font-size: 13px;
      font-weight: 600;
    }

    p {
      margin: 7px 0 0;
      color: #5c6e62;
      font-size: 12px;
      line-height: 1.5;
    }

    .value {
      font-size: 30px;
      font-weight: 650;
      line-height: 1.15;
      letter-spacing: -.035em;
      font-variant-numeric: tabular-nums;
    }

    small {
      margin-left: 3px;
      font-size: 14px;
      font-weight: 500;
      color: #637663;
    }

    .status {
      color: #3e5b47;
      font-size: 11px;
      font-weight: 600;
    }

    .formula {
      font-size: 11px;
      overflow-wrap: anywhere;
    }

    .info {
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px solid #e1e7dc;
    }

    summary {
      width: fit-content;
      color: #566c59;
      font-size: 11px;
      cursor: pointer;
    }

    summary:focus-visible {
      outline: 2px solid #526f51;
      outline-offset: 4px;
      border-radius: 2px;
    }

    .scale {
      margin: 19px 3px 0;
    }

    .track {
      position: relative;
      height: 10px;
      border-radius: 4px;
    }

    .ph {
      background: linear-gradient(
        to right,
        #d52625 0%,
        #ef712c 21.43%,
        #f5d43e 35.71%,
        #53aa62 50%,
        #21aabb 64.29%,
        #465ac4 78.57%,
        #783a96 100%
      );
    }

    .carbon {
      background: linear-gradient(
        to right,
        #f1e8da,
        #a68059,
        #4e3425
      );
    }

    .clay {
      background: linear-gradient(
        to right,
        #ede5d8,
        #bfa081,
        #795a43
      );
    }

    .neutral {
      position: absolute;
      left: 50%;
      top: 0;
      bottom: 0;
      border-left: 1px solid #fff;
    }

    .marker {
      position: absolute;
      top: -4px;
      width: 2px;
      height: 18px;
      background: #223c2c;
      transform: translateX(-50%);
      box-shadow: 0 0 0 1.5px #fff;
    }

    .marker::before {
      content: '';
      position: absolute;
      top: -6px;
      left: -3px;
      border-left: 4px solid transparent;
      border-right: 4px solid transparent;
      border-top: 5px solid #223c2c;
    }

    .ticks {
      position: relative;
      height: 18px;
      margin-top: 8px;
      font-size: 10px;
      color: #5d6f61;
      font-variant-numeric: tabular-nums;
    }

    .ticks span {
      position: absolute;
      transform: translateX(-50%);
      white-space: nowrap;
    }

    .ticks .first {
      transform: none;
    }

    .ticks .last {
      transform: translateX(-100%);
    }

    .legend {
      display: flex;
      justify-content: space-between;
      gap: 6px;
      color: #637567;
      font-size: 10px;
    }

    .texture-options {
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px solid #e1e7dc;
    }

    .texture-options > .status {
      margin-top: 0;
    }

    .texture-options > p:last-child {
      font-size: 11px;
    }

    .texture-list {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      padding: 0;
      margin: 8px 0 0;
      list-style: none;
    }

    .texture-list li {
      padding: 4px 7px;
      border: 1px solid #dce5d7;
      border-radius: 7px;
      background: #f0f4eb;
      color: #476041;
      font-size: 11px;
      line-height: 1.35;
    }

    @container (min-width: 1120px) {
      .grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
    }

    @container (max-width: 580px) {
      .grid {
        grid-template-columns: 1fr;
      }

      .parcel {
        padding: 16px;
        border-radius: 16px;
      }

      article {
        padding: 16px;
      }

      h2 {
        font-size: 19px;
      }
    }
  `],
})
export class SoilCondition {
  readonly detail =
    input.required<CompleteParcelSeasonSustainabilityResult>();

  readonly phTicks = [0, 2, 4, 6, 7, 8, 10, 12, 14];
  readonly clayTicks = [0, 20, 40, 60, 80, 100];
  readonly quarterTicks = [0, 0.25, 0.5, 0.75, 1];

  readonly ph = computed(() =>
    this.valid(this.detail().soil.soil_ph, 14)
  );

  readonly soc = computed(() =>
    this.valid(this.detail().soil.soil_soc_g_kg, 1000)
  );

  readonly clay = computed(() =>
    this.valid(this.detail().soil.soil_clay_pct, 100)
  );

  readonly possibleTextures = computed(() => {
    const clay = this.clay();

    if (clay === null) {
      return [];
    }

    return TEXTURE_CLAY_RANGES
      .filter(range =>
        clay >= range.min &&
        (
          range.includeMax
            ? clay <= range.max
            : clay < range.max
        )
      )
      .map(range => range.name);
  });

  readonly socPct = computed(() => {
    const value = this.soc();
    return value === null ? null : value / 10;
  });

  readonly ratio = computed(() => {
    const soc = this.soc();
    const clay = this.clay();

    if (soc === null || clay === null || clay === 0) {
      return null;
    }

    return soc / (10 * clay);
  });

  readonly socMax = computed(() =>
    Math.max(
      5,
      Math.ceil((this.socPct() ?? 0) / 5) * 5,
    )
  );

  readonly phLabel = computed(() => {
    const ph = this.ph();

    if (ph === null) {
      return '';
    }

    if (ph < 7) {
      return 'Acidic';
    }

    if (ph > 7) {
      return 'Alkaline';
    }

    return 'Neutral';
  });

  readonly sourceLabel = computed(() =>
    this.detail().soil.source === 'soilgrids'
      ? 'SoilGrids · 0–30 cm'
      : 'User measurement'
  );

  private valid(
    value: number | null | undefined,
    maximum: number,
  ): number | null {
    return (
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= 0 &&
      value <= maximum
    )
      ? value
      : null;
  }

  position(
    value: number | null,
    maximum: number,
  ): number {
    if (value === null) {
      return 0;
    }

    return Math.min(
      100,
      Math.max(0, value / maximum * 100),
    );
  }
}