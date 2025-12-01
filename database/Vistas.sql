USE [Avila's Tyre Company];
GO

PRINT '================================================';
PRINT 'VISTAS DEL SISTEMA';
PRINT 'Avila''s Tyre Company - Santa Cruz, Bolivia';
PRINT '================================================';
GO

-- =============================================
-- VISTA: PRODUCTOS DISPONIBLES (Catálogo Público)
-- =============================================
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_ProductosDisponibles')
    DROP VIEW vw_ProductosDisponibles;
GO

IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_ProductosDisponibles')
    DROP VIEW vw_ProductosDisponibles;
GO

CREATE VIEW vw_ProductosDisponibles AS
SELECT
    p.ProductoID,
    p.CodigoProducto,
    p.NombreProducto,
    p.Descripcion,
    p.PrecioVentaBs,
    p.StockActual,
    p.StockMinimo,               -- para admin
    p.CategoriaID,               -- para filtros
    c.NombreCategoria,
    p.MarcaID,
    m.NombreMarca,
    p.Ancho,
    p.Perfil,
    p.DiametroRin,
    p.IndiceCarga,
    p.IndiceVelocidad,
    p.Destacado,
    p.Activo
FROM Productos p
INNER JOIN Categorias c ON p.CategoriaID = c.CategoriaID
INNER JOIN Marcas m ON p.MarcaID = m.MarcaID
WHERE p.Activo = 1 AND c.Activo = 1 AND m.Activo = 1;
GO

-- =============================================
-- VISTA: HISTORIAL DE COMPRAS (Cliente)
-- =============================================
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_HistorialComprasCliente')
    DROP VIEW vw_HistorialComprasCliente;
GO

CREATE VIEW vw_HistorialComprasCliente AS
SELECT 
    v.VentaID,
    v.NumeroFactura,
    v.FechaVenta,
    v.TotalVentaBs,
    v.ClienteID,
    ep.NombreEstado,
    mp.NombreMetodo AS MetodoPago,
    (SELECT COUNT(*) FROM DetalleVentas dv WHERE dv.VentaID = v.VentaID) AS CantidadProductos
FROM Ventas v
INNER JOIN EstadosPedido ep ON v.EstadoID = ep.EstadoID
INNER JOIN MetodosPago mp ON v.MetodoPagoID = mp.MetodoPagoID;
GO

PRINT '✓ Vista vw_HistorialComprasCliente creada';
GO

-- =============================================
-- VISTA: REPORTE VENTAS DIARIAS (Admin)
-- =============================================
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_VentasDiarias')
    DROP VIEW vw_VentasDiarias;
GO

CREATE VIEW vw_VentasDiarias AS
SELECT 
    CAST(FechaVenta AS DATE) AS Fecha,
    COUNT(*) AS CantidadVentas,
    SUM(TotalVentaBs) AS TotalVentasBs
FROM Ventas
WHERE EstadoID NOT IN (6) -- Excluir canceladas
GROUP BY CAST(FechaVenta AS DATE);
GO

PRINT '✓ Vista vw_VentasDiarias creada';
GO

-- =============================================
-- VISTA: PRODUCTOS MÁS VENDIDOS (Admin)
-- =============================================
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_ProductosMasVendidos')
    DROP VIEW vw_ProductosMasVendidos;
GO

CREATE VIEW vw_ProductosMasVendidos AS
SELECT TOP 20
    p.ProductoID,
    p.NombreProducto,
    SUM(dv.Cantidad) AS CantidadVendida,
    SUM(dv.SubtotalBs) AS TotalGeneradoBs
FROM DetalleVentas dv
INNER JOIN Ventas v ON dv.VentaID = v.VentaID
INNER JOIN Productos p ON dv.ProductoID = p.ProductoID
WHERE v.EstadoID NOT IN (6) -- Excluir canceladas
GROUP BY p.ProductoID, p.NombreProducto
ORDER BY CantidadVendida DESC;
GO

PRINT '✓ Vista vw_ProductosMasVendidos creada';
GO

-- =============================================
-- VISTA: STOCK BAJO (Admin)
-- =============================================
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_ProductosStockBajo')
    DROP VIEW vw_ProductosStockBajo;
GO

CREATE VIEW vw_ProductosStockBajo AS
SELECT 
    p.ProductoID,
    p.CodigoProducto,
    p.NombreProducto,
    p.StockActual,
    p.StockMinimo,
    c.NombreCategoria,
    m.NombreMarca
FROM Productos p
INNER JOIN Categorias c ON p.CategoriaID = c.CategoriaID
INNER JOIN Marcas m ON p.MarcaID = m.MarcaID
WHERE p.StockActual <= p.StockMinimo AND p.Activo = 1;
GO

PRINT '✓ Vista vw_ProductosStockBajo creada';
GO

-- =============================================
-- VISTA: VENTAS POR CIUDAD (Admin)
-- =============================================
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_VentasPorCiudad')
    DROP VIEW vw_VentasPorCiudad;
GO

CREATE VIEW vw_VentasPorCiudad AS
SELECT 
    c.NombreCiudad,
    d.NombreDepartamento,
    COUNT(v.VentaID) AS CantidadVentas,
    SUM(v.TotalVentaBs) AS TotalVentasBs
FROM Ventas v
INNER JOIN Direcciones dir ON v.DireccionEnvioID = dir.DireccionID
INNER JOIN Ciudades c ON dir.CiudadID = c.CiudadID
INNER JOIN Departamentos d ON c.DepartamentoID = d.DepartamentoID
WHERE v.EstadoID NOT IN (6)
GROUP BY c.NombreCiudad, d.NombreDepartamento;
GO

PRINT '✓ Vista vw_VentasPorCiudad creada';
GO
