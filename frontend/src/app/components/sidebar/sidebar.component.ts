import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable, of } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  // Añade la propiedad vm$ que falta
  vm$: Observable<{ ok: boolean }> = of({ ok: true });
  
  // Ruta de la imagen del logo
  logoImagePath: string = 'assets/images/rosaa.png';

  // Si la imagen no carga, usa Base64 como fallback
  logoFallback: string = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0idXJsKCNwYWludDBfbGluZWFyXzE4XzM1XzApIi8+CjxwYXRoIGQ9Ik0xMCAxMEgyMlYyMkgxMFYxMFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xNiAxMkwyMCAxNkgxNlYyMEwxMiAxNkwxNiAxMloiIGZpbGw9IiMwRUE1RTkiLz4KPGRlZnM+CjxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQwX2xpbmVhcl8xOF8zNV8wIiB4MT0iMCIgeTE9IjAiIHgyPSIzMiIgeTI9IjMyIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wIHN0b3AtY29sb3I9IiMxRUE1RTkiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjMUY3M0U1Ii8+CjwvbGluZWFyR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+`;

  constructor() {
    // Verificar si la imagen existe
    this.checkImageExists();
  }

  private checkImageExists() {
    const img = new Image();
    img.onload = () => {
      console.log('Logo cargado correctamente desde:', this.logoImagePath);
    };
    img.onerror = () => {
      console.warn('Logo no encontrado en', this.logoImagePath, 'usando fallback');
      // Cambiar a fallback base64
      this.logoImagePath = this.logoFallback;
    };
    img.src = this.logoImagePath;
  }

  logout() {
    console.log('Cerrar sesión');
    // Aquí iría la lógica de logout real
  }
}