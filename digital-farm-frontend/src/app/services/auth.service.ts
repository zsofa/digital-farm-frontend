import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';

import { environment } from '../../environments/environment';
import { LoginResponse, User } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly tokenKey = 'digital_farm_token';
  private readonly userKey = 'digital_farm_user';

  readonly currentUser = signal<User | null>(
    this.loadStoredUser()
  );

  constructor(private readonly http: HttpClient) {}

  login(email: string, password: string) {
    return this.http.post<LoginResponse>(
      `${environment.apiUrl}/auth/login`,
      {
        email,
        password,
      }
    ).pipe(
      tap(response => {
        localStorage.setItem(
          this.tokenKey,
          response.access_token
        );

        localStorage.setItem(
          this.userKey,
          JSON.stringify(response.user)
        );

        this.currentUser.set(response.user);
      })
    );
  }

  register(data: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
  }) {
    return this.http.post<User>(
      `${environment.apiUrl}/auth/register`,
      data
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.currentUser.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  private loadStoredUser(): User | null {
    const storedUser = localStorage.getItem(
      this.userKey
    );

    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser) as User;
    } catch {
      return null;
    }
  }
}