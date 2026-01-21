import { Routes } from '@angular/router';

import { DashboardComponent } from './components/dashboard/dashboard.component';
import { LoginComponent } from './components/login/login.component';
import { AccesoDenegadoComponent } from './components/acceso-denegado/acceso-denegado,component';
import { AuthGuard } from './guards/auth.guard';
export const routes: Routes = [

    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
    { path: 'acceso-denegado', component: AccesoDenegadoComponent },
    { 
        path: 'dashboard', 
        component: DashboardComponent,
        canActivate: [AuthGuard],
        data: { roles: ['admin', 'staf'] }
    },
];
 