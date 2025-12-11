select * from EstadosPedido



exec sp_ObtenerProductosAdmin


CREATE OR ALTER PROCEDURE sp_ObtenerProductosAdmin
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        p.ProductoID,            -- Para el botón Acciones
        p.CodigoProducto AS Codigo,
        p.NombreProducto AS Producto,

        c.NombreCategoria AS Categoria,
        m.NombreMarca AS Marca,

        p.PrecioVentaBs AS PrecioBs,
        p.StockActual AS Stock,

        CASE 
            WHEN p.Activo = 1 THEN 'Activo'
            ELSE 'Inactivo'
        END AS Estado

    FROM Productos p
    LEFT JOIN Categorias c ON p.CategoriaID = c.CategoriaID
    LEFT JOIN Marcas m ON p.MarcaID = m.MarcaID
    ORDER BY p.FechaCreacion DESC;
END
GO

select * from productos



select * from productos





CREATE VIEW vw_ProductosAdmin AS
SELECT 
    p.ProductoID,
    p.CodigoProducto,
    p.NombreProducto,
    p.Descripcion,
    p.CategoriaID,
    c.NombreCategoria,
    p.MarcaID,
    m.NombreMarca,
    p.PrecioCompraBs,
    p.PrecioVentaBs,
    p.StockActual,
    p.StockMinimo,
    p.Ancho,
    p.Perfil,
    p.DiametroRin,
    p.IndiceCarga,
    p.IndiceVelocidad,
    p.Destacado,
    p.Activo
FROM Productos p
LEFT JOIN Categorias c ON p.CategoriaID = c.CategoriaID
LEFT JOIN Marcas m ON p.MarcaID = m.MarcaID;
GO



ALTER VIEW vw_VentasPorCiudad AS
SELECT 
  c.NombreCiudad,
  COUNT(v.VentaID) AS CantidadVentas,
  SUM(v.TotalVentaBs) AS TotalVentasBs
FROM Ventas v
INNER JOIN Direcciones d ON v.DireccionEnvioID = d.DireccionID
INNER JOIN Ciudades c ON d.CiudadID = c.CiudadID
GROUP BY c.NombreCiudad;




CREATE VIEW vw_StockBajo AS
SELECT 
    ProductoID,
    CodigoProducto,
    NombreProducto,
    StockActual,
    StockMinimo
FROM Productos
WHERE StockActual <= StockMinimo AND Activo = 1;
GO


ALTER VIEW vw_VentasDiarias AS
SELECT 
    CAST(FechaVenta AS DATE) AS Fecha,
    COUNT(*) AS CantidadVentas,
    SUM(TotalVentaBs) AS TotalVentasBs
FROM Ventas
GROUP BY CAST(FechaVenta AS DATE);
GO



ALTER VIEW vw_ProductosMasVendidos AS
SELECT
    p.ProductoID,
    p.NombreProducto,
    p.CodigoProducto,
    m.NombreMarca,
    SUM(dv.Cantidad) AS CantidadVendida,
    SUM(dv.SubtotalBs) AS TotalVendido,
    YEAR(v.FechaVenta) AS AñoVenta,
    MONTH(v.FechaVenta) AS MesVenta
FROM DetalleVentas dv
INNER JOIN Productos p ON dv.ProductoID = p.ProductoID
INNER JOIN Ventas v ON dv.VentaID = v.VentaID
LEFT JOIN Marcas m ON p.MarcaID = m.MarcaID
GROUP BY p.ProductoID, p.NombreProducto, p.CodigoProducto, m.NombreMarca,
         YEAR(v.FechaVenta), MONTH(v.FechaVenta);
GO


CREATE PROCEDURE sp_ObtenerVentasMes
    @Mes INT = NULL,
    @Anio INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Si no se envía mes/año, usar el actual
    IF @Mes IS NULL SET @Mes = MONTH(GETDATE());
    IF @Anio IS NULL SET @Anio = YEAR(GETDATE());

    SELECT 
        COUNT(*) AS CantidadVentasMes,
        COALESCE(SUM(TotalVentaBs), 0) AS TotalVentasMes
    FROM Ventas
    WHERE YEAR(FechaVenta) = @Anio
      AND MONTH(FechaVenta) = @Mes;
END;
GO

CREATE PROCEDURE sp_LoginUsuario
  @Email NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        u.UsuarioID, 
        u.Email, 
        u.PasswordHash, 
        u.RolID,
        r.NombreRol,
        c.ClienteID,
        c.TipoCliente,
        CASE 
            WHEN c.TipoCliente = 'Persona' THEN p.Nombres + ' ' + p.ApellidoPaterno
            ELSE e.RazonSocial
        END AS NombreCompleto
    FROM Usuarios u
    INNER JOIN Roles r ON u.RolID = r.RolID
    LEFT JOIN Clientes c ON u.UsuarioID = c.UsuarioID
    LEFT JOIN Personas p ON c.ClienteID = p.ClienteID AND c.TipoCliente = 'Persona'
    LEFT JOIN Empresas e ON c.ClienteID = e.ClienteID AND c.TipoCliente = 'Empresa'
    WHERE u.Email = @Email AND u.Activo = 1
END

CREATE PROCEDURE sp_ObtenerProductosDestacados
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 10
        p.ProductoID,
        p.CodigoProducto,
        p.NombreProducto,
        p.Descripcion,
        p.PrecioVentaBs,
        p.StockActual,
        c.NombreCategoria,
        m.NombreMarca
    FROM Productos p
    INNER JOIN Categorias c ON p.CategoriaID = c.CategoriaID
    INNER JOIN Marcas m ON p.MarcaID = m.MarcaID
    WHERE p.Activo = 1 
      AND p.Destacado = 1 
      AND p.StockActual > 0
    ORDER BY p.ProductoID DESC
END


CREATE PROCEDURE sp_ObtenerDireccionesCliente
    @ClienteID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        d.DireccionID,
        d.NombreDireccion,
        d.Calle,
        d.Zona,
        d.Referencia,
        d.EsPrincipal,
        c.NombreCiudad,
        dep.NombreDepartamento,
        d.CiudadID
    FROM Direcciones d
    INNER JOIN Ciudades c ON d.CiudadID = c.CiudadID
    INNER JOIN Departamentos dep ON c.DepartamentoID = dep.DepartamentoID
    WHERE d.ClienteID = @ClienteID
      AND d.Activo = 1
    ORDER BY d.EsPrincipal DESC, d.NombreDireccion;
END
GO





CREATE PROCEDURE sp_HistorialVentasCliente
    @ClienteID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        v.VentaID,
        v.NumeroFactura,
        v.FechaVenta,
        v.TotalVentaBs,
        ep.NombreEstado,
        mp.NombreMetodo AS MetodoPago,
        COUNT(dv.DetalleVentaID) AS CantidadProductos
    FROM Ventas v
    INNER JOIN EstadosPedido ep ON v.EstadoID = ep.EstadoID
    INNER JOIN MetodosPago mp ON v.MetodoPagoID = mp.MetodoPagoID
    LEFT JOIN DetalleVentas dv ON v.VentaID = dv.VentaID
    WHERE v.ClienteID = @ClienteID
    GROUP BY v.VentaID, v.NumeroFactura, v.FechaVenta, v.TotalVentaBs, ep.NombreEstado, mp.NombreMetodo
    ORDER BY v.FechaVenta DESC;
END
GO




CREATE PROCEDURE sp_DetalleVenta
    @VentaID INT,
    @ClienteID INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Info general de la venta
    SELECT 
        v.*,
        ep.NombreEstado,
        mp.NombreMetodo AS MetodoPago,
        d.Calle + ', ' + d.Zona + ', ' + c.NombreCiudad AS DireccionCompleta
    FROM Ventas v
    INNER JOIN EstadosPedido ep ON v.EstadoID = ep.EstadoID
    INNER JOIN MetodosPago mp ON v.MetodoPagoID = mp.MetodoPagoID
    INNER JOIN Direcciones d ON v.DireccionEnvioID = d.DireccionID
    INNER JOIN Ciudades c ON d.CiudadID = c.CiudadID
    WHERE v.VentaID = @VentaID AND v.ClienteID = @ClienteID;

    -- Detalles de productos de la venta
    SELECT 
        dv.*,
        p.NombreProducto,
        p.CodigoProducto
    FROM DetalleVentas dv
    INNER JOIN Productos p ON dv.ProductoID = p.ProductoID
    WHERE dv.VentaID = @VentaID;
END
GO