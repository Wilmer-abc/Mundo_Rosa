import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

// Temporary interfaces until service is created
interface DashboardResumen {
  totalVentas: number;
  pedidosPendientes: number;
  productosStockBajo: number;
  totalClientes: number;
}

interface VentaMensual {
  mes: number;
  total: number;
}

interface ProductoMasVendido {
  nombre: string;
  cantidad: number;
}

// Temporary service placeholder
@Injectable({
  providedIn: 'root'
})
class DashboardService {
  getDashboardData(): Observable<any> {
    return of({
      resumen: {
        totalVentas: 0,
        pedidosPendientes: 0,
        productosStockBajo: 0,
        totalClientes: 0
      },
      ventasMensuales: [],
      productosMasVendidos: []
    });
  }
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  resumen: DashboardResumen = {
    totalVentas: 0,
    pedidosPendientes: 0,
    productosStockBajo: 0,
    totalClientes: 0
  };

  ventasMensuales: VentaMensual[] = [];
  productosMasVendidos: ProductoMasVendido[] = [];
  loading = false;
  error: string | null = null;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.cargarDashboard();
  }

  cargarDashboard(): void {
    this.loading = true;
    this.error = null;

    this.dashboardService.getDashboardData()
      .pipe(
        catchError(error => {
          console.error('Error cargando dashboard:', error);
          this.error = 'Error al cargar los datos del dashboard';
          return of({
            resumen: this.resumen,
            ventasMensuales: [],
            productosMasVendidos: []
          });
        }),
        finalize(() => this.loading = false)
      )
      .subscribe((data: { resumen: DashboardResumen; ventasMensuales: VentaMensual[]; productosMasVendidos: ProductoMasVendido[] }) => {
        this.resumen = data.resumen;
        this.ventasMensuales = this.formatearMeses(data.ventasMensuales);
        this.productosMasVendidos = data.productosMasVendidos;
      });
  }

  /**
   * Formatea los números de mes a nombres de mes
   */
  formatearMeses(ventasMensuales: VentaMensual[]): any[] {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    return ventasMensuales.map(venta => ({
      ...venta,
      mes: meses[venta.mes - 1] || `Mes ${venta.mes}`
    }));
  }

  /**
   * Refresca los datos del dashboard
   */
  refrescar(): void {
    this.cargarDashboard();
  }
}