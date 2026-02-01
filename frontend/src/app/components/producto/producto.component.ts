import { Component, OnInit } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { ProductoService } from '../../services/producto.service';

@Component({
  selector: 'app-producto',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './producto.component.html',
  styleUrls: ['./producto.component.css']
})
export class ProductoComponent implements OnInit {
  productoForm: FormGroup;
  productos: any[] = [];
  productoEditando: any = null;
  previewImages: string[] = [];
  maxImages = 4;

  constructor(
    private fb: FormBuilder,
    private productoService: ProductoService,
    private cdr: ChangeDetectorRef
  ) {
    this.productoForm = this.createProductoForm();
  }

  ngOnInit() {
    this.cargarProductos();
  }

  createProductoForm(): FormGroup {
    return this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(150)]],
      categoria: ['', Validators.required],
      descripcion: ['', [Validators.required]],
      caracteristicas: [''],
      precioCompra: ['', [Validators.required, Validators.min(0)]],
      precioVenta: ['', [Validators.required, Validators.min(0)]],
      precioOferta: ['', [Validators.min(0)]],
      stock: ['', [Validators.required, Validators.min(0)]],
      marca: [''],
      esNuevo: [true],
      esOferta: [false],
      esDestacado: [false],
      imagenes: this.fb.array([], [Validators.required, Validators.minLength(1)])
    });
  }

  get imagenesArray(): FormArray {
    return this.productoForm.get('imagenes') as FormArray;
  }

  addImagenControl() {
    if (this.imagenesArray.length < this.maxImages) {
      this.imagenesArray.push(this.fb.control(null, Validators.required));
      this.previewImages.push('');
      this.cdr.detectChanges();
    }
  }

  removeImagenControl(index: number) {
    this.imagenesArray.removeAt(index);
    this.previewImages.splice(index, 1);
  }

  onImagenChange(event: Event, index: number) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecciona un archivo de imagen válido');
      return;
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no debe exceder los 5MB');
      return;
    }

    // Guardar el archivo
    this.imagenesArray.at(index).setValue(file);

    // Generar preview
    const reader = new FileReader();
    reader.onload = () => {
      this.previewImages[index] = reader.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

cargarProductos() {
  this.productoService.getProductos().subscribe({
    next: (data: any) => {
      console.log('DATA CRUDA DEL BACKEND:', data);

      this.productos = data.map((p: any) => {
        console.log('PRODUCTO INDIVIDUAL:', p);

        return {
          ...p,
          esNuevo: p.es_nuevo,
          esOferta: p.es_oferta,
          esDestacado: p.es_destacado,
          precioVenta: p.precio_venta
        };
      });

      console.log('PRODUCTOS MAPEADOS:', this.productos);
    },
    error: (error) => {
      console.error('Error al cargar productos:', error);
    }
  });
}




onSubmit() {
  if (this.productoForm.valid) {
    const formData = new FormData();
    const formValue = this.productoForm.value;
    
    // Agregar campos de texto al FormData
    formData.append('nombre', formValue.nombre);
    formData.append('descripcion', formValue.descripcion);
    formData.append('categoria', formValue.categoria);
    formData.append('marca', formValue.marca || '');

    formData.append('precio_compra', formValue.precioCompra);
    formData.append('precio_venta', formValue.precioVenta);
    formData.append('precio_oferta', formValue.precioOferta || '');

    formData.append('caracteristicas', formValue.caracteristicas || '');
    formData.append('stock', formValue.stock);

    formData.append('es_nuevo', formValue.esNuevo);
    formData.append('es_oferta', formValue.esOferta);
    formData.append('es_destacado', formValue.esDestacado);

    
    // Agregar imágenes nuevas
    for (let i = 0; i < this.imagenesArray.length; i++) {
      const imagen = this.imagenesArray.at(i).value;
      if (imagen instanceof File) {
        formData.append('imagenes', imagen, imagen.name);
      }
    }
    
    // Si estamos editando, enviar las imágenes existentes que se mantienen
    if (this.productoEditando && this.productoEditando.imagenes) {
      formData.append('imagenes_existentes', 
        JSON.stringify(this.productoEditando.imagenes.map((img: string) => img)));
    }
    
    if (this.productoEditando) {
      // Actualizar producto existente
      this.productoService.updateProducto(this.productoEditando.id, formData).subscribe({
        next: (response) => {
          this.resetForm();
          this.cargarProductos();
          alert('Producto actualizado exitosamente');
        },
        error: (error) => {
          console.error('Error al actualizar producto:', error);
          alert('Error al actualizar el producto');
        }
      });
    } else {
      // Crear nuevo producto
      this.productoService.createProducto(formData).subscribe({
        next: (response) => {
          this.resetForm();
          this.cargarProductos();
          alert('Producto creado exitosamente');
        },
        error: (error) => {
          console.error('Error al crear producto:', error);
          alert('Error al crear el producto');
        }
      });
    }
  } else {
    this.markFormGroupTouched(this.productoForm);
    alert('Por favor, completa todos los campos requeridos');
  }
}

  prepareFormData(): FormData {
    const formData = new FormData();
    const formValue = this.productoForm.value;
    
    // Agregar campos de texto
    Object.keys(formValue).forEach(key => {
      if (key !== 'imagenes') {
        formData.append(key, formValue[key]);
      }
    });

    // Agregar imágenes
    for (let i = 0; i < this.imagenesArray.length; i++) {
      const imagen = this.imagenesArray.at(i).value;
      if (imagen instanceof File) {
        formData.append(`imagenes[${i}]`, imagen, imagen.name);
      } else if (typeof imagen === 'string') {
        // Si es una URL (editando producto existente)
        formData.append(`imagenesUrls[${i}]`, imagen);
      }
    }

    // Si estamos editando, agregar el ID
    if (this.productoEditando) {
      formData.append('id', this.productoEditando.id);
    }

    return formData;
  }

  editarProducto(producto: any) {
    this.productoEditando = producto;
    
    // Limpiar arrays existentes
    while (this.imagenesArray.length !== 0) {
      this.imagenesArray.removeAt(0);
    }
    this.previewImages = [];
    
    // Cargar datos del producto en el formulario
    this.productoForm.patchValue({
      nombre: producto.nombre,
      categoria: producto.categoria || '',
      descripcion: producto.descripcion,
      caracteristicas: producto.caracteristicas || '',
      precioCompra: producto.precioCompra || producto.precio,
      precioVenta: producto.precioVenta || producto.precio,
      precioOferta: producto.precioOferta || '',
      stock: producto.stock,
      marca: producto.marca || '',
      esNuevo: producto.esNuevo !== undefined ? producto.esNuevo : true,
      esOferta: producto.esOferta || false,
      esDestacado: producto.esDestacado || false
    });
    
    // Cargar imágenes
    if (producto.imagenes && producto.imagenes.length > 0) {
      producto.imagenes.forEach((imagenUrl: string, index: number) => {
        if (index < this.maxImages) {
          this.addImagenControl();
          this.imagenesArray.at(index).setValue(imagenUrl);
          this.previewImages[index] = imagenUrl;
        }
      });
    }
    
    // Scroll al formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  eliminarProducto(id: number) {
    if (confirm('¿Está seguro de eliminar este producto? Esta acción no se puede deshacer.')) {
      this.productoService.deleteProducto(id).subscribe({
        next: () => {
          this.cargarProductos();
          this.showSuccessMessage('Producto eliminado exitosamente');
        },
        error: (error) => {
          console.error('Error al eliminar producto:', error);
          this.showErrorMessage('Error al eliminar el producto');
        }
      });
    }
  }

  resetForm() {
    this.productoForm.reset({
      esNuevo: true,
      esOferta: false,
      esDestacado: false
    });
    this.productoEditando = null;
    this.previewImages = [];
    
    // Limpiar array de imágenes
    while (this.imagenesArray.length !== 0) {
      this.imagenesArray.removeAt(0);
    }
    
    // Añadir un slot inicial para imágenes
    setTimeout(() => {
      this.addImagenControl();
    }, 100);
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
      if (control instanceof FormArray) {
        control.controls.forEach(arrayControl => {
          if (arrayControl instanceof FormGroup) {
            this.markFormGroupTouched(arrayControl);
          } else {
            arrayControl.markAsTouched();
          }
        });
      }
    });
  }

  private showSuccessMessage(message: string) {
    // Puedes implementar un toast o alert más elegante aquí
    alert(message);
  }

  private showErrorMessage(message: string) {
    // Puedes implementar un toast o alert más elegante aquí
    alert(message);
  }
}