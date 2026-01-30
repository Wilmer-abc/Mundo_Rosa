import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface DashboardResumen {
  totalVentas: number;
  pedidosPendientes: number;
  productosStockBajo: number;
  totalClientes: number;
}

export interface VentaMensual {
  mes: number;
  total: number;
}

export interface ProductoMasVendido {
  nombre: string;
  totalVendido: number;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = 'http://localhost:3000/api/dashboard';

  constructor(private http: HttpClient) { }

  /**
   * Obtiene todos los datos del dashboard en una sola llamada
   */
  getDashboardData(): Observable<{
    resumen: DashboardResumen;
    ventasMensuales: VentaMensual[];
    productosMasVendidos: ProductoMasVendido[];
  }> {
    return forkJoin({
      resumen: this.getResumen(),
      ventasMensuales: this.getVentasMensuales(),
      productosMasVendidos: this.getProductosMasVendidos()
    });
  }

  /**
   * Obtiene los datos de resumen del dashboard
   */
  getResumen(): Observable<DashboardResumen> {
    return this.http.get<DashboardResumen>(`${this.apiUrl}/resumen`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Obtiene las ventas mensuales del año actual
   */
  getVentasMensuales(): Observable<VentaMensual[]> {
    return this.http.get<VentaMensual[]>(`${this.apiUrl}/ventas-mensuales`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Obtiene los productos más vendidos (top 5)
   */
  getProductosMasVendidos(): Observable<ProductoMasVendido[]> {
    return this.http.get<ProductoMasVendido[]>(`${this.apiUrl}/productos-mas-vendidos`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Obtiene las ventas de los últimos meses
   * @param meses Número de meses a obtener (por defecto 6)
   */
  getVentasUltimosMeses(meses: number = 6): Observable<VentaMensual[]> {
    return this.http.get<VentaMensual[]>(`${this.apiUrl}/ventas-ultimos-meses?meses=${meses}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Refresca todos los datos del dashboard
   */
  refreshDashboard(): Observable<{
    resumen: DashboardResumen;
    ventasMensuales: VentaMensual[];
    productosMasVendidos: ProductoMasVendido[];
  }> {
    return this.getDashboardData();
  }

  /**
   * Manejo de errores
   */
  private handleError(error: any): Observable<never> {
    console.error('Error en DashboardService:', error);
    throw new Error(error.message || 'Error al obtener datos del dashboard');
  }
}