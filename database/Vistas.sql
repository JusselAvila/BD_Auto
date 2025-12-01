USE [Avila's Tyre Company];
GO

PRINT '============================================================================';
PRINT 'CREANDO VISTAS CON NOMBRES REALES DE COLUMNAS';
PRINT '============================================================================';

-- ============================================================================
-- VISTAS PÚBLICAS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Vista 1: Clientes sin contraseñas
-- ----------------------------------------------------------------------------
IF OBJECT_ID('vw_ClientesPublicos', 'V') IS NOT NULL DROP VIEW vw_ClientesPublicos;
GO

select * from Usuarios


CREATE VIEW vw_ClientesPublicos
AS
SELECT 
    c.ClienteID,
    u.Email,
    c.NumeroDocumento,
    c.TipoDocumento,
    c.TipoCliente,
    c.Telefono,
    u.Activo,
    -- Datos de persona
    p.Nombres,
    p.ApellidoPaterno,
    p.ApellidoMaterno,
    p.FechaNacimiento,
    -- Datos de empresa
    e.RazonSocial,
    e.NombreComercial,
    -- Nombre completo
    CASE 
        WHEN p.ClienteID IS NOT NULL THEN 
            p.Nombres + ' ' + p.ApellidoPaterno + ISNULL(' ' + p.ApellidoMaterno, '')
        WHEN e.ClienteID IS NOT NULL THEN e.NombreComercial
        ELSE 'N/A'
    END AS NombreCompleto
FROM Clientes c
INNER JOIN Usuarios u ON c.UsuarioID = u.UsuarioID
LEFT JOIN Personas p ON c.ClienteID = p.ClienteID
LEFT JOIN Empresas e ON c.ClienteID = e.ClienteID
WHERE u.Activo = 1;
GO
PRINT 'Vista 1: vw_ClientesPublicos - Creada';

-- ----------------------------------------------------------------------------
-- Vista 2: Productos disponibles
-- ----------------------------------------------------------------------------
IF OBJECT_ID('vw_ProductosDisponibles', 'V') IS NOT NULL DROP VIEW vw_ProductosDisponibles;
GO

CREATE VIEW vw_ProductosDisponibles
AS
SELECT 
    p.ProductoID,
    p.CodigoProducto,
    p.NombreProducto,
    p.Descripcion,
    c.NombreCategoria,
    m.NombreMarca,
    p.Ancho,
    p.Perfil,
    p.DiametroRin,
    CASE 
        WHEN p.Ancho IS NOT NULL AND p.Perfil IS NOT NULL AND p.DiametroRin IS NOT NULL THEN
            CAST(p.Ancho AS VARCHAR(10)) + '/' + 
            CAST(p.Perfil AS VARCHAR(10)) + ' R' + 
            CAST(p.DiametroRin AS VARCHAR(10))
        ELSE 'N/A'
    END AS Especificaciones,
    p.IndiceCarga,
    p.IndiceVelocidad,
    p.PrecioVentaBs,
    p.StockActual,
    p.StockMinimo,
    p.Activo,
    p.Destacado,
    CASE 
        WHEN p.StockActual > p.StockMinimo THEN 'Disponible'
        WHEN p.StockActual > 0 THEN 'Poco Stock'
        ELSE 'Agotado'
    END AS EstadoStock
FROM Productos p
INNER JOIN Categorias c ON p.CategoriaID = c.CategoriaID
LEFT JOIN Marcas m ON p.MarcaID = m.MarcaID
WHERE p.Activo = 1 AND p.StockActual > 0;
GO
PRINT 'Vista 2: vw_ProductosDisponibles - Creada';

-- ----------------------------------------------------------------------------
-- Vista 3: Productos en promoción
-- ----------------------------------------------------------------------------
IF OBJECT_ID('vw_ProductosEnPromocion', 'V') IS NOT NULL DROP VIEW vw_ProductosEnPromocion;
GO

CREATE VIEW vw_ProductosEnPromocion
AS
SELECT 
    p.ProductoID,
    p.CodigoProducto,
    p.NombreProducto,
    m.NombreMarca,
    p.PrecioVentaBs AS PrecioOriginal,
    pr.PromocionID,
    pr.NombrePromocion,
    pr.TipoDescuento,
    pr.ValorDescuento,
    pr.FechaInicio,
    pr.FechaFin,
    -- Precio con descuento
    CASE pr.TipoDescuento
        WHEN 'PORCENTAJE' THEN p.PrecioVentaBs - (p.PrecioVentaBs * pr.ValorDescuento / 100)
        WHEN 'MONTO_FIJO' THEN p.PrecioVentaBs - pr.ValorDescuento
        ELSE p.PrecioVentaBs
    END AS PrecioConDescuento,
    -- Ahorro
    CASE pr.TipoDescuento
        WHEN 'PORCENTAJE' THEN p.PrecioVentaBs * pr.ValorDescuento / 100
        WHEN 'MONTO_FIJO' THEN pr.ValorDescuento
        ELSE 0
    END AS Ahorro
FROM Productos p
INNER JOIN ProductosEnPromocion pp ON p.ProductoID = pp.ProductoID
INNER JOIN Promociones pr ON pp.PromocionID = pr.PromocionID
LEFT JOIN Marcas m ON p.MarcaID = m.MarcaID
WHERE p.Activo = 1 
  AND pr.Activa = 1
  AND GETDATE() BETWEEN pr.FechaInicio AND pr.FechaFin;
GO
PRINT 'Vista 3: vw_ProductosEnPromocion - Creada';

-- ----------------------------------------------------------------------------
-- Vista 4: Cupones disponibles
-- ----------------------------------------------------------------------------
IF OBJECT_ID('vw_CuponesDisponibles', 'V') IS NOT NULL DROP VIEW vw_CuponesDisponibles;
GO

CREATE VIEW vw_CuponesDisponibles
AS
SELECT 
    CuponID,
    CodigoCupon,
    Descripcion,
    TipoDescuento,
    ValorDescuento,
    MontoMinCompra,
    UsosMaximos,
    UsosActuales,
    (UsosMaximos - UsosActuales) AS UsosDisponibles,
    FechaInicio,
    FechaExpiracion,
    Activo,
    CASE TipoDescuento
        WHEN 'PORCENTAJE' THEN CAST(ValorDescuento AS VARCHAR(10)) + '% OFF'
        WHEN 'MONTO_FIJO' THEN 'Bs. ' + CAST(ValorDescuento AS VARCHAR(10)) + ' OFF'
        ELSE 'Descuento'
    END AS DescuentoTexto,
    DATEDIFF(DAY, GETDATE(), FechaExpiracion) AS DiasRestantes
FROM Cupones
WHERE Activo = 1
  AND GETDATE() BETWEEN FechaInicio AND FechaExpiracion
  AND UsosActuales < UsosMaximos;
GO
PRINT 'Vista 4: vw_CuponesDisponibles - Creada';

-- ============================================================================
-- VISTAS PARA CLIENTE
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Vista 5: Mis Ventas
-- ----------------------------------------------------------------------------
IF OBJECT_ID('vw_MisVentas', 'V') IS NOT NULL DROP VIEW vw_MisVentas;
GO

CREATE VIEW vw_MisVentas
AS
SELECT 
    v.VentaID,
    v.NumeroFactura,
    v.ClienteID,
    v.FechaVenta,
    v.SubtotalVentaBs,
    v.DescuentoPromocionBs,
    v.DescuentoCuponBs,
    v.TotalVentaBs,
    ep.NombreEstado AS Estado,
    mp.NombreMetodo AS MetodoPago,
    d.Calle + ', ' + d.Zona + ', ' + ci.NombreCiudad AS DireccionEnvio,
    cu.CodigoCupon,
    cu.ValorDescuento AS DescuentoCupon,
    v.Observaciones,
    (SELECT COUNT(*) FROM DetalleVentas WHERE VentaID = v.VentaID) AS TotalProductos,
    (SELECT SUM(Cantidad) FROM DetalleVentas WHERE VentaID = v.VentaID) AS TotalUnidades
FROM Ventas v
INNER JOIN EstadosPedido ep ON v.EstadoID = ep.EstadoID
INNER JOIN MetodosPago mp ON v.MetodoPagoID = mp.MetodoPagoID
INNER JOIN Direcciones d ON v.DireccionEnvioID = d.DireccionID
INNER JOIN Ciudades ci ON d.CiudadID = ci.CiudadID
LEFT JOIN Cupones cu ON v.CuponID = cu.CuponID;
GO
PRINT 'Vista 5: vw_MisVentas - Creada';

-- ----------------------------------------------------------------------------
-- Vista 6: Detalle de mis ventas
-- ----------------------------------------------------------------------------
IF OBJECT_ID('vw_DetalleMisVentas', 'V') IS NOT NULL DROP VIEW vw_DetalleMisVentas;
GO

CREATE VIEW vw_DetalleMisVentas
AS
SELECT 
    dv.DetalleVentaID,
    dv.VentaID,
    v.ClienteID,
    v.FechaVenta,
    p.ProductoID,
    p.CodigoProducto,
    p.NombreProducto,
    m.NombreMarca,
    c.NombreCategoria,
    CASE 
        WHEN p.Ancho IS NOT NULL THEN
            CAST(p.Ancho AS VARCHAR(10)) + '/' + 
            CAST(p.Perfil AS VARCHAR(10)) + ' R' + 
            CAST(p.DiametroRin AS VARCHAR(10))
        ELSE 'N/A'
    END AS Especificaciones,
    dv.Cantidad,
    dv.PrecioUnitarioBs,
    dv.DescuentoBs,
    dv.SubtotalBs,
    ep.NombreEstado AS EstadoVenta
FROM DetalleVentas dv
INNER JOIN Ventas v ON dv.VentaID = v.VentaID
INNER JOIN Productos p ON dv.ProductoID = p.ProductoID
LEFT JOIN Marcas m ON p.MarcaID = m.MarcaID
INNER JOIN Categorias c ON p.CategoriaID = c.CategoriaID
INNER JOIN EstadosPedido ep ON v.EstadoID = ep.EstadoID;
GO
PRINT 'Vista 6: vw_DetalleMisVentas - Creada';

-- ----------------------------------------------------------------------------
-- Vista 7: Mis Devoluciones
-- ----------------------------------------------------------------------------
IF OBJECT_ID('vw_MisDevoluciones', 'V') IS NOT NULL DROP VIEW vw_MisDevoluciones;
GO

CREATE VIEW vw_MisDevoluciones
AS
SELECT 
    d.DevolucionID,
    d.ClienteID,
    d.VentaID,
    v.NumeroFactura,
    d.FechaDevolucion,
    d.Motivo,
    d.TotalReembolsoBs,
    ed.NombreEstado AS Estado,
    v.FechaVenta,
    v.TotalVentaBs AS TotalVentaOriginal,
    DATEDIFF(DAY, v.FechaVenta, d.FechaDevolucion) AS DiasDesdeVenta,
    u.Email AS AprobadoPorEmail
FROM Devoluciones d
INNER JOIN EstadosDevolucion ed ON d.EstadoID = ed.EstadoID
INNER JOIN Ventas v ON d.VentaID = v.VentaID
LEFT JOIN Usuarios u ON d.UsuarioAprobador = u.UsuarioID;
GO
PRINT 'Vista 7: vw_MisDevoluciones - Creada';

-- ----------------------------------------------------------------------------
-- Vista 8: Mis Direcciones
-- ----------------------------------------------------------------------------
IF OBJECT_ID('vw_MisDirecciones', 'V') IS NOT NULL DROP VIEW vw_MisDirecciones;
GO

CREATE VIEW vw_MisDirecciones
AS
SELECT 
    d.DireccionID,
    d.ClienteID,
    d.NombreDireccion,
    d.Calle,
    d.Zona,
    ci.NombreCiudad,
    dep.NombreDepartamento,
    d.Referencia,
    d.EsPrincipal,
    d.Activo,
    d.Calle + ', ' + d.Zona + ', ' + ci.NombreCiudad + ', ' + dep.NombreDepartamento AS DireccionCompleta
FROM Direcciones d
INNER JOIN Ciudades ci ON d.CiudadID = ci.CiudadID
INNER JOIN Departamentos dep ON ci.DepartamentoID = dep.DepartamentoID;
GO
PRINT 'Vista 8: vw_MisDirecciones - Creada';

-- ============================================================================
-- VISTAS PARA ADMIN
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Vista 9: Reporte de ventas
-- ----------------------------------------------------------------------------
IF OBJECT_ID('vw_ReporteVentas', 'V') IS NOT NULL DROP VIEW vw_ReporteVentas;
GO

CREATE VIEW vw_ReporteVentas
AS
SELECT 
    v.VentaID,
    v.NumeroFactura,
    v.FechaVenta,
    CASE 
        WHEN p.ClienteID IS NOT NULL THEN p.Nombres + ' ' + p.ApellidoPaterno
        WHEN e.ClienteID IS NOT NULL THEN e.NombreComercial
        ELSE 'Cliente'
    END AS NombreCliente,
    u.Email,
    c.Telefono,
    d.Calle + ', ' + d.Zona + ', ' + ci.NombreCiudad AS DireccionEnvio,
    mp.NombreMetodo AS MetodoPago,
    ep.NombreEstado AS Estado,
    v.SubtotalVentaBs,
    v.DescuentoPromocionBs,
    v.DescuentoCuponBs,
    v.TotalVentaBs,
    cu.CodigoCupon,
    v.Observaciones,
    YEAR(v.FechaVenta) AS Anio,
    MONTH(v.FechaVenta) AS Mes,
    DATENAME(MONTH, v.FechaVenta) AS NombreMes
FROM Ventas v
INNER JOIN Clientes c ON v.ClienteID = c.ClienteID
INNER JOIN Usuarios u ON c.UsuarioID = u.UsuarioID
LEFT JOIN Personas p ON c.ClienteID = p.ClienteID
LEFT JOIN Empresas e ON c.ClienteID = e.ClienteID
INNER JOIN Direcciones d ON v.DireccionEnvioID = d.DireccionID
INNER JOIN Ciudades ci ON d.CiudadID = ci.CiudadID
INNER JOIN MetodosPago mp ON v.MetodoPagoID = mp.MetodoPagoID
INNER JOIN EstadosPedido ep ON v.EstadoID = ep.EstadoID
LEFT JOIN Cupones cu ON v.CuponID = cu.CuponID;
GO
PRINT 'Vista 9: vw_ReporteVentas - Creada';

-- ----------------------------------------------------------------------------
-- Vista 10: Productos más vendidos
-- ----------------------------------------------------------------------------
IF OBJECT_ID('vw_ProductosMasVendidos', 'V') IS NOT NULL DROP VIEW vw_ProductosMasVendidos;
GO

CREATE VIEW vw_ProductosMasVendidos
AS
SELECT TOP 100
    p.ProductoID,
    p.CodigoProducto,
    p.NombreProducto,
    m.NombreMarca,
    c.NombreCategoria,
    SUM(dv.Cantidad) AS TotalUnidadesVendidas,
    COUNT(DISTINCT dv.VentaID) AS NumeroVentas,
    SUM(dv.SubtotalBs) AS TotalIngresos,
    AVG(dv.PrecioUnitarioBs) AS PrecioPromedio,
    SUM(dv.Cantidad * (dv.PrecioUnitarioBs - p.PrecioCompraBs)) AS GananciaTotal
FROM DetalleVentas dv
INNER JOIN Productos p ON dv.ProductoID = p.ProductoID
LEFT JOIN Marcas m ON p.MarcaID = m.MarcaID
INNER JOIN Categorias c ON p.CategoriaID = c.CategoriaID
GROUP BY p.ProductoID, p.CodigoProducto, p.NombreProducto, m.NombreMarca, c.NombreCategoria, p.PrecioCompraBs
ORDER BY TotalUnidadesVendidas DESC;
GO
PRINT 'Vista 10: vw_ProductosMasVendidos - Creada';

-- ----------------------------------------------------------------------------
-- Vista 11: Inventario actual
-- ----------------------------------------------------------------------------
IF OBJECT_ID('vw_InventarioActual', 'V') IS NOT NULL DROP VIEW vw_InventarioActual;
GO

CREATE VIEW vw_InventarioActual
AS
SELECT 
    p.ProductoID,
    p.CodigoProducto,
    p.NombreProducto,
    c.NombreCategoria,
    m.NombreMarca,
    p.StockActual,
    p.StockMinimo,
    CASE 
        WHEN p.StockActual = 0 THEN 'CRÍTICO - AGOTADO'
        WHEN p.StockActual <= p.StockMinimo THEN 'BAJO - REABASTECER'
        WHEN p.StockActual <= p.StockMinimo * 2 THEN 'MODERADO'
        ELSE 'SUFICIENTE'
    END AS AlertaStock,
    p.StockActual - p.StockMinimo AS DiferenciaStockMinimo,
    p.StockActual * p.PrecioCompraBs AS ValorInventarioCompra,
    p.StockActual * p.PrecioVentaBs AS ValorInventarioVenta,
    (p.StockActual * p.PrecioVentaBs) - (p.StockActual * p.PrecioCompraBs) AS GananciaPotencial,
    p.PrecioCompraBs,
    p.PrecioVentaBs,
    p.Activo,
    p.Destacado
FROM Productos p
INNER JOIN Categorias c ON p.CategoriaID = c.CategoriaID
LEFT JOIN Marcas m ON p.MarcaID = m.MarcaID
WHERE p.Activo = 1;
GO
PRINT 'Vista 11: vw_InventarioActual - Creada';

-- ----------------------------------------------------------------------------
-- Vista 12: Reporte de compras
-- ----------------------------------------------------------------------------
IF OBJECT_ID('vw_ReporteCompras', 'V') IS NOT NULL DROP VIEW vw_ReporteCompras;
GO

CREATE VIEW vw_ReporteCompras
AS
SELECT 
    co.CompraID,
    co.NumeroCompra,
    co.FechaCompra,
    pr.NombreProveedor,
    pr.NIT,
    pr.Telefono AS TelefonoProveedor,
    pr.Email AS EmailProveedor,
    ec.NombreEstado AS Estado,
    co.TotalCompraBs,
    co.Observaciones,
    u.Email AS RegistradoPor,
    YEAR(co.FechaCompra) AS Anio,
    MONTH(co.FechaCompra) AS Mes,
    DATENAME(MONTH, co.FechaCompra) AS NombreMes
FROM Compras co
INNER JOIN Proveedores pr ON co.ProveedorID = pr.ProveedorID
INNER JOIN EstadosCompra ec ON co.EstadoCompraID = ec.EstadoCompraID
INNER JOIN Usuarios u ON co.UsuarioID = u.UsuarioID;
GO
PRINT 'Vista 12: vw_ReporteCompras - Creada';

-- ----------------------------------------------------------------------------
-- Vista 13: Reporte de devoluciones
-- ----------------------------------------------------------------------------
IF OBJECT_ID('vw_ReporteDevoluciones', 'V') IS NOT NULL DROP VIEW vw_ReporteDevoluciones;
GO

CREATE VIEW vw_ReporteDevoluciones
AS
SELECT 
    d.DevolucionID,
    d.FechaDevolucion,
    v.VentaID,
    v.NumeroFactura,
    v.FechaVenta,
    CASE 
        WHEN p.ClienteID IS NOT NULL THEN p.Nombres + ' ' + p.ApellidoPaterno
        WHEN e.ClienteID IS NOT NULL THEN e.NombreComercial
        ELSE 'Cliente'
    END AS NombreCliente,
    u.Email,
    d.Motivo,
    ed.NombreEstado AS Estado,
    d.TotalReembolsoBs,
    DATEDIFF(DAY, v.FechaVenta, d.FechaDevolucion) AS DiasDesdeVenta,
    ua.Email AS AprobadoPor,
    YEAR(d.FechaDevolucion) AS Anio,
    MONTH(d.FechaDevolucion) AS Mes
FROM Devoluciones d
INNER JOIN Ventas v ON d.VentaID = v.VentaID
INNER JOIN Clientes c ON d.ClienteID = c.ClienteID
INNER JOIN Usuarios u ON c.UsuarioID = u.UsuarioID
LEFT JOIN Personas p ON c.ClienteID = p.ClienteID
LEFT JOIN Empresas e ON c.ClienteID = e.ClienteID
INNER JOIN EstadosDevolucion ed ON d.EstadoID = ed.EstadoID
LEFT JOIN Usuarios ua ON d.UsuarioAprobador = ua.UsuarioID;
GO
PRINT 'Vista 13: vw_ReporteDevoluciones - Creada';

-- ----------------------------------------------------------------------------
-- Vista 14: Ventas por mes
-- ----------------------------------------------------------------------------
IF OBJECT_ID('vw_VentasPorMes', 'V') IS NOT NULL DROP VIEW vw_VentasPorMes;
GO

CREATE VIEW vw_VentasPorMes
AS
SELECT 
    YEAR(v.FechaVenta) AS Anio,
    MONTH(v.FechaVenta) AS Mes,
    DATENAME(MONTH, v.FechaVenta) AS NombreMes,
    CAST(YEAR(v.FechaVenta) AS VARCHAR(4)) + '-' + 
        RIGHT('0' + CAST(MONTH(v.FechaVenta) AS VARCHAR(2)), 2) AS PeriodoMes,
    COUNT(DISTINCT v.VentaID) AS NumeroVentas,
    SUM(v.TotalVentaBs) AS TotalVentas,
    AVG(v.TotalVentaBs) AS PromedioVenta,
    SUM(v.DescuentoPromocionBs + v.DescuentoCuponBs) AS TotalDescuentos,
    COUNT(DISTINCT v.ClienteID) AS ClientesUnicos
FROM Ventas v
WHERE v.FechaVenta >= DATEADD(MONTH, -12, GETDATE())
GROUP BY YEAR(v.FechaVenta), MONTH(v.FechaVenta), DATENAME(MONTH, v.FechaVenta);
GO
PRINT 'Vista 14: vw_VentasPorMes - Creada';

-- ----------------------------------------------------------------------------
-- Vista 15: Clientes frecuentes
-- ----------------------------------------------------------------------------
IF OBJECT_ID('vw_ClientesFrecuentes', 'V') IS NOT NULL DROP VIEW vw_ClientesFrecuentes;
GO

CREATE VIEW vw_ClientesFrecuentes
AS
SELECT TOP 100
    c.ClienteID,
    CASE 
        WHEN p.ClienteID IS NOT NULL THEN p.Nombres + ' ' + p.ApellidoPaterno
        WHEN e.ClienteID IS NOT NULL THEN e.NombreComercial
        ELSE 'Cliente'
    END AS NombreCliente,
    u.Email,
    c.Telefono,
    COUNT(DISTINCT v.VentaID) AS NumeroCompras,
    SUM(v.TotalVentaBs) AS TotalGastado,
    AVG(v.TotalVentaBs) AS PromedioCompra,
    MAX(v.FechaVenta) AS UltimaCompra,
    MIN(v.FechaVenta) AS PrimeraCompra,
    DATEDIFF(DAY, MAX(v.FechaVenta), GETDATE()) AS DiasDesdeUltimaCompra,
    CASE 
        WHEN COUNT(DISTINCT v.VentaID) >= 10 THEN 'VIP'
        WHEN COUNT(DISTINCT v.VentaID) >= 5 THEN 'Frecuente'
        WHEN COUNT(DISTINCT v.VentaID) >= 2 THEN 'Regular'
        ELSE 'Nuevo'
    END AS Clasificacion
FROM Clientes c
INNER JOIN Usuarios u ON c.UsuarioID = u.UsuarioID
LEFT JOIN Personas p ON c.ClienteID = p.ClienteID
LEFT JOIN Empresas e ON c.ClienteID = e.ClienteID
INNER JOIN Ventas v ON c.ClienteID = v.ClienteID
GROUP BY c.ClienteID, p.Nombres, p.ApellidoPaterno, e.NombreComercial, u.Email, c.Telefono
ORDER BY TotalGastado DESC;
GO
PRINT 'Vista 15: vw_ClientesFrecuentes - Creada';

-- ----------------------------------------------------------------------------
-- Vista 16: Dashboard estadísticas
-- ----------------------------------------------------------------------------
IF OBJECT_ID('vw_DashboardEstadisticas', 'V') IS NOT NULL DROP VIEW vw_DashboardEstadisticas;
GO

CREATE VIEW vw_DashboardEstadisticas
AS
SELECT 
    (SELECT ISNULL(SUM(TotalVentaBs), 0) FROM Ventas 
     WHERE CAST(FechaVenta AS DATE) = CAST(GETDATE() AS DATE)) AS VentasHoy,
    
    (SELECT ISNULL(SUM(TotalVentaBs), 0) FROM Ventas 
     WHERE YEAR(FechaVenta) = YEAR(GETDATE()) 
       AND MONTH(FechaVenta) = MONTH(GETDATE())) AS VentasMes,
    
    (SELECT COUNT(*) FROM Productos WHERE Activo = 1) AS TotalProductos,
    
    (SELECT COUNT(*) FROM Productos 
     WHERE Activo = 1 AND StockActual <= StockMinimo) AS ProductosStockBajo,
    
    (SELECT COUNT(*) FROM Clientes WHERE Activo = 1) AS TotalClientes,
    
    (SELECT COUNT(*) FROM Clientes 
     WHERE YEAR(FechaRegistro) = YEAR(GETDATE()) 
       AND MONTH(FechaRegistro) = MONTH(GETDATE())) AS ClientesNuevosMes,
    
    (SELECT COUNT(*) FROM Ventas v
     INNER JOIN EstadosPedido e ON v.EstadoID = e.EstadoID
     WHERE e.NombreEstado = 'Pendiente') AS VentasPendientes,
    
    (SELECT COUNT(*) FROM Devoluciones d
     INNER JOIN EstadosDevolucion e ON d.EstadoID = e.EstadoID
     WHERE e.NombreEstado = 'Solicitada') AS DevolucionesPendientes,
    
    (SELECT ISNULL(SUM(StockActual * PrecioVentaBs), 0) FROM Productos 
     WHERE Activo = 1) AS ValorInventario,
     
    (SELECT COUNT(*) FROM Cupones 
     WHERE Activo = 1 AND GETDATE() BETWEEN FechaInicio AND FechaExpiracion) AS CuponesActivos;
GO
PRINT 'Vista 16: vw_DashboardEstadisticas - Creada';

-- ----------------------------------------------------------------------------
-- Vista 17: Proveedores
-- ----------------------------------------------------------------------------
IF OBJECT_ID('vw_Proveedores', 'V') IS NOT NULL DROP VIEW vw_Proveedores;
GO

CREATE VIEW vw_Proveedores
AS
SELECT 
    p.ProveedorID,
    p.NombreProveedor,
    p.NIT,
    p.Direccion,
    p.Telefono,
    p.Email,
    ci.NombreCiudad,
    p.Activo,
    p.FechaRegistro,
    (SELECT COUNT(*) FROM Compras WHERE ProveedorID = p.ProveedorID) AS TotalCompras,
    (SELECT ISNULL(SUM(TotalCompraBs), 0) FROM Compras WHERE ProveedorID = p.ProveedorID) AS MontoTotalComprado
FROM Proveedores p
LEFT JOIN Ciudades ci ON p.CiudadID = ci.CiudadID
WHERE p.Activo = 1;
GO
PRINT 'Vista 17: vw_Proveedores - Creada';

-- ----------------------------------------------------------------------------
-- Vista 18: Promociones activas
-- ----------------------------------------------------------------------------
IF OBJECT_ID('vw_PromocionesActivas', 'V') IS NOT NULL DROP VIEW vw_PromocionesActivas;
GO

CREATE VIEW vw_PromocionesActivas
AS
SELECT 
    p.PromocionID,
    p.NombrePromocion,
    p.Descripcion,
    p.TipoDescuento,
    p.ValorDescuento,
    p.FechaInicio,
    p.FechaFin,
    p.Activa,
    DATEDIFF(DAY, GETDATE(), p.FechaFin) AS DiasRestantes,
    (SELECT COUNT(*) FROM ProductosEnPromocion WHERE PromocionID = p.PromocionID) AS TotalProductos
FROM Promociones p
WHERE p.Activa = 1 AND GETDATE() BETWEEN p.FechaInicio AND p.FechaFin;
GO
PRINT 'Vista 18: vw_PromocionesActivas - Creada';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

PRINT '';
PRINT '============================================================================';
PRINT 'VISTAS CREADAS CON NOMBRES EXACTOS DE COLUMNAS';
PRINT '============================================================================';

SELECT 
    TABLE_NAME AS Vista,
    CASE 
        WHEN TABLE_NAME IN ('vw_ProductosDisponibles', 'vw_ProductosEnPromocion', 
                            'vw_CuponesDisponibles', 'vw_PromocionesActivas') 
        THEN 'PÚBLICO'
        WHEN TABLE_NAME LIKE 'vw_Mis%' 
        THEN 'CLIENTE'
        ELSE 'ADMIN'
    END AS Rol
FROM INFORMATION_SCHEMA.VIEWS
WHERE TABLE_NAME LIKE 'vw_%'
ORDER BY TABLE_NAME;

PRINT '';
PRINT '============================================================================';
PRINT 'TOTAL: 18 VISTAS CREADAS';
PRINT '============================================================================';

GO