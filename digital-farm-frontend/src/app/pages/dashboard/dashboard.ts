import { Component } from '@angular/core';
import { CommonModule }  from '@angular/common';

type Field = {
  id: string
  name: string
  soilType: string
  cropType: string
  strategy: string
  irrigation: string
  yield: number
  sustainability: number
  soilHealthRisk: string
  waterQualityRisk: string
  carbonRisk: string
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  soilTypes = ['Loam', 'Clay', 'Sandy', 'Silty', 'Peat', 'Chalky']
  cropTypes = ['Wheat', 'Maize', 'Sunflower', 'Barley', 'Rapeseed', 'Soybean']
  strategies = ['Conventional', 'Reduced Input', 'Organic', 'Precision']
  irrigationMethods =  [
    'Surface irrigation',
    'Sprinkler irrigation',
    'Drip irrigation',
    'Centre-pivot irrigation',
    'Manual'
  ]

  fields: Field[] = [
    {
      id: 'f1',
      name: 'Field name',
      soilType: 'Loam',
      cropType: 'Wheat',
      strategy: 'Precision',
      irrigation: 'Medium',
      yield: 6.7,
      sustainability: 75,
      soilHealthRisk: '',
      waterQualityRisk: '',
      carbonRisk: ''
    },
    {
      id: 'f2',
      name: 'Field name2',
      soilType: 'Clay',
      cropType: 'Chickpeas',
      strategy: 'Precision',
      irrigation: 'Low',
      yield: 6.8,
      sustainability: 77,
      soilHealthRisk: '',
      waterQualityRisk: '',
      carbonRisk: ''
    }
  ];

  selectedField: Field = this.fields[0];

  constructor() {
  }

  selectField(field: Field): void {
    this.selectedField = field;
  }

  onFieldChange(): void {
    this.selectField;
  }

  private updateFieldInList(): void {
    this.fields = this.fields.map( field => field.id === this.selectedField.id ? { ...this.selectedField} : field)
  }

}
