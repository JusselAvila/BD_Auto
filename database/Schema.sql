
CREATE DATABASE [Avila's Tyre Company]

USE [Avila's Tyre Company];
GO

-- =================================================================
-- SECCION 1: USUARIOS Y CLIENTES
-- =================================================================

CREATE TABLE Roles (
    RolID INT PRIMARY KEY IDENTITY(1,1),
    NombreRol NVARCHAR(50) NOT NULL UNIQUE,
    Descripcion NVARCHAR(255)
);

CREATE TABLE Permisos (
    PermisoID INT PRIMARY KEY IDENTITY(1,1),
    NombrePermiso NVARCHAR(50) NOT NULL UNIQUE, 
    CodigoInterno NVARCHAR(50) NOT NULL UNIQUE  
);

CREATE TABLE RolPermisos (
    RolID INT NOT NULL,
    PermisoID INT NOT NULL,
    PRIMARY KEY (RolID, PermisoID),
    FOREIGN KEY (RolID) REFERENCES Roles(RolID),
    FOREIGN KEY (PermisoID) REFERENCES Permisos(PermisoID)
);

CREATE TABLE Usuarios (
    UsuarioID INT PRIMARY KEY IDENTITY(1,1),
    Email NVARCHAR(100) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    RolID INT NOT NULL,
    FechaRegistro DATETIME DEFAULT GETDATE(),
    Activo BIT DEFAULT 1,
    FOREIGN KEY (RolID) REFERENCES Roles(RolID)
);

CREATE TABLE Clientes (
    ClienteID INT PRIMARY KEY IDENTITY(1,1),
    UsuarioID INT NULL,
    NumeroDocumento NVARCHAR(20) NOT NULL UNIQUE,
    TipoDocumento NVARCHAR(20) NOT NULL,
    TipoCliente NVARCHAR(20) NOT NULL,
    Telefono NVARCHAR(20),
    FOREIGN KEY (UsuarioID) REFERENCES Usuarios(UsuarioID),
    CONSTRAINT CK_TipoCliente CHECK (TipoCliente IN ('Persona', 'Empresa'))
);

CREATE TABLE Personas (
    ClienteID INT PRIMARY KEY,
    Nombres NVARCHAR(100) NOT NULL,
    ApellidoPaterno NVARCHAR(100) NOT NULL,
    ApellidoMaterno NVARCHAR(100) NULL,
    FechaNacimiento DATE NULL,
    FOREIGN KEY (ClienteID) REFERENCES Clientes(ClienteID)
);

CREATE TABLE Empresas (
    ClienteID INT PRIMARY KEY,
    RazonSocial NVARCHAR(255) NOT NULL,
    NombreComercial NVARCHAR(255) NULL,
    FOREIGN KEY (ClienteID) REFERENCES Clientes(ClienteID)
); 


-- =================================================================
-- SECCION 2: GEOGRAFIA
-- =================================================================

CREATE TABLE Departamentos (
    DepartamentoID INT PRIMARY KEY IDENTITY(1,1),
    NombreDepartamento NVARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE Ciudades (
    CiudadID INT PRIMARY KEY IDENTITY(1,1),
    DepartamentoID INT NOT NULL,
    NombreCiudad NVARCHAR(100) NOT NULL,
    FOREIGN KEY (DepartamentoID) REFERENCES Departamentos(DepartamentoID)
);

CREATE TABLE Direcciones (
    DireccionID INT PRIMARY KEY IDENTITY(1,1),
    ClienteID INT NOT NULL,
    NombreDireccion NVARCHAR(50),
    Calle NVARCHAR(255) NOT NULL,
    Zona NVARCHAR(100),
    CiudadID INT NOT NULL,
    Referencia NVARCHAR(255),
    EsPrincipal BIT DEFAULT 0,
    Activo BIT DEFAULT 1, 
    FOREIGN KEY (ClienteID) REFERENCES Clientes(ClienteID),
    FOREIGN KEY (CiudadID) REFERENCES Ciudades(CiudadID)
);

-- =================================================================
-- SECCION 3: PRODUCTOS Y CATALOGO
-- =================================================================

CREATE TABLE Categorias (
    CategoriaID INT PRIMARY KEY IDENTITY(1,1),
    NombreCategoria NVARCHAR(100) NOT NULL UNIQUE,
    Descripcion NVARCHAR(255) NULL,
    ImagenURL NVARCHAR(500) NULL,
    Activo BIT DEFAULT 1
);

CREATE TABLE Marcas (
    MarcaID INT PRIMARY KEY IDENTITY(1,1),
    NombreMarca NVARCHAR(100) NOT NULL UNIQUE,
    PaisOrigen NVARCHAR(50) NULL, 
    LogoURL NVARCHAR(500) NULL,
    Activo BIT DEFAULT 1
);





CREATE TABLE Productos (
    ProductoID INT PRIMARY KEY IDENTITY(1,1),
    CodigoProducto NVARCHAR(50) NOT NULL UNIQUE,
    NombreProducto NVARCHAR(200) NOT NULL,
    Descripcion NVARCHAR(1000),
    CategoriaID INT NULL,
    MarcaID INT NULL,
    Ancho INT NULL,
    Perfil INT NULL,
    DiametroRin INT NULL,
    IndiceCarga NVARCHAR(10) NULL,
    IndiceVelocidad NVARCHAR(5) NULL,
    PrecioCompraBs DECIMAL(10,2) NOT NULL,
    PrecioVentaBs DECIMAL(10,2) NOT NULL,
    StockMinimo INT DEFAULT 5,
    StockActual INT DEFAULT 0,
    Activo BIT DEFAULT 1,
    Destacado BIT DEFAULT 0,
    FechaCreacion DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (CategoriaID) REFERENCES Categorias(CategoriaID),
    FOREIGN KEY (MarcaID) REFERENCES Marcas(MarcaID),
    CONSTRAINT CK_PrecioVenta CHECK (PrecioVentaBs >= PrecioCompraBs),
    CONSTRAINT CK_StockActual CHECK (StockActual >= 0)
);

CREATE TABLE ProductoImagenes (
    ImagenID INT PRIMARY KEY IDENTITY(1,1),
    ProductoID INT NOT NULL,
    ImagenURL NVARCHAR(500) NOT NULL,
    TipoImagen NVARCHAR(20) DEFAULT 'Galeria',
    Orden INT DEFAULT 0,
    FOREIGN KEY (ProductoID) REFERENCES Productos(ProductoID)
);

-- =================================================================
-- SECCION 4: COMPATIBILIDAD DE VEHICULOS
-- =================================================================

CREATE TABLE Vehiculo_Marcas (
    MarcaVehiculoID INT PRIMARY KEY IDENTITY(1,1),
    Nombre NVARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE Vehiculo_Modelos (
    ModeloVehiculoID INT PRIMARY KEY IDENTITY(1,1),
    MarcaVehiculoID INT NOT NULL,
    NombreModelo NVARCHAR(100) NOT NULL,
    FOREIGN KEY (MarcaVehiculoID) REFERENCES Vehiculo_Marcas(MarcaVehiculoID)
);

CREATE TABLE Vehiculo_Versiones (
    VersionVehiculoID INT PRIMARY KEY IDENTITY(1,1),
    ModeloVehiculoID INT NOT NULL,
    NombreVersion NVARCHAR(100),
    Anio INT NOT NULL,
    FOREIGN KEY (ModeloVehiculoID) REFERENCES Vehiculo_Modelos(ModeloVehiculoID)
);

CREATE TABLE Llantas_Compatibilidad (
    CompatibilidadID INT PRIMARY KEY IDENTITY(1,1),
    ProductoID INT NOT NULL,
    VersionVehiculoID INT NOT NULL,
    Posicion NVARCHAR(50), 
    Observacion NVARCHAR(255),
    FOREIGN KEY (ProductoID) REFERENCES Productos(ProductoID),
    FOREIGN KEY (VersionVehiculoID) REFERENCES Vehiculo_Versiones(VersionVehiculoID)
);

-- =================================================================
-- SECCION 5: PROMOCIONES Y DESCUENTOS
-- =================================================================

CREATE TABLE Promociones (
    PromocionID INT PRIMARY KEY IDENTITY(1,1),
    NombrePromocion NVARCHAR(150) NOT NULL, 
    Descripcion NVARCHAR(500) NULL,
    TipoDescuento NVARCHAR(20) NOT NULL,
    ValorDescuento DECIMAL(10,2) NOT NULL,
    FechaInicio DATETIME NOT NULL,
    FechaFin DATETIME NOT NULL,
    Activa BIT DEFAULT 1,
    CONSTRAINT CK_TipoDescuentoPromo CHECK (TipoDescuento IN ('PORCENTAJE', 'MONTO_FIJO', '4X3')), 
    CONSTRAINT CK_FechasPromocion CHECK (FechaFin > FechaInicio)
);

CREATE TABLE ProductosEnPromocion (
    ProductoPromocionID INT PRIMARY KEY IDENTITY(1,1),
    PromocionID INT NOT NULL,
    ProductoID INT NOT NULL,
    FOREIGN KEY (PromocionID) REFERENCES Promociones(PromocionID),
    FOREIGN KEY (ProductoID) REFERENCES Productos(ProductoID),
    CONSTRAINT UQ_Promocion_Producto UNIQUE (PromocionID, ProductoID)
);


CREATE TABLE Cupones (
    CuponID INT PRIMARY KEY IDENTITY(1,1),
    CodigoCupon NVARCHAR(50) NOT NULL UNIQUE,
    Descripcion NVARCHAR(255) NULL,
    TipoDescuento NVARCHAR(20) NOT NULL,
    ValorDescuento DECIMAL(10,2) NOT NULL,
    MontoMinCompra DECIMAL(10,2) DEFAULT 0, 
    UsosMaximos INT NULL,
    UsosActuales INT DEFAULT 0,
    FechaInicio DATETIME NOT NULL,
    FechaExpiracion DATETIME NOT NULL,
    Activo BIT DEFAULT 1,
    CONSTRAINT CK_TipoDescuentoCupon CHECK (TipoDescuento IN ('PORCENTAJE', 'MONTO_FIJO'))
);

-- =================================================================
-- SECCION 6: PROCESO DE VENTA
-- =================================================================

CREATE TABLE EstadosPedido (
    EstadoID INT PRIMARY KEY IDENTITY(1,1),
    NombreEstado NVARCHAR(50) NOT NULL UNIQUE,
    Descripcion NVARCHAR(255), -- ✅ AGREGADO
    Orden INT NOT NULL
);

CREATE TABLE MetodosPago (
    MetodoPagoID INT PRIMARY KEY IDENTITY(1,1),
    NombreMetodo NVARCHAR(50) NOT NULL UNIQUE,
    Descripcion NVARCHAR(255), 
    Activo BIT DEFAULT 1
);

CREATE TABLE Ventas (
    VentaID INT PRIMARY KEY IDENTITY(1,1),
    NumeroFactura NVARCHAR(50) NOT NULL UNIQUE,
    ClienteID INT NOT NULL,
    DireccionEnvioID INT NOT NULL,
    FechaVenta DATETIME DEFAULT GETDATE(),
    SubtotalVentaBs DECIMAL(12,2) NOT NULL,
    DescuentoPromocionBs DECIMAL(12,2) DEFAULT 0, 
    DescuentoCuponBs DECIMAL(12,2) DEFAULT 0, 
    CostoEnvioBs DECIMAL(10,2) DEFAULT 0,
    TotalVentaBs DECIMAL(12,2) NOT NULL,
    MetodoPagoID INT NOT NULL,
    EstadoID INT NOT NULL,
    CuponID INT NULL,
    CodigoSeguimiento NVARCHAR(100),
    Observaciones NVARCHAR(500),
    FOREIGN KEY (ClienteID) REFERENCES Clientes(ClienteID),
    FOREIGN KEY (DireccionEnvioID) REFERENCES Direcciones(DireccionID),
    FOREIGN KEY (MetodoPagoID) REFERENCES MetodosPago(MetodoPagoID),
    FOREIGN KEY (EstadoID) REFERENCES EstadosPedido(EstadoID),
    FOREIGN KEY (CuponID) REFERENCES Cupones(CuponID)
);

CREATE TABLE DetalleVentas (
    DetalleVentaID INT PRIMARY KEY IDENTITY(1,1),
    VentaID INT NOT NULL,
    ProductoID INT NOT NULL,
    Cantidad INT NOT NULL,
    PrecioUnitarioBs DECIMAL(10,2) NOT NULL,
    DescuentoBs DECIMAL(10,2) DEFAULT 0, 
    SubtotalBs DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (VentaID) REFERENCES Ventas(VentaID),
    FOREIGN KEY (ProductoID) REFERENCES Productos(ProductoID),
    CONSTRAINT CK_CantidadVenta CHECK (Cantidad > 0)
);

CREATE TABLE HistorialEstadoPedido (
    HistorialID INT PRIMARY KEY IDENTITY(1,1),
    VentaID INT NOT NULL,
    EstadoID INT NOT NULL,
    FechaCambio DATETIME DEFAULT GETDATE(),
    Comentario NVARCHAR(500),
    UsuarioID INT, 
    FOREIGN KEY (VentaID) REFERENCES Ventas(VentaID),
    FOREIGN KEY (EstadoID) REFERENCES EstadosPedido(EstadoID),
    FOREIGN KEY (UsuarioID) REFERENCES Usuarios(UsuarioID) 
);

-- =================================================================
-- SECCION 7: INVENTARIO Y COMPRAS 
-- =================================================================

CREATE TABLE Proveedores (
    ProveedorID INT PRIMARY KEY IDENTITY(1,1),
    NombreProveedor NVARCHAR(150) NOT NULL,
    NIT NVARCHAR(20) UNIQUE,
    Telefono NVARCHAR(20),
    Email NVARCHAR(100),
    Direccion NVARCHAR(255),
    CiudadID INT, 
    ContactoNombre NVARCHAR(200),
    ContactoTelefono NVARCHAR(20),
    Activo BIT DEFAULT 1,
    FOREIGN KEY (CiudadID) REFERENCES Ciudades(CiudadID) 
);

CREATE TABLE EstadosCompra (
    EstadoCompraID INT PRIMARY KEY IDENTITY(1,1),
    NombreEstado NVARCHAR(50) NOT NULL UNIQUE,
    Descripcion NVARCHAR(255),
    Orden INT NOT NULL 
);

CREATE TABLE Compras (
    CompraID INT PRIMARY KEY IDENTITY(1,1),
    NumeroCompra NVARCHAR(50) NOT NULL UNIQUE, 
    ProveedorID INT NOT NULL,
    UsuarioID INT NOT NULL, 
    FechaCompra DATETIME DEFAULT GETDATE(),
    TotalCompraBs DECIMAL(12,2) NOT NULL,
    EstadoCompraID INT NOT NULL DEFAULT 1, 
    Observaciones NVARCHAR(500),
    FOREIGN KEY (ProveedorID) REFERENCES Proveedores(ProveedorID),
    FOREIGN KEY (UsuarioID) REFERENCES Usuarios(UsuarioID),
    FOREIGN KEY (EstadoCompraID) REFERENCES EstadosCompra(EstadoCompraID)
);

CREATE TABLE DetalleCompras (
    DetalleCompraID INT PRIMARY KEY IDENTITY(1,1),
    CompraID INT NOT NULL,
    ProductoID INT NOT NULL,
    Cantidad INT NOT NULL,
    PrecioUnitarioBs DECIMAL(10,2) NOT NULL,
    SubtotalBs DECIMAL(12,2) NOT NULL,
    
    FOREIGN KEY (CompraID) REFERENCES Compras(CompraID),
    FOREIGN KEY (ProductoID) REFERENCES Productos(ProductoID),
    CONSTRAINT CK_CantidadCompra CHECK (Cantidad > 0)
);

CREATE TABLE HistorialEstadoCompra (
    HistorialID INT PRIMARY KEY IDENTITY(1,1),
    CompraID INT NOT NULL,
    EstadoID INT NOT NULL,
    FechaCambio DATETIME DEFAULT GETDATE(),
    UsuarioID INT, 
    Comentario NVARCHAR(500),
    FOREIGN KEY (CompraID) REFERENCES Compras(CompraID),
    FOREIGN KEY (EstadoID) REFERENCES EstadosCompra(EstadoCompraID),
    FOREIGN KEY (UsuarioID) REFERENCES Usuarios(UsuarioID)
);

CREATE TABLE TiposMovimiento (
    TipoMovimientoID INT PRIMARY KEY IDENTITY(1,1),
    NombreTipo NVARCHAR(50) NOT NULL UNIQUE,
    AfectaStock NVARCHAR(20) NOT NULL,
    Descripcion NVARCHAR(255) 
);

CREATE TABLE MovimientosStock (
    MovimientoID INT PRIMARY KEY IDENTITY(1,1),
    ProductoID INT NOT NULL,
    TipoMovimientoID INT NOT NULL,
    Cantidad INT NOT NULL,
    StockAnterior INT NOT NULL DEFAULT 0, 
    StockNuevo INT NOT NULL DEFAULT 0, 
    FechaMovimiento DATETIME DEFAULT GETDATE(),
    UsuarioID INT NOT NULL,
    ReferenciaTabla NVARCHAR(50), 
    ReferenciaID INT,
    Observaciones NVARCHAR(500),
    FOREIGN KEY (ProductoID) REFERENCES Productos(ProductoID),
    FOREIGN KEY (TipoMovimientoID) REFERENCES TiposMovimiento(TipoMovimientoID),
    FOREIGN KEY (UsuarioID) REFERENCES Usuarios(UsuarioID),
    CONSTRAINT CK_CantidadMovimiento CHECK (Cantidad > 0)
);

-- =================================================================
-- SECCION 8: DEVOLUCIONES
-- =================================================================

CREATE TABLE EstadosDevolucion (
    EstadoID INT PRIMARY KEY IDENTITY(1,1),
    NombreEstado NVARCHAR(50) NOT NULL UNIQUE,
    Descripcion NVARCHAR(255), 
    Orden INT NOT NULL 
);

CREATE TABLE Devoluciones (
    DevolucionID INT PRIMARY KEY IDENTITY(1,1),
    VentaID INT NOT NULL,
    ClienteID INT NOT NULL,
    FechaSolicitud DATETIME DEFAULT GETDATE(),
    Motivo NVARCHAR(500) NOT NULL,
    EstadoID INT NOT NULL DEFAULT 1, 
    TotalReembolsoBs DECIMAL(12,2) NULL,
    FechaResolucion DATETIME, 
    UsuarioAprobador INT, 
    FOREIGN KEY (VentaID) REFERENCES Ventas(VentaID),
    FOREIGN KEY (ClienteID) REFERENCES Clientes(ClienteID),
    FOREIGN KEY (UsuarioAprobador) REFERENCES Usuarios(UsuarioID),
    FOREIGN KEY (EstadoID) REFERENCES EstadosDevolucion(EstadoID) 
);

CREATE TABLE DetalleDevoluciones (
    DetalleDevolucionID INT PRIMARY KEY IDENTITY(1,1),
    DevolucionID INT NOT NULL,
    ProductoID INT NOT NULL,
    CantidadDevuelta INT NOT NULL,
    PrecioUnitarioBs DECIMAL(10,2) NOT NULL,
    SubtotalReembolsoBs DECIMAL(12,2) NOT NULL,
    CondicionProducto NVARCHAR(50), 
    
    FOREIGN KEY (DevolucionID) REFERENCES Devoluciones(DevolucionID),
    FOREIGN KEY (ProductoID) REFERENCES Productos(ProductoID),
    CONSTRAINT CK_CantidadDevuelta CHECK (CantidadDevuelta > 0)
);

CREATE TABLE HistorialEstadoDevolucion (
    HistorialDevolucionID INT PRIMARY KEY IDENTITY(1,1),
    DevolucionID INT NOT NULL, 
    EstadoID INT NOT NULL,    
    FechaCambio DATETIME DEFAULT GETDATE(),
    Comentario NVARCHAR(500), 
    UsuarioID INT,
    FOREIGN KEY (DevolucionID) REFERENCES Devoluciones(DevolucionID),
    FOREIGN KEY (EstadoID) REFERENCES EstadosDevolucion(EstadoID),
    FOREIGN KEY (UsuarioID) REFERENCES Usuarios(UsuarioID)
);

-- =================================================================
-- SECCION 9: AUDITORIA 
-- =================================================================

CREATE TABLE Auditoria (
    AuditoriaID INT PRIMARY KEY IDENTITY(1,1),
    NombreTabla NVARCHAR(100) NOT NULL,
    TipoOperacion NVARCHAR(20) NOT NULL,
    UsuarioDB NVARCHAR(100) DEFAULT SYSTEM_USER,
    FechaHora DATETIME DEFAULT GETDATE(),
    RegistroID INT,
    ValoresAnteriores NVARCHAR(MAX),
    ValoresNuevos NVARCHAR(MAX),
    Descripcion NVARCHAR(500)
);

GO