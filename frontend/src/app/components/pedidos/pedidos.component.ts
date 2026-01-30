import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PedidosService, Pedido, Producto, DetallePedido, NuevoPedido } from '../../services/pedidos.service';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './pedidos.component.html',
  styleUrls: ['./pedidos.component.css']
})
export class PedidosComponent implements OnInit {
  pedidos: Pedido[] = [];
  productos: Producto[] = [];
  pedidoSeleccionado: Pedido | null = null;
  nuevoPedido: NuevoPedido = {
    cliente_id: 0,
    fecha_entrega: '',
    estado: 'pendiente',
    notas: '',
    detalles: []
  };
  detalleActual: Omit<DetallePedido, 'producto_nombre' | 'producto_imagenes'> = {
    producto_id: 0,
    cantidad: 1,
    precio: 0
  };
  clienteIdInput: string = '';
  mostrarModalNuevo: boolean = false;
  mostrarModalDetalle: boolean = false;
  cargando: boolean = false;

  // Estados disponibles
  estados = [
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'procesando', label: 'Procesando' },
    { value: 'completado', label: 'Completado' },
    { value: 'cancelado', label: 'Cancelado' }
  ];

  constructor(private pedidosService: PedidosService) {}

  ngOnInit(): void {
    this.cargarPedidos();
    this.cargarProductos();
  }

  cargarPedidos(): void {
    this.cargando = true;
    this.pedidosService.getPedidos().subscribe({
      next: (data) => {
        this.pedidos = data;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error cargando pedidos:', error);
        this.cargando = false;
      }
    });
  }

    actualizarClienteId(): void {
    this.nuevoPedido.cliente_id = Number(this.clienteIdInput);
    }

    obtenerStockSeleccionado(): number {
    const producto = this.productos.find(
        p => p.id === this.detalleActual.producto_id
    );
    return producto ? producto.stock : 1;
    }



  cargarProductos(): void {
    this.pedidosService.getProductosDisponibles().subscribe({
      next: (data) => {
        this.productos = data;
      },
      error: (error) => {
        console.error('Error cargando productos:', error);
      }
    });
  }

  verDetalle(pedido: Pedido): void {
    this.pedidoSeleccionado = pedido;
    this.mostrarModalDetalle = true;
  }

  abrirModalNuevo(): void {
    this.nuevoPedido = {
      cliente_id: 0,
      fecha_entrega: new Date().toISOString().split('T')[0],
      estado: 'pendiente',
      notas: '',
      detalles: []
    };
    this.clienteIdInput = '';
    this.mostrarModalNuevo = true;
  }

  agregarProducto(): void {
    if (this.detalleActual.producto_id && this.detalleActual.cantidad > 0 && this.detalleActual.precio > 0) {
      // Verificar stock disponible
      const producto = this.productos.find(p => p.id === this.detalleActual.producto_id);
      if (producto && this.detalleActual.cantidad > producto.stock) {
        alert(`Stock insuficiente. Solo hay ${producto.stock} unidades disponibles.`);
        return;
      }

      this.nuevoPedido.detalles.push({ ...this.detalleActual });
      
      // Resetear detalle actual
      this.detalleActual = {
        producto_id: 0,
        cantidad: 1,
        precio: 0
      };
    }
  }

  eliminarDetalle(index: number): void {
    this.nuevoPedido.detalles.splice(index, 1);
  }

  calcularTotal(): number {
    return this.nuevoPedido.detalles.reduce((total, detalle) => {
      return total + (detalle.precio * detalle.cantidad);
    }, 0);
  }

  crearPedido(): void {
    if (!this.nuevoPedido.cliente_id || this.nuevoPedido.detalles.length === 0) {
      alert('Complete todos los campos requeridos');
      return;
    }

    this.pedidosService.crearPedido(this.nuevoPedido).subscribe({
      next: (response) => {
        alert(`Pedido creado exitosamente. Código: ${response.codigo}`);
        this.mostrarModalNuevo = false;
        this.cargarPedidos();
      },
      error: (error) => {
        console.error('Error creando pedido:', error);
        alert('Error al crear el pedido');
      }
    });
  }

  actualizarEstado(pedido: Pedido, nuevoEstado: string): void {
    this.pedidosService.actualizarPedido(pedido.id, { estado: nuevoEstado as 'pendiente' | 'procesando' | 'completado' | 'cancelado' }).subscribe({
      next: () => {
        pedido.estado = nuevoEstado as any;
        alert('Estado actualizado exitosamente');
      },
      error: (error) => {
        console.error('Error actualizando estado:', error);
        alert('Error al actualizar el estado');
      }
    });
  }

  eliminarPedido(id: number): void {
    if (confirm('¿Está seguro de eliminar este pedido?')) {
      this.pedidosService.eliminarPedido(id).subscribe({
        next: () => {
          this.pedidos = this.pedidos.filter(p => p.id !== id);
          alert('Pedido eliminado exitosamente');
        },
        error: (error) => {
          console.error('Error eliminando pedido:', error);
          alert('Error al eliminar el pedido');
        }
      });
    }
  }

  onProductoSeleccionado(): void {
    const producto = this.productos.find(p => p.id === this.detalleActual.producto_id);
    if (producto) {
      this.detalleActual.precio = producto.precio;
    }
  }

  obtenerProductoNombre(productoId: number): string {
    const producto = this.productos.find(p => p.id === productoId);
    return producto ? producto.nombre : 'Producto no encontrado';
  }

  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'pendiente': return '#f59e0b';
      case 'procesando': return '#3b82f6';
      case 'completado': return '#10b981';
      case 'cancelado': return '#ef4444';
      default: return '#6b7280';
    }
  }

  getEstadoLabel(estado: string): string {
    const estadoObj = this.estados.find(e => e.value === estado);
    return estadoObj ? estadoObj.label : estado;
  }
}