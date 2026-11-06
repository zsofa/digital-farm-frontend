import { DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';

import { calculateGhgImpact } from '../../../calculations/ghg-calculations';
import type {
  CompleteParcelSeasonSustainabilityResult,
} from '../../../models/sustainability.model';

@Component({
  selector: 'app-ghg-impact',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './ghg-impact.html',
  styleUrl: './ghg-impact.css',
})
export class GhgImpact {
  readonly detail = input.required<CompleteParcelSeasonSustainabilityResult>();

  readonly metrics = computed(() => calculateGhgImpact(this.detail()));

  readonly displayScore = computed(() => {
    const score = this.metrics().managementScore;
    return score === null ? null : score * 100;
  });

  readonly cropLabel = computed(() => {
    const labels = {
      wheat: 'Wheat',
      barley: 'Barley',
      maize: 'Maize',
    } as const;

    return labels[this.detail().season.crop];
  });
}