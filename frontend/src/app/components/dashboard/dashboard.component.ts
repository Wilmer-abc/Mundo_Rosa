import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  resumen = {
    totalVentas: 0,
    pedidosPendientes: 0,
    productosStockBajo: 0,
    totalClientes: 0
  };

  ventasMensuales: any[] = [];
  productosMasVendidos: any[] = [];

  private apiUrl = 'http://localhost:3000/api/dashboard';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.cargarResumen();
    this.cargarVentasMensuales();
    this.cargarProductosMasVendidos();
  }

  cargarResumen() {
    this.http.get<any>(`${this.apiUrl}/resumen`)
      .subscribe(data => this.resumen = data);
  }

  cargarVentasMensuales() {
    this.http.get<any[]>(`${this.apiUrl}/ventas-mensuales`)
      .subscribe(data => this.ventasMensuales = data);
  }

  cargarProductosMasVendidos() {
    this.http.get<any[]>(`${this.apiUrl}/productos-mas-vendidos`)
      .subscribe(data => this.productosMasVendidos = data);
  }
}
