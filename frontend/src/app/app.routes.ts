import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { LoginComponent } from './components/login/login.component';
import { AccesoDenegadoComponent } from './components/acceso-denegado/acceso-denegado.component';
import { PedidosComponent } from './components/pedidos/pedidos.component';
import { ProductoComponent } from './components/producto/producto.component';
    
import { AuthGuard } from './guards/auth.guard';
import { MainLayoutComponent } from './layouts/main-layout.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'acceso-denegado', component: AccesoDenegadoComponent },

  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: 'dashboard',
        component: DashboardComponent,
        data: { roles: ['admin', 'cliente'] }
      },
      {
        path: 'pedidos',
        component: PedidosComponent,
        data: { roles: ['admin', 'cliente'] }
      },
      {
        path : 'productos',
        component: ProductoComponent,
        data: { roles: ['admin'] }
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  { path: '**', redirectTo: 'login' }
];
