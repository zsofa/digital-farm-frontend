import {
  Component,
  OnInit,
} from '@angular/core';
import {
  RouterOutlet,
} from '@angular/router';

import {
  Header,
} from '../header/header';

import {
  Sidebar,
} from '../sidebar/sidebar';

import {
  FarmContextService,
} from '../../services/farm-context.service';

@Component({
  selector: 'app-layout',
  imports: [
    RouterOutlet,
    Header,
    Sidebar,
  ],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.css',
})
export class AppLayout
  implements OnInit {

  constructor(
    private readonly farmContext:
      FarmContextService,
  ) {}

  ngOnInit(): void {
    this.farmContext.loadFarms();
  }
}