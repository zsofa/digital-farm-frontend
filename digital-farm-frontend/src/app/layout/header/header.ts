import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { FarmContextService } from '../../services/farm-context.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  readonly currentUser;
  readonly farms;
  readonly selectedFarm;

  constructor(
    private readonly authService: AuthService,
    private readonly farmContext: FarmContextService,
    private readonly router: Router,
  ) {
    this.currentUser = this.authService.currentUser;
    this.farms = this.farmContext.farms;
    this.selectedFarm = this.farmContext.selectedFarm;
  }

  selectFarm(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const farmId = Number(select.value);

    this.farmContext.selectFarm(farmId);
  }

  logout(): void {
    this.farmContext.clear();
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  get initials(): string {
    const user = this.currentUser();

    if (!user) {
      return '';
    }

    return (
      user.first_name.charAt(0) +
      user.last_name.charAt(0)
    ).toUpperCase();
  }
}