import { bootstrapApplication } from '@angular/platform-browser';
import { setWorkerUrl } from 'maplibre-gl';

import { appConfig } from './app/app.config';
import { AppComponent } from './app/app';

setWorkerUrl(
  '/maplibre/maplibre-gl-worker.mjs'
);

bootstrapApplication(
  AppComponent,
  appConfig
).catch(error => console.error(error));