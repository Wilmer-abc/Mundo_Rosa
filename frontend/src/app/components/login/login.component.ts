import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  error: string = '';
  loading: boolean = false;
  showPassword: boolean = false;
  showRecoveryModal: boolean = false;
  recoveryEmail: string = '';
  recoveryMessage: string = '';
  recoveryLoading: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    this.loading = true;
    this.error = '';

    if (!this.email || !this.password) {
      this.error = 'Por favor ingrese email y contraseña';
      this.loading = false;
      return;
    }

    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Credenciales inválidas';
      }
    });
  }

  openRecoveryModal(): void {
    this.showRecoveryModal = true;
    this.recoveryEmail = this.email; // Pre-cargar el email del campo de login
    this.recoveryMessage = '';
  }

  closeRecoveryModal(): void {
    this.showRecoveryModal = false;
    this.recoveryEmail = '';
    this.recoveryMessage = '';
    this.recoveryLoading = false;
  }

  onRecoverPassword(): void {
    if (!this.recoveryEmail) {
      this.recoveryMessage = 'Por favor ingrese su email';
      return;
    }

    this.recoveryLoading = true;
    this.recoveryMessage = '';

    this.authService.recoverPassword(this.recoveryEmail).subscribe({
      next: (response) => {
        this.recoveryLoading = false;
        this.recoveryMessage = response.mensaje || 'Se ha enviado un correo con instrucciones para recuperar su contraseña';
        setTimeout(() => {
          this.closeRecoveryModal();
        }, 3000);
      },
      error: (err) => {
        this.recoveryLoading = false;
        this.recoveryMessage = err.error?.message || 'Error al procesar la solicitud';
      }
    });
  }
}