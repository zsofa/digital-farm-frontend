import { Component, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, map, of, switchMap, timer } from 'rxjs';

import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form;
  readonly status;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {
    this.form = this.formBuilder.nonNullable.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],

      email: [
        '',
        [Validators.required, Validators.email],
        (control: AbstractControl<string>) =>
          timer(350).pipe(
            switchMap(() => this.authService.checkEmail(control.value)),
            map(result => result.available ? null : { emailTaken: true }),
            // A regisztrációs végpont mentéskor is ellenőrzi az egyediséget.
            catchError(() => of(null)),
          ),
      ],

      password: [
        '',
        [Validators.required, Validators.minLength(8)],
      ],
    });

    this.status = toSignal(this.form.statusChanges, {
      initialValue: this.form.status,
    });
  }

  submit(): void {
    if (this.loading() || this.form.status !== 'VALID') {
      this.form.markAllAsTouched();
      return;
    }

    const values = this.form.getRawValue();

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.register(values).subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: error => {
        this.loading.set(false);

        if (error.error?.code === 'email_taken') {
          const email = this.form.controls.email;

          if (email.value === values.email) {
            email.setErrors({ ...email.errors, emailTaken: true });
          }

          return;
        }

        this.errorMessage.set(
          error.error?.error ?? 'Unable to create account.',
        );
      },
    });
  }
}