import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  imagenes: string[];
}

export interface DetallePedido {
  producto_id: number;
  cantidad: number;
  precio: number;
  producto_nombre?: string;
  producto_imagenes?: string[];
}

export interface Pedido {
  id: number;
  codigo: string;
  cliente_id: number;
  cliente_nombre?: string;
  fecha_pedido: string;
  fecha_entrega: string;
  estado: string;
  total: number;
  total_items: number; // ✅ agregar
  notas?: string;
  detalles: DetallePedido[];
}

export interface NuevoPedido {
  cliente_id: number;
  fecha_entrega: string;
  estado: string;
  notas: string;
  detalles: Omit<DetallePedido, 'producto_nombre' | 'producto_imagenes'>[];
}

@Injectable({
  providedIn: 'root'
})
export class PedidosService {
  private apiUrl = 'http://localhost:3000/api/pedidos';

  constructor(private http: HttpClient) { }

  // Obtener todos los pedidos
  getPedidos(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(this.apiUrl);
  }

  // Obtener un pedido por ID
  getPedidoById(id: number): Observable<Pedido> {
    return this.http.get<Pedido>(`${this.apiUrl}/${id}`);
  }

  // Crear nuevo pedido
  crearPedido(pedido: NuevoPedido): Observable<{ message: string; pedidoId: number; codigo: string }> {
    return this.http.post<{ message: string; pedidoId: number; codigo: string }>(this.apiUrl, pedido);
  }

  // Actualizar pedido
  actualizarPedido(id: number, pedido: Partial<Pedido>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${id}`, pedido);
  }

  // Eliminar pedido
  eliminarPedido(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  // Obtener productos disponibles
  getProductosDisponibles(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.apiUrl}/productos/disponibles`);
  }

  // Obtener pedidos por estado
  getPedidosPorEstado(estado: string): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${this.apiUrl}/estado/${estado}`);
  }
}