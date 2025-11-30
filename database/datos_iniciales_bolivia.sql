-- =============================================
-- DATOS INICIALES - AVILA'S TYRE COMPANY
-- Bolivia - Santa Cruz de la Sierra
-- =============================================

USE [Avila's Tyre Company];
GO



-- =============================================
-- ROLES Y PERMISOS
-- =============================================

-- Roles
SET IDENTITY_INSERT Roles ON;
INSERT INTO Roles (RolID, NombreRol, Descripcion) VALUES
(1, 'Admin', 'Administrador con poder absoluto sobre el sistema'),
(2, 'Cliente', 'Cliente regular del sistema'),
(3, 'Vendedor', 'Personal de ventas'),
(4, 'Almacenero', 'Encargado de inventario y stock');
SET IDENTITY_INSERT Roles OFF;

-- Permisos
SET IDENTITY_INSERT Permisos ON;
INSERT INTO Permisos (PermisoID, NombrePermiso, CodigoInterno) VALUES
(1, 'Ver Ventas', 'ventas.ver'),
(2, 'Crear Ventas', 'ventas.crear'),
(3, 'Gestionar Productos', 'productos.gestionar'),
(4, 'Gestionar Usuarios', 'usuarios.gestionar'),
(5, 'Ver Reportes', 'reportes.ver'),
(6, 'Gestionar Inventario', 'inventario.gestionar');
SET IDENTITY_INSERT Permisos OFF;

-- Asignar permisos a roles
INSERT INTO RolPermisos (RolID, PermisoID) VALUES
-- Admin tiene todos los permisos
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6),
-- Cliente solo puede crear ventas
(2, 2),
-- Vendedor puede ver y crear ventas
(3, 1), (3, 2),
-- Almacenero gestiona inventario
(4, 3), (4, 6);

-- =============================================
-- GEOGRAFÍA DE BOLIVIA
-- =============================================


-- Departamentos de Bolivia
SET IDENTITY_INSERT Departamentos ON;
INSERT INTO Departamentos (DepartamentoID, NombreDepartamento) VALUES
(1, 'Santa Cruz'),
(2, 'La Paz'),
(3, 'Cochabamba'),
(4, 'Tarija'),
(5, 'Chuquisaca'),
(6, 'Oruro'),
(7, 'Potosí'),
(8, 'Beni'),
(9, 'Pando');
SET IDENTITY_INSERT Departamentos OFF;

-- Ciudades de Santa Cruz (principales)
SET IDENTITY_INSERT Ciudades ON;
INSERT INTO Ciudades (CiudadID, DepartamentoID, NombreCiudad) VALUES
-- Santa Cruz
(1, 1, 'Santa Cruz de la Sierra'),
(2, 1, 'Montero'),
(3, 1, 'Warnes'),
(4, 1, 'La Guardia'),
(5, 1, 'Cotoca'),
(6, 1, 'El Torno'),
(7, 1, 'Camiri'),
-- La Paz
(8, 2, 'La Paz'),
(9, 2, 'El Alto'),
-- Cochabamba
(10, 3, 'Cochabamba'),
(11, 3, 'Quillacollo'),
(12, 3, 'Sacaba'),
-- Tarija
(13, 4, 'Tarija'),
-- Chuquisaca
(14, 5, 'Sucre'),
-- Oruro
(15, 6, 'Oruro'),
-- Potosí
(16, 7, 'Potosí'),
-- Beni
(17, 8, 'Trinidad'),
-- Pando
(18, 9, 'Cobija');
SET IDENTITY_INSERT Ciudades OFF;

-- =============================================
-- USUARIOS Y CLIENTES DE PRUEBA
-- =============================================

PRINT 'Insertando usuarios de prueba...';
GO

-- Usuario Admin (password: admin123)
SET IDENTITY_INSERT Usuarios ON;
INSERT INTO Usuarios (UsuarioID, Email, PasswordHash, RolID, Activo) VALUES
(1, 'admin@avilastyres.com', '$2b$10$rKHpKCQxFPwLZqm5D3R9B.tM8nLwGT6ZH2KvO/xVQJ8rlMGX0Vsey', 1, 1);
SET IDENTITY_INSERT Usuarios OFF;

-- Cliente Persona de prueba (password: cliente123)
SET IDENTITY_INSERT Usuarios ON;
INSERT INTO Usuarios (UsuarioID, Email, PasswordHash, RolID, Activo) VALUES
(2, 'carlos.mendoza@gmail.com', '$2b$10$rKHpKCQxFPwLZqm5D3R9B.tM8nLwGT6ZH2KvO/xVQJ8rlMGX0Vsey', 2, 1);
SET IDENTITY_INSERT Usuarios OFF;

SET IDENTITY_INSERT Clientes ON;
INSERT INTO Clientes (ClienteID, UsuarioID, NumeroDocumento, TipoDocumento, TipoCliente, Telefono) VALUES
(1, 2, '7856432', 'CI', 'Persona', '78945612');
SET IDENTITY_INSERT Clientes OFF;

INSERT INTO Personas (ClienteID, Nombres, ApellidoPaterno, ApellidoMaterno, FechaNacimiento) VALUES
(1, 'Carlos Alberto', 'Mendoza', 'Rojas', '1990-05-15');

-- Cliente Empresa de prueba (password: empresa123)
SET IDENTITY_INSERT Usuarios ON;
INSERT INTO Usuarios (UsuarioID, Email, PasswordHash, RolID, Activo) VALUES
(3, 'contacto@transportescruz.com', '$2b$10$rKHpKCQxFPwLZqm5D3R9B.tM8nLwGT6ZH2KvO/xVQJ8rlMGX0Vsey', 2, 1);
SET IDENTITY_INSERT Usuarios OFF;

SET IDENTITY_INSERT Clientes ON;
INSERT INTO Clientes (ClienteID, UsuarioID, NumeroDocumento, TipoDocumento, TipoCliente, Telefono) VALUES
(2, 3, '123456789', 'NIT', 'Empresa', '33456789');
SET IDENTITY_INSERT Clientes OFF;

INSERT INTO Empresas (ClienteID, RazonSocial, NombreComercial) VALUES
(2, 'Transportes Cruz S.R.L.', 'Transportes Cruz');

-- Direcciones de prueba para Carlos Mendoza
SET IDENTITY_INSERT Direcciones ON;
INSERT INTO Direcciones (DireccionID, ClienteID, NombreDireccion, Calle, Zona, CiudadID, Referencia, EsPrincipal, Activo) VALUES
(1, 1, 'Casa', 'Av. Santos Dumont #456', 'Equipetrol', 1, 'Cerca del 4to anillo', 1, 1),
(2, 1, 'Trabajo', 'Calle Libertad #123', 'Centro', 1, 'Al lado del Banco Unión', 0, 1);
SET IDENTITY_INSERT Direcciones OFF;

-- =============================================
-- CATEGORÍAS Y MARCAS
-- =============================================

PRINT 'Insertando categorías y marcas...';
GO

-- Categorías
SET IDENTITY_INSERT Categorias ON;
INSERT INTO Categorias (CategoriaID, NombreCategoria, Descripcion, Activo) VALUES
(1, 'Llantas para Autos', 'Llantas para vehículos livianos', 1),
(2, 'Llantas para Camionetas', 'Llantas para camionetas 4x4 y pickups', 1),
(3, 'Llantas para Camiones', 'Llantas para transporte pesado', 1),
(4, 'Servicios', 'Servicios de mantenimiento y reparación', 1),
(5, 'Accesorios', 'Accesorios y herramientas', 1);
SET IDENTITY_INSERT Categorias OFF;

-- Marcas de llantas
SET IDENTITY_INSERT Marcas ON;
INSERT INTO Marcas (MarcaID, NombreMarca, PaisOrigen, Activo) VALUES
(1, 'Michelin', 'Francia', 1),
(2, 'Bridgestone', 'Japón', 1),
(3, 'Goodyear', 'Estados Unidos', 1),
(4, 'Continental', 'Alemania', 1),
(5, 'Pirelli', 'Italia', 1),
(6, 'Yokohama', 'Japón', 1),
(7, 'BFGoodrich', 'Estados Unidos', 1),
(8, 'Firestone', 'Estados Unidos', 1),
(9, 'Hankook', 'Corea del Sur', 1),
(10, 'Kumho', 'Corea del Sur', 1);
SET IDENTITY_INSERT Marcas OFF;

-- =============================================
-- VEHÍCULOS - MARCAS, MODELOS Y VERSIONES
-- =============================================

PRINT 'Insertando datos de vehículos populares en Bolivia...';
GO

-- Marcas de vehículos populares en Bolivia
SET IDENTITY_INSERT Vehiculo_Marcas ON;
INSERT INTO Vehiculo_Marcas (MarcaVehiculoID, Nombre) VALUES
(1, 'Toyota'),
(2, 'Nissan'),
(3, 'Ford'),
(4, 'Chevrolet'),
(5, 'Hyundai'),
(6, 'Suzuki'),
(7, 'Kia'),
(8, 'Mitsubishi'),
(9, 'Honda'),
(10, 'Volkswagen');
SET IDENTITY_INSERT Vehiculo_Marcas OFF;

-- Modelos populares
SET IDENTITY_INSERT Vehiculo_Modelos ON;
INSERT INTO Vehiculo_Modelos (ModeloVehiculoID, MarcaVehiculoID, NombreModelo) VALUES
-- Toyota
(1, 1, 'Hilux'),
(2, 1, 'Land Cruiser'),
(3, 1, 'Corolla'),
(4, 1, 'RAV4'),
(5, 1, 'Prado'),
-- Nissan
(6, 2, 'Frontier'),
(7, 2, 'Sentra'),
(8, 2, 'X-Trail'),
-- Ford
(9, 3, 'Ranger'),
(10, 3, 'F-150'),
(11, 3, 'Explorer'),
-- Chevrolet
(12, 4, 'Silverado'),
(13, 4, 'D-MAX'),
(14, 4, 'Cruze'),
-- Hyundai
(15, 5, 'Tucson'),
(16, 5, 'Santa Fe'),
-- Suzuki (muy popular en Bolivia)
(17, 6, 'Vitara'),
(18, 6, 'Grand Vitara'),
(19, 6, 'Jimny');
SET IDENTITY_INSERT Vehiculo_Modelos OFF;

-- Versiones (ejemplos)
SET IDENTITY_INSERT Vehiculo_Versiones ON;
INSERT INTO Vehiculo_Versiones (VersionVehiculoID, ModeloVehiculoID, NombreVersion, Anio) VALUES
-- Toyota Hilux
(1, 1, 'SR 4x2', 2023),
(2, 1, 'SRV 4x4', 2023),
(3, 1, 'SR 4x2', 2024),
-- Toyota Land Cruiser
(4, 2, 'VX', 2023),
(5, 2, 'GXR', 2024),
-- Nissan Frontier
(6, 6, 'SE 4x2', 2023),
(7, 6, 'LE 4x4', 2023),
-- Suzuki Vitara (muy común en Santa Cruz)
(8, 17, 'GLX', 2023),
(9, 17, 'GLX 4x4', 2023),
(10, 17, 'GLX', 2024);
SET IDENTITY_INSERT Vehiculo_Versiones OFF;

-- =============================================
-- PRODUCTOS (LLANTAS)
-- =============================================

PRINT 'Insertando productos (llantas)...';
GO



select * from Productos

SET IDENTITY_INSERT Productos ON;
INSERT INTO Productos (
    ProductoID, CodigoProducto, NombreProducto, Descripcion, CategoriaID, MarcaID,
    Ancho, Perfil, DiametroRin, IndiceCarga, IndiceVelocidad,
    PrecioCompraBs, PrecioVentaBs, StockMinimo, StockActual, Activo, Destacado
) VALUES
-- Llantas para camionetas (populares en Santa Cruz)
(1, 'LLN-265-70-16-BFG', 'BFGoodrich All-Terrain T/A KO2 265/70R16', 'Llanta todo terreno ideal para camionetas 4x4', 2, 7, 265, 70, 16, '112', 'S', 850, 1200, 8, 25, 1, 1),
(2, 'LLN-265-70-16-BRI', 'Bridgestone Dueler A/T 265/70R16', 'Excelente tracción en todo terreno', 2, 2, 265, 70, 16, '112', 'T', 750, 1050, 8, 30, 1, 1),
(3, 'LLN-265-65-17-MIC', 'Michelin LTX A/T2 265/65R17', 'Durabilidad superior para camionetas', 2, 1, 265, 65, 17, '112', 'T', 900, 1300, 6, 20, 1, 1),

-- Llantas para autos livianos
(4, 'LLN-195-65-15-GOO', 'Goodyear Assurance 195/65R15', 'Llanta confortable para ciudad', 1, 3, 195, 65, 15, '91', 'H', 400, 600, 10, 40, 1, 0),
(5, 'LLN-205-55-16-MIC', 'Michelin Primacy 4 205/55R16', 'Alto rendimiento y seguridad', 1, 1, 205, 55, 16, '91', 'V', 500, 750, 10, 35, 1, 1),
(6, 'LLN-195-65-15-BRI', 'Bridgestone Turanza T005 195/65R15', 'Bajo ruido y confort', 1, 2, 195, 65, 15, '91', 'H', 420, 650, 10, 45, 1, 0),

-- Llantas para camiones
(7, 'LLN-11R22-5-FIR', 'Firestone FS591 11R22.5', 'Llanta para transporte pesado', 3, 8, 0, 0, 22, '148', 'L', 1800, 2500, 4, 12, 1, 0),
(8, 'LLN-295-80-22-CON', 'Continental HSR 295/80R22.5', 'Alta durabilidad para larga distancia', 3, 4, 295, 80, 22, '152', 'M', 2000, 2800, 4, 10, 1, 0),

-- Llantas Suzuki (populares en Bolivia)
(9, 'LLN-215-60-16-YOK', 'Yokohama BluEarth 215/60R16', 'Ideal para SUVs compactas', 1, 6, 215, 60, 16, '95', 'H', 480, 700, 8, 28, 1, 1),
(10, 'LLN-225-65-17-HAN', 'Hankook Dynapro ATM 225/65R17', 'Todo terreno para Vitara/Jimny', 2, 9, 225, 65, 17, '102', 'S', 650, 950, 8, 22, 1, 1),

-- Servicios
(11, 'SRV-ALINEACION', 'Alineación y Balanceo Computarizado', 'Servicio de alineación y balanceo con equipos modernos', 4, NULL, NULL, NULL, NULL, NULL, NULL, 80, 150, 0, 9999, 1, 0),
(12, 'SRV-ROTACION', 'Rotación de Llantas', 'Rotación profesional para mayor durabilidad', 4, NULL, NULL, NULL, NULL, NULL, NULL, 30, 60, 0, 9999, 1, 0),
(13, 'SRV-VALVULAS', 'Cambio de Válvulas', 'Reemplazo de válvulas y tapones', 4, NULL, NULL, NULL, NULL, NULL, NULL, 10, 25, 0, 9999, 1, 0),

-- Accesorios
(14, 'ACC-KIT-EMERG', 'Kit de Emergencia', 'Kit completo: gato, llave cruz, triángulos', 5, NULL, NULL, NULL, NULL, NULL, NULL, 150, 250, 5, 30, 1, 0),
(15, 'ACC-COMPRESOR', 'Compresor de Aire Portátil 12V', 'Inflador eléctrico para el auto', 5, NULL, NULL, NULL, NULL, NULL, NULL, 200, 350, 5, 25, 1, 0);
SET IDENTITY_INSERT Productos OFF;

-- =============================================
-- COMPATIBILIDAD DE LLANTAS CON VEHÍCULOS
-- =============================================

PRINT 'Insertando compatibilidades...';
GO

SET IDENTITY_INSERT Llantas_Compatibilidad ON;
INSERT INTO Llantas_Compatibilidad (CompatibilidadID, ProductoID, VersionVehiculoID, Posicion, Observacion) VALUES
-- Toyota Hilux (todas las versiones) - 265/70R16
(1, 1, 1, 'Todas', 'Medida original de fábrica'),
(2, 2, 1, 'Todas', 'Alternativa económica'),
(3, 1, 2, 'Todas', 'Ideal para 4x4'),
(4, 2, 2, 'Todas', 'Buen rendimiento'),
(5, 1, 3, 'Todas', 'Medida original'),

-- Toyota Land Cruiser - 265/65R17
(6, 3, 4, 'Todas', 'Medida recomendada'),
(7, 3, 5, 'Todas', 'Alta durabilidad'),

-- Nissan Frontier - 265/70R16
(8, 1, 6, 'Todas', 'Perfecta para todo terreno'),
(9, 2, 6, 'Todas', 'Opción confiable'),
(10, 1, 7, 'Todas', 'Ideal para 4x4'),
(11, 2, 7, 'Todas', 'Buen precio/calidad'),

-- Suzuki Vitara - 215/60R16 y 225/65R17
(12, 9, 8, 'Todas', 'Medida estándar'),
(13, 9, 9, 'Todas', 'Recomendada para ciudad'),
(14, 10, 9, 'Todas', 'Para uso mixto'),
(15, 9, 10, 'Todas', 'Medida original'),
(16, 10, 10, 'Todas', 'Todo terreno ligero');
SET IDENTITY_INSERT Llantas_Compatibilidad OFF;

-- =============================================
-- ESTADOS Y MÉTODOS DE PAGO
-- =============================================

PRINT 'Insertando estados y métodos de pago...';
GO

-- Estados de Pedido
SET IDENTITY_INSERT EstadosPedido ON;
INSERT INTO EstadosPedido (EstadoID, NombreEstado, Descripcion, Orden) VALUES
(1, 'Pendiente', 'Pedido registrado, pendiente de confirmación', 1),
(2, 'Confirmado', 'Pedido confirmado por el cliente', 2),
(3, 'En Preparación', 'Productos siendo preparados', 3),
(4, 'En Camino', 'Pedido en ruta de entrega', 4),
(5, 'Entregado', 'Pedido entregado al cliente', 5),
(6, 'Cancelado', 'Pedido cancelado', 6);
SET IDENTITY_INSERT EstadosPedido OFF;

-- Métodos de Pago (Bolivia)
SET IDENTITY_INSERT MetodosPago ON;
INSERT INTO MetodosPago (MetodoPagoID, NombreMetodo, Descripcion, Activo) VALUES
(1, 'Efectivo', 'Pago en efectivo (Bolivianos)', 1),
(2, 'QR Simple', 'Pago por QR bancario', 1),
(3, 'Transferencia Bancaria', 'Transferencia a cuenta bancaria', 1),
(4, 'Tarjeta de Crédito', 'Pago con tarjeta Visa/Mastercard', 1),
(5, 'Tigo Money', 'Pago con billetera Tigo Money', 1);
SET IDENTITY_INSERT MetodosPago OFF;

-- =============================================
-- TIPOS DE MOVIMIENTO DE STOCK
-- =============================================

SET IDENTITY_INSERT TiposMovimiento ON;
INSERT INTO TiposMovimiento (TipoMovimientoID, NombreTipo, AfectaStock, Descripcion) VALUES
(1, 'VENTA', 'RESTA', 'Venta de producto'),
(2, 'COMPRA', 'SUMA', 'Compra a proveedor'),
(3, 'DEVOLUCION_CLIENTE', 'SUMA', 'Devolución de cliente'),
(4, 'AJUSTE_INVENTARIO', 'VARIABLE', 'Ajuste manual de inventario'),
(5, 'MERMA', 'RESTA', 'Producto dañado o perdido');
SET IDENTITY_INSERT TiposMovimiento OFF;

-- =============================================
-- ESTADOS DE COMPRA Y DEVOLUCIÓN
-- =============================================

SET IDENTITY_INSERT EstadosCompra ON;
INSERT INTO EstadosCompra (EstadoCompraID, NombreEstado, Descripcion, Orden) VALUES
(1, 'Solicitada', 'Compra solicitada al proveedor', 1),
(2, 'Confirmada', 'Proveedor confirmó la compra', 2),
(3, 'En Tránsito', 'Productos en camino', 3),
(4, 'Recibida', 'Productos recibidos y verificados', 4),
(5, 'Cancelada', 'Compra cancelada', 5);
SET IDENTITY_INSERT EstadosCompra OFF;

SET IDENTITY_INSERT EstadosDevolucion ON;
INSERT INTO EstadosDevolucion (EstadoID, NombreEstado, Descripcion, Orden) VALUES
(1, 'Solicitada', 'Cliente solicita devolución', 1),
(2, 'En Revisión', 'Revisando productos devueltos', 2),
(3, 'Aprobada', 'Devolución aprobada', 3),
(4, 'Rechazada', 'Devolución rechazada', 4),
(5, 'Reembolsada', 'Cliente reembolsado', 5);
SET IDENTITY_INSERT EstadosDevolucion OFF;

-- =============================================
-- PROMOCIONES ACTUALES
-- =============================================

PRINT 'Insertando promociones...';
GO

SET IDENTITY_INSERT Promociones ON;
INSERT INTO Promociones (PromocionID, NombrePromocion, Descripcion, TipoDescuento, ValorDescuento, FechaInicio, FechaFin, Activa) VALUES
(1, 'Promoción de Verano', '15% de descuento en llantas todo terreno', 'PORCENTAJE', 15.00, '2024-11-01', '2025-02-28', 1),
(2, 'Combo 4x4', 'Compra 4 llantas y paga 3', '4X3', 0, '2024-12-01', '2025-01-31', 1);
SET IDENTITY_INSERT Promociones OFF;

-- Productos en promoción
SET IDENTITY_INSERT ProductosEnPromocion ON;
INSERT INTO ProductosEnPromocion (ProductoPromocionID, PromocionID, ProductoID) VALUES
(1, 1, 1),
(2, 1, 2),
(3, 1, 3),
(4, 2, 1),
(5, 2, 2);
SET IDENTITY_INSERT ProductosEnPromocion OFF;

-- =============================================
-- CUPONES
-- =============================================

select * from Cupones

SET IDENTITY_INSERT Cupones ON;
INSERT INTO Cupones (CuponID, CodigoCupon, Descripcion, TipoDescuento, ValorDescuento, MontoMinCompra, UsosMaximos, UsosActuales, FechaInicio,FechaExpiracion, Activo) VALUES
(1, 'BIENVENIDA2024', 'Cupón de bienvenida - 10% descuento', 'PORCENTAJE', 10, 500, 100, 0, '2024-11-01', '2025-12-31', 1),
(2, 'CRUCEÑO50', '50 Bs de descuento para Santa Cruz', 'MONTO_FIJO', 50, 300, 200, 0, '2024-11-01', '2025-06-30', 1);
SET IDENTITY_INSERT Cupones OFF;

PRINT '';
PRINT '================================================';
PRINT '✓ DATOS INICIALES INSERTADOS EXITOSAMENTE';
PRINT '================================================';
PRINT 'CREDENCIALES DE PRUEBA:';
PRINT '';
PRINT 'Admin:';
PRINT '  Email: admin@avilastyres.com';
PRINT '  Password: admin123';
PRINT '';
PRINT 'Cliente Persona:';
PRINT '  Email: carlos.mendoza@gmail.com';
PRINT '  Password: cliente123';
PRINT '  CI: 7856432 (Santa Cruz)';
PRINT '';
PRINT 'Cliente Empresa:';
PRINT '  Email: contacto@transportescruz.com';
PRINT '  Password: empresa123';
PRINT '  NIT: 123456789';
PRINT '================================================';
GO
