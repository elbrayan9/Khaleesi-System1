// Datos iniciales para el negocio (usados si no hay nada en localStorage)
export const initialDatosNegocio = {
    nombre: 'Mi Negocio (Configurable)',
    direccion: 'Dirección (Configurable)',
    cuit: 'XX-XXXXXXXX-X'
};

// Datos iniciales de productos (usados si no hay nada en localStorage)
export const initialProductos = [
    { id: 1, nombre: "Producto A", codigoBarras: "7790010001234", precio: 150.75, stock: 50 },
    { id: 2, nombre: "Producto B", codigoBarras: "7790020005678", precio: 80.00, stock: 100 },
    { id: 3, nombre: "Producto C", codigoBarras: "7790030009012", precio: 220.50, stock: 30 }
];

// Datos iniciales de clientes (usados si no hay nada en localStorage)
export const initialClientes = [
    { id: 1, nombre: "Cliente Ejemplo 1", cuit: "20-12345678-9" },
    { id: 2, nombre: "Empresa XYZ S.A.", cuit: "30-98765432-1" },
    { id: 3, nombre: "Juan Perez", cuit: "23-33444555-7" }
];

// Puedes añadir más datos iniciales aquí si es necesario (ej: para egresos, etc.)
// export const initialEgresos = [];
