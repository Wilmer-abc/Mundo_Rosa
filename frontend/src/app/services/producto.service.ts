import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Producto {
  id?: number;
  nombre: string;
  descripcion: string;
  categoria?: string;
  marca?: string;
  precio_compra?: number;
  precio?: number; // Precio base
  precio_venta: number;
  precio_oferta?: number;
  caracteristicas?: string;
  stock: number;
  es_nuevo?: boolean;
  es_oferta?: boolean;
  es_destacado?: boolean;
  activo?: boolean;
  imagenes: string[];
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  private apiUrl = 'http://localhost:3000/api/productos';

  constructor(private http: HttpClient) { }

  // Obtener todos los productos
  getProductos(): Observable<Producto[]> {
    return this.http.get<Producto[]>(this.apiUrl);
  }

  // Obtener producto por ID
  getProducto(id: number): Observable<Producto> {
    return this.http.get<Producto>(`${this.apiUrl}/${id}`);
  }

  // Crear nuevo producto (con FormData para imágenes)
  createProducto(productoData: FormData): Observable<any> {
    return this.http.post(this.apiUrl, productoData);
  }

  // Actualizar producto existente (con FormData para imágenes)
  updateProducto(id: number, productoData: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, productoData);
  }

  // Eliminar producto (desactivar)
  deleteProducto(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}