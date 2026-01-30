import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../components/sidebar/sidebar.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  template: `
    <div class="layout">
      <aside class="layout__sidebar">
        <app-sidebar></app-sidebar>
      </aside>

      <section class="layout__content">
        <router-outlet></router-outlet>
      </section>
    </div>
  `,
  styles: [`
    .layout {
      display: flex;
      height: 100vh;
      overflow: hidden;
    }

    .layout__sidebar {
      width: 260px;
      flex-shrink: 0;
      height: 100vh;
      overflow: hidden;
    }

    .layout__content {
      flex: 1;
      overflow-y: auto;
      background: #f8fafc;
    }
  `]
})
export class MainLayoutComponent {}

