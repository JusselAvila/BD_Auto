USE [Avila's Tyre Company];
GO

PRINT '================================================';
PRINT 'STORED PROCEDURES ORGANIZADOS';
PRINT 'Avila''s Tyre Company - Santa Cruz, Bolivia';
PRINT '================================================';
GO

-- =============================================
-- CATEGORÍA 1: GESTIÓN DE CLIENTES
-- =============================================

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_CrearClientePersona')
    DROP PROCEDURE sp_CrearClientePersona;
GO

CREATE PROCEDURE sp_CrearClientePersona
    @Email NVARCHAR(100),
    @PasswordHash NVARCHAR(255),
    @Nombres NVARCHAR(100),
    @ApellidoPaterno NVARCHAR(100),
    @ApellidoMaterno NVARCHAR(100) = NULL,
    @CI NVARCHAR(20),
    @Telefono NVARCHAR(20) = NULL,
    @FechaNacimiento DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    
    DECLARE @Reintentos INT = 0;
    DECLARE @MaxReintentos INT = 3;
    DECLARE @Exitoso BIT = 0;
    
    WHILE @Reintentos < @MaxReintentos AND @Exitoso = 0
    BEGIN
        SET @Reintentos = @Reintentos + 1;
        
        BEGIN TRY
            BEGIN TRANSACTION;
            
            DECLARE @UsuarioID INT;
            DECLARE @ClienteID INT;
            DECLARE @RolClienteID INT;
            
            IF EXISTS (SELECT 1 FROM Usuarios WITH (UPDLOCK, HOLDLOCK) WHERE Email = @Email AND Activo = 1)
            BEGIN
                RAISERROR('El email ya está registrado en el sistema', 16, 1);
            END
            
            IF EXISTS (SELECT 1 FROM Clientes WITH (UPDLOCK, HOLDLOCK) WHERE NumeroDocumento = @CI)
            BEGIN
                RAISERROR('El CI ya está registrado en el sistema', 16, 1);
            END
            
            SELECT @RolClienteID = RolID FROM Roles WHERE NombreRol = 'Cliente';
            
            IF @RolClienteID IS NULL
            BEGIN
                RAISERROR('Error del sistema: Rol Cliente no encontrado', 16, 1);
            END
            
            INSERT INTO Usuarios (Email, PasswordHash, RolID, Activo)
            VALUES (@Email, @PasswordHash, @RolClienteID, 1);
            
            SET @UsuarioID = SCOPE_IDENTITY();
            
            INSERT INTO Clientes (UsuarioID, NumeroDocumento, TipoDocumento, TipoCliente, Telefono)
            VALUES (@UsuarioID, @CI, 'CI', 'Persona', @Telefono);
            
            SET @ClienteID = SCOPE_IDENTITY();
            
            INSERT INTO Personas (ClienteID, Nombres, ApellidoPaterno, ApellidoMaterno, FechaNacimiento)
            VALUES (@ClienteID, @Nombres, @ApellidoPaterno, @ApellidoMaterno, @FechaNacimiento);
            
            COMMIT TRANSACTION;
            SET @Exitoso = 1;
            
            SELECT 
                @UsuarioID AS UsuarioID, 
                @ClienteID AS ClienteID,
                'Cliente persona creado exitosamente' AS Mensaje;
            
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0
                ROLLBACK TRANSACTION;
            
            IF ERROR_NUMBER() = 1205
            BEGIN
                IF @Reintentos < @MaxReintentos
                BEGIN
                    PRINT 'Deadlock detectado, reintento ' + CAST(@Reintentos AS NVARCHAR) + '...';
                    WAITFOR DELAY '00:00:01';
                    CONTINUE;
                END
            END;
            
            THROW;
        END CATCH
    END
END
GO

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_CrearClienteEmpresa')
    DROP PROCEDURE sp_CrearClienteEmpresa;
GO

CREATE PROCEDURE sp_CrearClienteEmpresa
    @Email NVARCHAR(100),
    @PasswordHash NVARCHAR(255),
    @RazonSocial NVARCHAR(255),
    @NombreComercial NVARCHAR(255) = NULL,
    @NIT NVARCHAR(20),
    @Telefono NVARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    
    DECLARE @Reintentos INT = 0;
    DECLARE @MaxReintentos INT = 3;
    DECLARE @Exitoso BIT = 0;
    
    WHILE @Reintentos < @MaxReintentos AND @Exitoso = 0
    BEGIN
        SET @Reintentos = @Reintentos + 1;
        
        BEGIN TRY
            BEGIN TRANSACTION;
            
            DECLARE @UsuarioID INT;
            DECLARE @ClienteID INT;
            DECLARE @RolClienteID INT;
            
            IF EXISTS (SELECT 1 FROM Usuarios WITH (UPDLOCK, HOLDLOCK) WHERE Email = @Email AND Activo = 1)
            BEGIN
                RAISERROR('El email ya está registrado', 16, 1);
            END
            
            IF EXISTS (SELECT 1 FROM Clientes WITH (UPDLOCK, HOLDLOCK) WHERE NumeroDocumento = @NIT)
            BEGIN
                RAISERROR('El NIT ya está registrado', 16, 1);
            END
            
            SELECT @RolClienteID = RolID FROM Roles WHERE NombreRol = 'Cliente';
            
            IF @RolClienteID IS NULL
                RAISERROR('Error del sistema: Rol Cliente no encontrado', 16, 1);
            
            INSERT INTO Usuarios (Email, PasswordHash, RolID, Activo)
            VALUES (@Email, @PasswordHash, @RolClienteID, 1);
            
            SET @UsuarioID = SCOPE_IDENTITY();
            
            INSERT INTO Clientes (UsuarioID, NumeroDocumento, TipoDocumento, TipoCliente, Telefono)
            VALUES (@UsuarioID, @NIT, 'NIT', 'Empresa', @Telefono);
            
            SET @ClienteID = SCOPE_IDENTITY();
            
            INSERT INTO Empresas (ClienteID, RazonSocial, NombreComercial)
            VALUES (@ClienteID, @RazonSocial, @NombreComercial);
            
            COMMIT TRANSACTION;
            SET @Exitoso = 1;
            
            SELECT @UsuarioID AS UsuarioID, @ClienteID AS ClienteID, 'Cliente empresa creado exitosamente' AS Mensaje;
            
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0
                ROLLBACK TRANSACTION;
            
            IF ERROR_NUMBER() = 1205 AND @Reintentos < @MaxReintentos
            BEGIN
                WAITFOR DELAY '00:00:01';
                CONTINUE;
            END;
            
            THROW;
        END CATCH
    END
END
GO

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_ActualizarClientePersona')
    DROP PROCEDURE sp_ActualizarClientePersona;
GO

CREATE PROCEDURE sp_ActualizarClientePersona
    @ClienteID INT,
    @Nombres NVARCHAR(100) = NULL,
    @ApellidoPaterno NVARCHAR(100) = NULL,
    @ApellidoMaterno NVARCHAR(100) = NULL,
    @Telefono NVARCHAR(20) = NULL,
    @FechaNacimiento DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        IF NOT EXISTS (
            SELECT 1 FROM Clientes WITH (UPDLOCK, HOLDLOCK)
            WHERE ClienteID = @ClienteID AND TipoCliente = 'Persona'
        )
        BEGIN
            RAISERROR('Cliente no encontrado o no es tipo Persona', 16, 1);
        END
        
        IF @Telefono IS NOT NULL
        BEGIN
            UPDATE Clientes 
            SET Telefono = @Telefono
            WHERE ClienteID = @ClienteID;
        END
        
        UPDATE Personas
        SET 
            Nombres = COALESCE(@Nombres, Nombres),
            ApellidoPaterno = COALESCE(@ApellidoPaterno, ApellidoPaterno),
            ApellidoMaterno = COALESCE(@ApellidoMaterno, ApellidoMaterno),
            FechaNacimiento = COALESCE(@FechaNacimiento, FechaNacimiento)
        WHERE ClienteID = @ClienteID;
        
        COMMIT TRANSACTION;
        
        SELECT @ClienteID AS ClienteID, 'Datos actualizados exitosamente' AS Mensaje;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_ActualizarClienteEmpresa')
    DROP PROCEDURE sp_ActualizarClienteEmpresa;
GO

CREATE PROCEDURE sp_ActualizarClienteEmpresa
    @ClienteID INT,
    @RazonSocial NVARCHAR(255) = NULL,
    @NombreComercial NVARCHAR(255) = NULL,
    @Telefono NVARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        IF NOT EXISTS (
            SELECT 1 FROM Clientes WITH (UPDLOCK, HOLDLOCK)
            WHERE ClienteID = @ClienteID AND TipoCliente = 'Empresa'
        )
        BEGIN
            RAISERROR('Cliente no encontrado o no es tipo Empresa', 16, 1);
        END
        
        IF @Telefono IS NOT NULL
        BEGIN
            UPDATE Clientes 
            SET Telefono = @Telefono
            WHERE ClienteID = @ClienteID;
        END
        
        UPDATE Empresas
        SET 
            RazonSocial = COALESCE(@RazonSocial, RazonSocial),
            NombreComercial = COALESCE(@NombreComercial, NombreComercial)
        WHERE ClienteID = @ClienteID;
        
        COMMIT TRANSACTION;
        
        SELECT @ClienteID AS ClienteID, 'Datos de empresa actualizados exitosamente' AS Mensaje;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

PRINT '✓ Gestión de Clientes: 4 SPs creados';
GO

-- =============================================
-- CATEGORÍA 2: GESTIÓN DE PRODUCTOS
-- =============================================

CREATE PROCEDURE sp_CrearOActualizarProducto2
    @CodigoProducto NVARCHAR(50),
    @NombreProducto NVARCHAR(200),
    @Descripcion NVARCHAR(1000),
    @CategoriaID INT = NULL, -- Acepta NULL (opcional)
    @MarcaID INT = NULL,     -- Acepta NULL (opcional)
    
    -- Parámetros de Precio y Stock
    @PrecioCompraBs DECIMAL(10,2),
    @PrecioVentaBs DECIMAL(10,2),
    @StockActual INT, 
    @StockMinimo INT,
    
    -- Parámetros de Llanta (Opcionales - Usar NULL para Accesorios)
    @Ancho INT = NULL,
    @Perfil INT = NULL,
    @DiametroRin INT = NULL, 
    @IndiceCarga NVARCHAR(10) = NULL, -- Indice de Carga para llantas
    @IndiceVelocidad NVARCHAR(5) = NULL, -- Indice de Velocidad para llantas
    
    -- Parámetros Adicionales
    @Destacado BIT,
    @UsuarioID INT -- Para auditoría
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE; -- Alto nivel de aislamiento para la operación de Upsert

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @ExistingProductoID INT;

        -- 1. Intentar encontrar el producto por CodigoProducto
        SELECT @ExistingProductoID = ProductoID 
        FROM Productos 
        WHERE CodigoProducto = @CodigoProducto;

        IF @ExistingProductoID IS NOT NULL
        BEGIN
            -- ===================================
            -- 2. ACTUALIZAR PRODUCTO EXISTENTE
            -- ===================================
            
            UPDATE Productos
            SET
                NombreProducto = @NombreProducto,
                Descripcion = @Descripcion,
                CategoriaID = @CategoriaID,
                MarcaID = @MarcaID,
                PrecioCompraBs = @PrecioCompraBs,
                PrecioVentaBs = @PrecioVentaBs,
                StockActual = @StockActual,
                StockMinimo = @StockMinimo,
                -- Dimensiones de Llanta
                Ancho = @Ancho,
                Perfil = @Perfil,
                DiametroRin = @DiametroRin,
                IndiceCarga = @IndiceCarga,
                IndiceVelocidad = @IndiceVelocidad,
                Destacado = @Destacado
            WHERE ProductoID = @ExistingProductoID;

            -- Retorna el ID del producto actualizado
            SELECT @ExistingProductoID AS ProductoID, 'ACTUALIZADO' AS Operacion;
        END
        ELSE
        BEGIN
            -- ===================================
            -- 3. CREAR NUEVO PRODUCTO
            -- ===================================
            
            INSERT INTO Productos (
                CodigoProducto, NombreProducto, Descripcion, CategoriaID, MarcaID, 
                PrecioCompraBs, PrecioVentaBs, StockActual, StockMinimo, 
                Ancho, Perfil, DiametroRin, IndiceCarga, IndiceVelocidad, 
                Destacado
            )
            VALUES (
                @CodigoProducto, @NombreProducto, @Descripcion, @CategoriaID, @MarcaID, 
                @PrecioCompraBs, @PrecioVentaBs, @StockActual, @StockMinimo, 
                @Ancho, @Perfil, @DiametroRin, @IndiceCarga, @IndiceVelocidad, 
                @Destacado
            );

            SELECT @ExistingProductoID = SCOPE_IDENTITY(); -- Captura el nuevo ID generado
            -- Retorna el ID del nuevo producto
            SELECT @ExistingProductoID AS ProductoID, 'CREADO' AS Operacion;
        END

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        -- Si hay algún error, revierta la transacción
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        -- Relanzar el error
        THROW;
    END CATCH
END
GO



-- =============================================
-- CATEGORÍA 3: GESTIÓN DE COMPRAS
-- =============================================

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_CrearCompra')
    DROP PROCEDURE sp_CrearCompra;
GO

CREATE PROCEDURE sp_CrearCompra
    @ProveedorID INT,
    @UsuarioID INT,
    @DetallesJSON NVARCHAR(MAX),
    @Observaciones NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    
    DECLARE @Reintentos INT = 0;
    DECLARE @MaxReintentos INT = 3;
    DECLARE @Exitoso BIT = 0;
    
    WHILE @Reintentos < @MaxReintentos AND @Exitoso = 0
    BEGIN
        SET @Reintentos = @Reintentos + 1;
        
        BEGIN TRY
            BEGIN TRANSACTION;
            
            DECLARE @CompraID INT;
            DECLARE @NumeroCompra NVARCHAR(50);
            DECLARE @TotalCompraBs DECIMAL(12,2) = 0;
            
            DECLARE @NumeroSecuencial INT;
            SELECT @NumeroSecuencial = ISNULL(MAX(CAST(SUBSTRING(NumeroCompra, 11, 10) AS INT)), 0) + 1
            FROM Compras WITH (TABLOCKX, HOLDLOCK)
            WHERE NumeroCompra LIKE 'COMP-' + FORMAT(GETDATE(), 'yyyy') + '%';
            
            SET @NumeroCompra = 'COMP-' + FORMAT(GETDATE(), 'yyyy') + '-' + FORMAT(@NumeroSecuencial, '000');
            
            CREATE TABLE #TempDetalles (
                ProductoID INT,
                Cantidad INT,
                PrecioUnitarioBs DECIMAL(10,2),
                SubtotalBs DECIMAL(12,2)
            );
            
            INSERT INTO #TempDetalles (ProductoID, Cantidad, PrecioUnitarioBs, SubtotalBs)
            SELECT 
                ProductoID,
                Cantidad,
                PrecioUnitarioBs,
                Cantidad * PrecioUnitarioBs
            FROM OPENJSON(@DetallesJSON) WITH (
                ProductoID INT,
                Cantidad INT,
                PrecioUnitarioBs DECIMAL(10,2)
            );
            
            IF EXISTS (
                SELECT 1 FROM #TempDetalles t
                WHERE NOT EXISTS (SELECT 1 FROM Productos p WHERE p.ProductoID = t.ProductoID AND p.Activo = 1)
            )
            BEGIN
                RAISERROR('Uno o más productos no existen o están inactivos', 16, 1);
            END
            
            SELECT @TotalCompraBs = SUM(SubtotalBs) FROM #TempDetalles;
            
            INSERT INTO Compras (NumeroCompra, ProveedorID, UsuarioID, TotalCompraBs, EstadoCompraID, Observaciones)
            VALUES (@NumeroCompra, @ProveedorID, @UsuarioID, @TotalCompraBs, 1, @Observaciones);
            
            SET @CompraID = SCOPE_IDENTITY();
            
            INSERT INTO DetalleCompras (CompraID, ProductoID, Cantidad, PrecioUnitarioBs, SubtotalBs)
            SELECT @CompraID, ProductoID, Cantidad, PrecioUnitarioBs, SubtotalBs FROM #TempDetalles;
            
            INSERT INTO HistorialEstadoCompra (CompraID, EstadoID, UsuarioID, Comentario)
            VALUES (@CompraID, 1, @UsuarioID, 'Compra solicitada al proveedor');
            
            DROP TABLE #TempDetalles;
            
            COMMIT TRANSACTION;
            SET @Exitoso = 1;
            
            SELECT @CompraID AS CompraID, @NumeroCompra AS NumeroCompra, @TotalCompraBs AS TotalCompraBs;
            
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0
                ROLLBACK TRANSACTION;
            
            IF OBJECT_ID('tempdb..#TempDetalles') IS NOT NULL
                DROP TABLE #TempDetalles;
            
            IF ERROR_NUMBER() = 1205 AND @Reintentos < @MaxReintentos
            BEGIN
                PRINT 'Deadlock en sp_CrearCompra, reintento ' + CAST(@Reintentos AS NVARCHAR);
                WAITFOR DELAY '00:00:01';
                CONTINUE;
            END;
            
            THROW;
        END CATCH
    END
END
GO

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_CambiarEstadoCompra')
    DROP PROCEDURE sp_CambiarEstadoCompra;
GO

CREATE PROCEDURE sp_CambiarEstadoCompra
    @CompraID INT,
    @NuevoEstadoID INT,
    @UsuarioID INT,
    @Comentario NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    
    DECLARE @Reintentos INT = 0;
    DECLARE @MaxReintentos INT = 3;
    DECLARE @Exitoso BIT = 0;
    
    WHILE @Reintentos < @MaxReintentos AND @Exitoso = 0
    BEGIN
        SET @Reintentos = @Reintentos + 1;
        
        BEGIN TRY
            BEGIN TRANSACTION;
            
            DECLARE @EstadoActual INT;
            
            SELECT @EstadoActual = EstadoCompraID 
            FROM Compras WITH (UPDLOCK, HOLDLOCK)
            WHERE CompraID = @CompraID;
            
            IF @EstadoActual IS NULL
                RAISERROR('Compra no encontrada', 16, 1);
            
            IF @EstadoActual = @NuevoEstadoID
                RAISERROR('La compra ya está en ese estado', 16, 1);
            
            UPDATE Compras SET EstadoCompraID = @NuevoEstadoID WHERE CompraID = @CompraID;
            
            INSERT INTO HistorialEstadoCompra (CompraID, EstadoID, UsuarioID, Comentario)
            VALUES (@CompraID, @NuevoEstadoID, @UsuarioID, @Comentario);
            
            IF @NuevoEstadoID = 4
            BEGIN
                UPDATE p
                SET p.StockActual = p.StockActual + dc.Cantidad
                FROM Productos p WITH (UPDLOCK, HOLDLOCK)
                INNER JOIN DetalleCompras dc ON p.ProductoID = dc.ProductoID
                WHERE dc.CompraID = @CompraID;
                
                INSERT INTO MovimientosStock (ProductoID, TipoMovimientoID, Cantidad, StockAnterior, StockNuevo, UsuarioID, ReferenciaTabla, ReferenciaID, Observaciones)
                SELECT 
                    dc.ProductoID,
                    2,
                    dc.Cantidad,
                    p.StockActual - dc.Cantidad,
                    p.StockActual,
                    @UsuarioID,
                    'Compras',
                    @CompraID,
                    'Compra recibida - ' + c.NumeroCompra
                FROM DetalleCompras dc
                INNER JOIN Productos p ON dc.ProductoID = p.ProductoID
                INNER JOIN Compras c ON dc.CompraID = c.CompraID
                WHERE dc.CompraID = @CompraID;
            END
            
            COMMIT TRANSACTION;
            SET @Exitoso = 1;
            
            SELECT @CompraID AS CompraID, @NuevoEstadoID AS EstadoID, 'Estado actualizado correctamente' AS Mensaje;
            
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0
                ROLLBACK TRANSACTION;
            
            IF ERROR_NUMBER() = 1205 AND @Reintentos < @MaxReintentos
            BEGIN
                PRINT 'Deadlock en sp_CambiarEstadoCompra, reintento ' + CAST(@Reintentos AS NVARCHAR);
                WAITFOR DELAY '00:00:01';
                CONTINUE;
            END;
            
            THROW;
        END CATCH
    END
END
GO

PRINT '✓ Gestión de Compras: 2 SPs creados';
GO

-- =============================================
-- CATEGORÍA 4: GESTIÓN DE VENTAS
-- =============================================

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_CrearVenta')
    DROP PROCEDURE sp_CrearVenta;
GO

CREATE PROCEDURE sp_CrearVenta
    @ClienteID INT,
    @DireccionEnvioID INT,
    @MetodoPagoID INT,
    @CuponID INT = NULL,
    @Observaciones NVARCHAR(500) = NULL,
    @DetallesJSON NVARCHAR(MAX),
    @UsuarioID INT
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    
    DECLARE @Reintentos INT = 0;
    DECLARE @MaxReintentos INT = 3;
    DECLARE @Exitoso BIT = 0;
    
    WHILE @Reintentos < @MaxReintentos AND @Exitoso = 0
    BEGIN
        SET @Reintentos = @Reintentos + 1;
        
        BEGIN TRY
            BEGIN TRANSACTION;
            
            DECLARE @VentaID INT;
            DECLARE @NumeroFactura NVARCHAR(50);
            DECLARE @SubtotalVentaBs DECIMAL(12,2) = 0;
            DECLARE @DescuentoPromocionBs DECIMAL(12,2) = 0;
            DECLARE @DescuentoCuponBs DECIMAL(12,2) = 0;
            DECLARE @TotalVentaBs DECIMAL(12,2) = 0;
            
            DECLARE @NumeroSecuencial INT;
            SELECT @NumeroSecuencial = ISNULL(MAX(CAST(SUBSTRING(NumeroFactura, 10, 10) AS INT)), 0) + 1
            FROM Ventas WITH (TABLOCKX, HOLDLOCK)
            WHERE NumeroFactura LIKE 'SCZ-' + FORMAT(GETDATE(), 'yyyyMMdd') + '%';
            
            SET @NumeroFactura = 'SCZ-' + FORMAT(GETDATE(), 'yyyyMMdd') + '-' + FORMAT(@NumeroSecuencial, '0000');
            
            CREATE TABLE #TempDetalles (
                ProductoID INT,
                Cantidad INT,
                PrecioUnitarioBs DECIMAL(10,2),
                DescuentoBs DECIMAL(10,2),
                SubtotalBs DECIMAL(12,2)
            );
            
            INSERT INTO #TempDetalles (ProductoID, Cantidad, PrecioUnitarioBs, DescuentoBs, SubtotalBs)
            SELECT 
                j.ProductoID,
                j.Cantidad,
                p.PrecioVentaBs,
                0,
                j.Cantidad * p.PrecioVentaBs
            FROM OPENJSON(@DetallesJSON) WITH (ProductoID INT, Cantidad INT) AS j
            INNER JOIN Productos p WITH (UPDLOCK, HOLDLOCK) ON p.ProductoID = j.ProductoID
            WHERE p.Activo = 1;
            
            IF EXISTS (
                SELECT 1 FROM #TempDetalles t
                INNER JOIN Productos p WITH (UPDLOCK, HOLDLOCK) ON t.ProductoID = p.ProductoID
                WHERE p.StockActual < t.Cantidad
            )
            BEGIN
                DECLARE @ProductosSinStock NVARCHAR(MAX);
                SELECT @ProductosSinStock = STRING_AGG(
                    p.NombreProducto + ' (disponible: ' + CAST(p.StockActual AS NVARCHAR) + ', solicitado: ' + CAST(t.Cantidad AS NVARCHAR) + ')', 
                    ', '
                )
                FROM #TempDetalles t
                INNER JOIN Productos p ON t.ProductoID = p.ProductoID
                WHERE p.StockActual < t.Cantidad;
                
                DECLARE @MensajeError NVARCHAR(500) = 'Stock insuficiente para: ' + @ProductosSinStock;
                RAISERROR(@MensajeError, 16, 1);
            END
            
            SELECT @SubtotalVentaBs = SUM(SubtotalBs) FROM #TempDetalles;
            
            IF @CuponID IS NOT NULL
            BEGIN
                DECLARE @TipoDescuento NVARCHAR(20), @ValorDescuento DECIMAL(10,2), @MontoMin DECIMAL(10,2);
                DECLARE @UsosActuales INT, @UsosMaximos INT;
                
                SELECT 
                    @TipoDescuento = TipoDescuento,
                    @ValorDescuento = ValorDescuento,
                    @MontoMin = MontoMinCompra,
                    @UsosActuales = UsosActuales,
                    @UsosMaximos = UsosMaximos
                FROM Cupones WITH (UPDLOCK, HOLDLOCK)
                WHERE CuponID = @CuponID AND Activo = 1;
                
                IF @UsosActuales >= @UsosMaximos
                    RAISERROR('El cupón ha alcanzado el máximo de usos', 16, 1);
                
                IF @SubtotalVentaBs < @MontoMin
                    RAISERROR('El monto de compra no alcanza el mínimo requerido para el cupón', 16, 1);
                
                IF @TipoDescuento = 'PORCENTAJE'
                    SET @DescuentoCuponBs = @SubtotalVentaBs * (@ValorDescuento / 100);
                ELSE IF @TipoDescuento = 'MONTO_FIJO'
                    SET @DescuentoCuponBs = @ValorDescuento;
            END
            
            SET @TotalVentaBs = @SubtotalVentaBs - @DescuentoPromocionBs - @DescuentoCuponBs;
            
            INSERT INTO Ventas (NumeroFactura, ClienteID, DireccionEnvioID, SubtotalVentaBs, DescuentoPromocionBs, DescuentoCuponBs, TotalVentaBs, MetodoPagoID, EstadoID, CuponID, Observaciones)
            VALUES (@NumeroFactura, @ClienteID, @DireccionEnvioID, @SubtotalVentaBs, @DescuentoPromocionBs, @DescuentoCuponBs, @TotalVentaBs, @MetodoPagoID, 1, @CuponID, @Observaciones);
            
            SET @VentaID = SCOPE_IDENTITY();
            
            INSERT INTO DetalleVentas (VentaID, ProductoID, Cantidad, PrecioUnitarioBs, DescuentoBs, SubtotalBs)
            SELECT @VentaID, ProductoID, Cantidad, PrecioUnitarioBs, DescuentoBs, SubtotalBs FROM #TempDetalles;
            
            UPDATE p
            SET p.StockActual = p.StockActual - t.Cantidad
            FROM Productos p
            INNER JOIN #TempDetalles t ON p.ProductoID = t.ProductoID;
            
            INSERT INTO MovimientosStock (ProductoID, TipoMovimientoID, Cantidad, StockAnterior, StockNuevo, UsuarioID, ReferenciaTabla, ReferenciaID, Observaciones)
            SELECT t.ProductoID, 1, t.Cantidad, p.StockActual + t.Cantidad, p.StockActual, @UsuarioID, 'Ventas', @VentaID, 'Venta - ' + @NumeroFactura
            FROM #TempDetalles t
            INNER JOIN Productos p ON t.ProductoID = p.ProductoID;
            
            INSERT INTO HistorialEstadoPedido (VentaID, EstadoID, UsuarioID, Comentario)
            VALUES (@VentaID, 1, @UsuarioID, 'Venta creada');
            
            IF @CuponID IS NOT NULL
                UPDATE Cupones SET UsosActuales = UsosActuales + 1 WHERE CuponID = @CuponID;
            
            DROP TABLE #TempDetalles;
            
            COMMIT TRANSACTION;
            SET @Exitoso = 1;
            
            SELECT @VentaID AS VentaID, @NumeroFactura AS NumeroFactura, @TotalVentaBs AS TotalVentaBs, 'Venta creada exitosamente' AS Mensaje;
            
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0
                ROLLBACK TRANSACTION;
            
            IF OBJECT_ID('tempdb..#TempDetalles') IS NOT NULL
                DROP TABLE #TempDetalles;
            
            IF ERROR_NUMBER() = 1205 AND @Reintentos < @MaxReintentos
            BEGIN
                PRINT 'Deadlock en sp_CrearVenta, reintento ' + CAST(@Reintentos AS NVARCHAR);
                WAITFOR DELAY '00:00:01';
                CONTINUE;
            END;
            
            THROW;
        END CATCH
    END
END
GO

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_CambiarEstadoVenta')
    DROP PROCEDURE sp_CambiarEstadoVenta;
GO

CREATE PROCEDURE sp_CambiarEstadoVenta
    @VentaID INT,
    @NuevoEstadoID INT,
    @UsuarioID INT,
    @Comentario NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        DECLARE @EstadoActual INT;
        
        SELECT @EstadoActual = EstadoID 
        FROM Ventas WITH (UPDLOCK, HOLDLOCK)
        WHERE VentaID = @VentaID;
        
        IF @EstadoActual IS NULL
            RAISERROR('Venta no encontrada', 16, 1);
        
        IF @EstadoActual = @NuevoEstadoID
            RAISERROR('La venta ya está en ese estado', 16, 1);
        
        IF @EstadoActual IN (5, 6)
            RAISERROR('No se puede cambiar el estado de una venta entregada o cancelada', 16, 1);
        
        UPDATE Ventas SET EstadoID = @NuevoEstadoID WHERE VentaID = @VentaID;
        
        INSERT INTO HistorialEstadoPedido (VentaID, EstadoID, UsuarioID, Comentario)
        VALUES (@VentaID, @NuevoEstadoID, @UsuarioID, @Comentario);
        
        COMMIT TRANSACTION;
        
        SELECT @VentaID AS VentaID, @NuevoEstadoID AS EstadoID, 'Estado actualizado' AS Mensaje;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

PRINT '✓ Gestión de Ventas: 2 SPs creados';
GO

-- =============================================
-- CATEGORÍA 5: GESTIÓN DE DEVOLUCIONES
-- =============================================

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_SolicitarDevolucion')
    DROP PROCEDURE sp_SolicitarDevolucion;
GO

CREATE PROCEDURE sp_SolicitarDevolucion
    @VentaID INT,
    @ClienteID INT,
    @Motivo NVARCHAR(500),
    @DetallesJSON NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        DECLARE @DevolucionID INT;
        DECLARE @TotalReembolsoBs DECIMAL(12,2) = 0;
        
        IF NOT EXISTS (
            SELECT 1 FROM Ventas WITH (HOLDLOCK)
            WHERE VentaID = @VentaID 
            AND ClienteID = @ClienteID 
            AND EstadoID = 5
        )
        BEGIN
            RAISERROR('Venta no encontrada, no pertenece al cliente, o no está entregada', 16, 1);
        END
        
        IF EXISTS (
            SELECT 1 FROM Devoluciones 
            WHERE VentaID = @VentaID 
            AND EstadoID IN (1, 2, 3)
        )
        BEGIN
            RAISERROR('Ya existe una devolución pendiente para esta venta', 16, 1);
        END
        
        CREATE TABLE #TempDevoluciones (
            ProductoID INT,
            CantidadDevuelta INT,
            PrecioUnitarioBs DECIMAL(10,2),
            SubtotalReembolsoBs DECIMAL(12,2),
            CondicionProducto NVARCHAR(50)
        );
        
        INSERT INTO #TempDevoluciones (ProductoID, CantidadDevuelta, PrecioUnitarioBs, SubtotalReembolsoBs, CondicionProducto)
        SELECT 
            j.ProductoID,
            j.CantidadDevuelta,
            dv.PrecioUnitarioBs,
            j.CantidadDevuelta * dv.PrecioUnitarioBs,
            j.CondicionProducto
        FROM OPENJSON(@DetallesJSON) WITH (
            ProductoID INT,
            CantidadDevuelta INT,
            CondicionProducto NVARCHAR(50)
        ) AS j
        INNER JOIN DetalleVentas dv ON dv.VentaID = @VentaID AND dv.ProductoID = j.ProductoID;
        
        IF EXISTS (
            SELECT 1 FROM #TempDevoluciones t
            INNER JOIN DetalleVentas dv ON dv.VentaID = @VentaID AND dv.ProductoID = t.ProductoID
            WHERE t.CantidadDevuelta > dv.Cantidad
        )
        BEGIN
            RAISERROR('No se puede devolver más cantidad de la comprada', 16, 1);
        END
        
        SELECT @TotalReembolsoBs = SUM(SubtotalReembolsoBs) FROM #TempDevoluciones;
        
        INSERT INTO Devoluciones (VentaID, ClienteID, Motivo, EstadoID, TotalReembolsoBs)
        VALUES (@VentaID, @ClienteID, @Motivo, 1, @TotalReembolsoBs);
        
        SET @DevolucionID = SCOPE_IDENTITY();
        
        INSERT INTO DetalleDevoluciones (DevolucionID, ProductoID, CantidadDevuelta, PrecioUnitarioBs, SubtotalReembolsoBs, CondicionProducto)
        SELECT @DevolucionID, ProductoID, CantidadDevuelta, PrecioUnitarioBs, SubtotalReembolsoBs, CondicionProducto
        FROM #TempDevoluciones;
        
        INSERT INTO HistorialEstadoDevolucion (DevolucionID, EstadoID, UsuarioID, Comentario)
        VALUES (@DevolucionID, 1, NULL, 'Cliente solicita devolución - ' + @Motivo);
        
        DROP TABLE #TempDevoluciones;
        
        COMMIT TRANSACTION;
        
        SELECT @DevolucionID AS DevolucionID, @TotalReembolsoBs AS TotalReembolsoBs, 'Devolución solicitada exitosamente' AS Mensaje;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        IF OBJECT_ID('tempdb..#TempDevoluciones') IS NOT NULL
            DROP TABLE #TempDevoluciones;
        
        THROW;
    END CATCH
END
GO

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_CambiarEstadoDevolucion')
    DROP PROCEDURE sp_CambiarEstadoDevolucion;
GO

CREATE PROCEDURE sp_CambiarEstadoDevolucion
    @DevolucionID INT,
    @NuevoEstadoID INT,
    @UsuarioID INT,
    @Comentario NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    
    DECLARE @Reintentos INT = 0;
    DECLARE @MaxReintentos INT = 3;
    DECLARE @Exitoso BIT = 0;
    
    WHILE @Reintentos < @MaxReintentos AND @Exitoso = 0
    BEGIN
        SET @Reintentos = @Reintentos + 1;
        
        BEGIN TRY
            BEGIN TRANSACTION;
            
            DECLARE @EstadoActual INT;
            
            SELECT @EstadoActual = EstadoID 
            FROM Devoluciones WITH (UPDLOCK, HOLDLOCK)
            WHERE DevolucionID = @DevolucionID;
            
            IF @EstadoActual IS NULL
                RAISERROR('Devolución no encontrada', 16, 1);
            
            UPDATE Devoluciones 
            SET EstadoID = @NuevoEstadoID,
                UsuarioAprobador = @UsuarioID,
                FechaResolucion = CASE WHEN @NuevoEstadoID IN (3, 4) THEN GETDATE() ELSE FechaResolucion END
            WHERE DevolucionID = @DevolucionID;
            
            INSERT INTO HistorialEstadoDevolucion (DevolucionID, EstadoID, UsuarioID, Comentario)
            VALUES (@DevolucionID, @NuevoEstadoID, @UsuarioID, @Comentario);
            
            IF @NuevoEstadoID = 3
            BEGIN
                UPDATE p
                SET p.StockActual = p.StockActual + dd.CantidadDevuelta
                FROM Productos p WITH (UPDLOCK, HOLDLOCK)
                INNER JOIN DetalleDevoluciones dd ON p.ProductoID = dd.ProductoID
                WHERE dd.DevolucionID = @DevolucionID;
                
                INSERT INTO MovimientosStock (ProductoID, TipoMovimientoID, Cantidad, StockAnterior, StockNuevo, UsuarioID, ReferenciaTabla, ReferenciaID, Observaciones)
                SELECT 
                    dd.ProductoID,
                    3,
                    dd.CantidadDevuelta,
                    p.StockActual - dd.CantidadDevuelta,
                    p.StockActual,
                    @UsuarioID,
                    'Devoluciones',
                    @DevolucionID,
                    'Devolución aprobada - Producto: ' + dd.CondicionProducto
                FROM DetalleDevoluciones dd
                INNER JOIN Productos p ON dd.ProductoID = p.ProductoID
                WHERE dd.DevolucionID = @DevolucionID;
            END
            
            COMMIT TRANSACTION;
            SET @Exitoso = 1;
            
            SELECT @DevolucionID AS DevolucionID, @NuevoEstadoID AS EstadoID, 'Estado de devolución actualizado' AS Mensaje;
            
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0
                ROLLBACK TRANSACTION;
            
            IF ERROR_NUMBER() = 1205 AND @Reintentos < @MaxReintentos
            BEGIN
                PRINT 'Deadlock en sp_CambiarEstadoDevolucion, reintento ' + CAST(@Reintentos AS NVARCHAR);
                WAITFOR DELAY '00:00:01';
                CONTINUE;
            END;
            
            THROW;
        END CATCH
    END
END
GO

PRINT '✓ Gestión de Devoluciones: 2 SPs creados';
GO

-- =============================================
-- CATEGORÍA 6: GESTIÓN DE PROMOCIONES
-- =============================================

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_CrearPromocion')
    DROP PROCEDURE sp_CrearPromocion;
GO

CREATE PROCEDURE sp_CrearPromocion
    @NombrePromocion NVARCHAR(150),
    @Descripcion NVARCHAR(500) = NULL,
    @TipoDescuento NVARCHAR(20),
    @ValorDescuento DECIMAL(10,2),
    @FechaInicio DATETIME,
    @FechaFin DATETIME,
    @ProductosJSON NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    
    DECLARE @Reintentos INT = 0;
    DECLARE @MaxReintentos INT = 3;
    DECLARE @Exitoso BIT = 0;
    
    WHILE @Reintentos < @MaxReintentos AND @Exitoso = 0
    BEGIN
        SET @Reintentos = @Reintentos + 1;
        
        BEGIN TRY
            BEGIN TRANSACTION;
            
            DECLARE @PromocionID INT;
            
            IF @TipoDescuento NOT IN ('PORCENTAJE', 'MONTO_FIJO', '4X3')
            BEGIN
                RAISERROR('Tipo de descuento inválido. Use: PORCENTAJE, MONTO_FIJO o 4X3', 16, 1);
            END
            
            IF @TipoDescuento = 'PORCENTAJE' AND (@ValorDescuento <= 0 OR @ValorDescuento > 100)
            BEGIN
                RAISERROR('Para descuento por PORCENTAJE el valor debe estar entre 0 y 100', 16, 1);
            END
            
            IF @FechaFin <= @FechaInicio
            BEGIN
                RAISERROR('La fecha de fin debe ser posterior a la fecha de inicio', 16, 1);
            END
            
            IF EXISTS (
                SELECT 1 
                FROM Promociones WITH (UPDLOCK, HOLDLOCK) 
                WHERE NombrePromocion = @NombrePromocion 
                AND Activa = 1
            )
            BEGIN
                RAISERROR('Ya existe una promoción activa con ese nombre', 16, 1);
            END
            
            INSERT INTO Promociones (
                NombrePromocion, 
                Descripcion, 
                TipoDescuento, 
                ValorDescuento, 
                FechaInicio, 
                FechaFin, 
                Activa
            )
            VALUES (
                @NombrePromocion,
                @Descripcion,
                @TipoDescuento,
                @ValorDescuento,
                @FechaInicio,
                @FechaFin,
                1
            );
            
            SET @PromocionID = SCOPE_IDENTITY();
            
            IF @ProductosJSON IS NOT NULL
            BEGIN
                INSERT INTO ProductosEnPromocion (PromocionID, ProductoID)
                SELECT 
                    @PromocionID,
                    ProductoID
                FROM OPENJSON(@ProductosJSON) WITH (ProductoID INT '$') AS j
                WHERE EXISTS (
                    SELECT 1 FROM Productos p 
                    WHERE p.ProductoID = j.ProductoID 
                    AND p.Activo = 1
                );
            END
            
            COMMIT TRANSACTION;
            SET @Exitoso = 1;
            
            SELECT 
                @PromocionID AS PromocionID,
                'Promoción creada exitosamente' AS Mensaje;
            
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0
                ROLLBACK TRANSACTION;
            
            IF ERROR_NUMBER() = 1205 AND @Reintentos < @MaxReintentos
            BEGIN
                PRINT 'Deadlock detectado en sp_CrearPromocion, reintento ' + CAST(@Reintentos AS NVARCHAR);
                WAITFOR DELAY '00:00:01';
                CONTINUE;
            END;
            
            THROW;
        END CATCH
    END
END
GO

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_AsignarProductosPromocion')
    DROP PROCEDURE sp_AsignarProductosPromocion;
GO

CREATE PROCEDURE sp_AsignarProductosPromocion
    @PromocionID INT,
    @ProductosJSON NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        DECLARE @Activa BIT;
        
        SELECT @Activa = Activa
        FROM Promociones WITH (HOLDLOCK)
        WHERE PromocionID = @PromocionID;
        
        IF @Activa IS NULL
        BEGIN
            RAISERROR('Promoción no encontrada', 16, 1);
        END
        
        IF @Activa = 0
        BEGIN
            RAISERROR('No se pueden asignar productos a una promoción inactiva', 16, 1);
        END
        
        MERGE ProductosEnPromocion AS Target
        USING (
            SELECT 
                @PromocionID AS PromocionID,
                j.ProductoID
            FROM OPENJSON(@ProductosJSON) WITH (ProductoID INT '$') AS j
            INNER JOIN Productos p ON j.ProductoID = p.ProductoID
            WHERE p.Activo = 1
        ) AS Source
        ON Target.PromocionID = Source.PromocionID 
        AND Target.ProductoID = Source.ProductoID
        WHEN NOT MATCHED BY TARGET THEN
            INSERT (PromocionID, ProductoID)
            VALUES (Source.PromocionID, Source.ProductoID);
        
        COMMIT TRANSACTION;
        
        SELECT 
            @PromocionID AS PromocionID,
            'Productos asignados exitosamente' AS Mensaje;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        THROW;
    END CATCH
END
GO

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_CambiarEstadoPromocion')
    DROP PROCEDURE sp_CambiarEstadoPromocion;
GO

CREATE PROCEDURE sp_CambiarEstadoPromocion
    @PromocionID INT,
    @Activa BIT
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        IF NOT EXISTS (SELECT 1 FROM Promociones WHERE PromocionID = @PromocionID)
        BEGIN
            RAISERROR('Promoción no encontrada', 16, 1);
        END
        
        UPDATE Promociones WITH (UPDLOCK)
        SET Activa = @Activa
        WHERE PromocionID = @PromocionID;
        
        COMMIT TRANSACTION;
        
        SELECT 
            @PromocionID AS PromocionID,
            CASE WHEN @Activa = 1 THEN 'Promoción activada' ELSE 'Promoción desactivada' END AS Mensaje;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        THROW;
    END CATCH
END
GO

PRINT '✓ Gestión de Promociones: 3 SPs creados';
GO

-- =============================================
-- CATEGORÍA 7: GESTIÓN DE CUPONES
-- =============================================

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_CrearCupon')
    DROP PROCEDURE sp_CrearCupon;
GO

CREATE PROCEDURE sp_CrearCupon
    @CodigoCupon NVARCHAR(50),
    @Descripcion NVARCHAR(255) = NULL,
    @TipoDescuento NVARCHAR(20),
    @ValorDescuento DECIMAL(10,2),
    @MontoMinCompra DECIMAL(10,2) = 0,
    @UsosMaximos INT = NULL,
    @FechaInicio DATETIME,
    @FechaExpiracion DATETIME
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    
    DECLARE @Reintentos INT = 0;
    DECLARE @MaxReintentos INT = 3;
    DECLARE @Exitoso BIT = 0;
    
    WHILE @Reintentos < @MaxReintentos AND @Exitoso = 0
    BEGIN
        SET @Reintentos = @Reintentos + 1;
        
        BEGIN TRY
            BEGIN TRANSACTION;
            
            DECLARE @CuponID INT;
            
            IF @TipoDescuento NOT IN ('PORCENTAJE', 'MONTO_FIJO')
            BEGIN
                RAISERROR('Tipo de descuento inválido. Use: PORCENTAJE o MONTO_FIJO', 16, 1);
            END
            
            IF @TipoDescuento = 'PORCENTAJE' AND (@ValorDescuento <= 0 OR @ValorDescuento > 100)
            BEGIN
                RAISERROR('Para descuento por PORCENTAJE el valor debe estar entre 0 y 100', 16, 1);
            END
            
            IF @FechaExpiracion <= @FechaInicio
            BEGIN
                RAISERROR('La fecha de expiración debe ser posterior a la fecha de inicio', 16, 1);
            END
            
            IF EXISTS (
                SELECT 1 
                FROM Cupones WITH (UPDLOCK, HOLDLOCK) 
                WHERE CodigoCupon = @CodigoCupon
            )
            BEGIN
                RAISERROR('Ya existe un cupón con ese código', 16, 1);
            END
            
            INSERT INTO Cupones (
                CodigoCupon,
                Descripcion,
                TipoDescuento,
                ValorDescuento,
                MontoMinCompra,
                UsosMaximos,
                UsosActuales,
                FechaInicio,
                FechaExpiracion,
                Activo
            )
            VALUES (
                @CodigoCupon,
                @Descripcion,
                @TipoDescuento,
                @ValorDescuento,
                @MontoMinCompra,
                @UsosMaximos,
                0,
                @FechaInicio,
                @FechaExpiracion,
                1
            );
            
            SET @CuponID = SCOPE_IDENTITY();
            
            COMMIT TRANSACTION;
            SET @Exitoso = 1;
            
            SELECT 
                @CuponID AS CuponID,
                @CodigoCupon AS CodigoCupon,
                'Cupón creado exitosamente' AS Mensaje;
            
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0
                ROLLBACK TRANSACTION;
            
            IF ERROR_NUMBER() = 1205 AND @Reintentos < @MaxReintentos
            BEGIN
                PRINT 'Deadlock en sp_CrearCupon, reintento ' + CAST(@Reintentos AS NVARCHAR);
                WAITFOR DELAY '00:00:01';
                CONTINUE;
            END;
            
            THROW;
        END CATCH
    END
END
GO

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_ValidarCupon')
    DROP PROCEDURE sp_ValidarCupon;
GO

CREATE PROCEDURE sp_ValidarCupon
    @CodigoCupon NVARCHAR(50),
    @MontoCompra DECIMAL(10,2)
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
    
    BEGIN TRY
        DECLARE @CuponID INT;
        DECLARE @Activo BIT;
        DECLARE @TipoDescuento NVARCHAR(20);
        DECLARE @ValorDescuento DECIMAL(10,2);
        DECLARE @MontoMinCompra DECIMAL(10,2);
        DECLARE @UsosMaximos INT;
        DECLARE @UsosActuales INT;
        DECLARE @FechaInicio DATETIME;
        DECLARE @FechaExpiracion DATETIME;
        DECLARE @DescuentoCalculado DECIMAL(10,2);
        
        SELECT 
            @CuponID = CuponID,
            @Activo = Activo,
            @TipoDescuento = TipoDescuento,
            @ValorDescuento = ValorDescuento,
            @MontoMinCompra = MontoMinCompra,
            @UsosMaximos = UsosMaximos,
            @UsosActuales = UsosActuales,
            @FechaInicio = FechaInicio,
            @FechaExpiracion = FechaExpiracion
        FROM Cupones
        WHERE CodigoCupon = @CodigoCupon;
        
        IF @CuponID IS NULL
        BEGIN
            SELECT 
                0 AS Valido,
                'Cupón no encontrado' AS Mensaje,
                0.00 AS DescuentoBs;
            RETURN;
        END
        
        IF @Activo = 0
        BEGIN
            SELECT 
                0 AS Valido,
                'Cupón inactivo' AS Mensaje,
                0.00 AS DescuentoBs;
            RETURN;
        END
        
        IF GETDATE() < @FechaInicio
        BEGIN
            SELECT 
                0 AS Valido,
                'Cupón aún no está vigente' AS Mensaje,
                0.00 AS DescuentoBs;
            RETURN;
        END
        
        IF GETDATE() > @FechaExpiracion
        BEGIN
            SELECT 
                0 AS Valido,
                'Cupón expirado' AS Mensaje,
                0.00 AS DescuentoBs;
            RETURN;
        END
        
        IF @MontoCompra < @MontoMinCompra
        BEGIN
            SELECT 
                0 AS Valido,
                'Monto mínimo de compra no alcanzado. Mínimo: Bs ' + CAST(@MontoMinCompra AS NVARCHAR) AS Mensaje,
                0.00 AS DescuentoBs;
            RETURN;
        END
        
        IF @UsosMaximos IS NOT NULL AND @UsosActuales >= @UsosMaximos
        BEGIN
            SELECT 
                0 AS Valido,
                'Cupón agotado (máximo de usos alcanzado)' AS Mensaje,
                0.00 AS DescuentoBs;
            RETURN;
        END
        
        IF @TipoDescuento = 'PORCENTAJE'
        BEGIN
            SET @DescuentoCalculado = @MontoCompra * (@ValorDescuento / 100.0);
        END
        ELSE
        BEGIN
            SET @DescuentoCalculado = @ValorDescuento;
        END
        
        SELECT 
            1 AS Valido,
            'Cupón válido' AS Mensaje,
            @CuponID AS CuponID,
            @TipoDescuento AS TipoDescuento,
            @ValorDescuento AS ValorDescuento,
            @DescuentoCalculado AS DescuentoBs;
        
    END TRY
    BEGIN CATCH
        SELECT 
            0 AS Valido,
            'Error al validar cupón: ' + ERROR_MESSAGE() AS Mensaje,
            0.00 AS DescuentoBs;
    END CATCH
END
GO

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_AplicarCupon')
    DROP PROCEDURE sp_AplicarCupon;
GO

CREATE PROCEDURE sp_AplicarCupon
    @CuponID INT
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    
    DECLARE @Reintentos INT = 0;
    DECLARE @MaxReintentos INT = 3;
    DECLARE @Exitoso BIT = 0;
    
    WHILE @Reintentos < @MaxReintentos AND @Exitoso = 0
    BEGIN
        SET @Reintentos = @Reintentos + 1;
        
        BEGIN TRY
            BEGIN TRANSACTION;
            
            DECLARE @UsosMaximos INT;
            DECLARE @UsosActuales INT;
            
            SELECT 
                @UsosMaximos = UsosMaximos,
                @UsosActuales = UsosActuales
            FROM Cupones WITH (UPDLOCK, HOLDLOCK)
            WHERE CuponID = @CuponID;
            
            IF @UsosMaximos IS NOT NULL AND @UsosActuales >= @UsosMaximos
            BEGIN
                RAISERROR('Cupón agotado', 16, 1);
            END
            
            UPDATE Cupones
            SET UsosActuales = UsosActuales + 1
            WHERE CuponID = @CuponID;
            
            COMMIT TRANSACTION;
            SET @Exitoso = 1;
            
            SELECT 
                @CuponID AS CuponID,
                'Cupón aplicado exitosamente' AS Mensaje;
            
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0
                ROLLBACK TRANSACTION;
            
            IF ERROR_NUMBER() = 1205 AND @Reintentos < @MaxReintentos
            BEGIN
                PRINT 'Deadlock en sp_AplicarCupon, reintento ' + CAST(@Reintentos AS NVARCHAR);
                WAITFOR DELAY '00:00:01';
                CONTINUE;
            END;
            
            THROW;
        END CATCH
    END
END
GO

PRINT '✓ Gestión de Cupones: 3 SPs creados';
GO

-- =============================================
-- CATEGORÍA 8: GESTIÓN DE DIRECCIONES
-- =============================================

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_AgregarDireccionCliente')
    DROP PROCEDURE sp_AgregarDireccionCliente;
GO

CREATE PROCEDURE sp_AgregarDireccionCliente
    @ClienteID INT,
    @NombreDireccion NVARCHAR(50) = NULL,
    @Calle NVARCHAR(255),
    @Zona NVARCHAR(100) = NULL,
    @CiudadID INT,
    @Referencia NVARCHAR(255) = NULL,
    @EsPrincipal BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    
    DECLARE @Reintentos INT = 0;
    DECLARE @MaxReintentos INT = 3;
    DECLARE @Exitoso BIT = 0;
    
    WHILE @Reintentos < @MaxReintentos AND @Exitoso = 0
    BEGIN
        SET @Reintentos = @Reintentos + 1;
        
        BEGIN TRY
            BEGIN TRANSACTION;
            
            DECLARE @DireccionID INT;
            
            IF NOT EXISTS (SELECT 1 FROM Clientes WHERE ClienteID = @ClienteID)
            BEGIN
                RAISERROR('Cliente no encontrado', 16, 1);
            END
            
            IF NOT EXISTS (SELECT 1 FROM Ciudades WHERE CiudadID = @CiudadID)
            BEGIN
                RAISERROR('Ciudad no encontrada', 16, 1);
            END
            
            IF @EsPrincipal = 1
            BEGIN
                UPDATE Direcciones WITH (UPDLOCK)
                SET EsPrincipal = 0
                WHERE ClienteID = @ClienteID
                AND EsPrincipal = 1
                AND Activo = 1;
            END
            
            INSERT INTO Direcciones (
                ClienteID,
                NombreDireccion,
                Calle,
                Zona,
                CiudadID,
                Referencia,
                EsPrincipal,
                Activo
            )
            VALUES (
                @ClienteID,
                @NombreDireccion,
                @Calle,
                @Zona,
                @CiudadID,
                @Referencia,
                @EsPrincipal,
                1
            );
            
            SET @DireccionID = SCOPE_IDENTITY();
            
            COMMIT TRANSACTION;
            SET @Exitoso = 1;
            
            SELECT 
                @DireccionID AS DireccionID,
                'Dirección agregada exitosamente' AS Mensaje;
            
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0
                ROLLBACK TRANSACTION;
            
            IF ERROR_NUMBER() = 1205 AND @Reintentos < @MaxReintentos
            BEGIN
                PRINT 'Deadlock en sp_AgregarDireccionCliente, reintento ' + CAST(@Reintentos AS NVARCHAR);
                WAITFOR DELAY '00:00:01';
                CONTINUE;
            END;
            
            THROW;
        END CATCH
    END
END
GO

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_EstablecerDireccionPrincipal')
    DROP PROCEDURE sp_EstablecerDireccionPrincipal;
GO

CREATE PROCEDURE sp_EstablecerDireccionPrincipal
    @DireccionID INT,
    @ClienteID INT
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    
    DECLARE @Reintentos INT = 0;
    DECLARE @MaxReintentos INT = 3;
    DECLARE @Exitoso BIT = 0;
    
    WHILE @Reintentos < @MaxReintentos AND @Exitoso = 0
    BEGIN
        SET @Reintentos = @Reintentos + 1;
        
        BEGIN TRY
            BEGIN TRANSACTION;
            
            IF NOT EXISTS (
                SELECT 1 FROM Direcciones 
                WHERE DireccionID = @DireccionID 
                AND ClienteID = @ClienteID
                AND Activo = 1
            )
            BEGIN
                RAISERROR('Dirección no encontrada o no pertenece al cliente', 16, 1);
            END
            
            UPDATE Direcciones WITH (UPDLOCK)
            SET EsPrincipal = 0
            WHERE ClienteID = @ClienteID
            AND Activo = 1;
            
            UPDATE Direcciones
            SET EsPrincipal = 1
            WHERE DireccionID = @DireccionID;
            
            COMMIT TRANSACTION;
            SET @Exitoso = 1;
            
            SELECT 
                @DireccionID AS DireccionID,
                'Dirección establecida como principal' AS Mensaje;
            
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0
                ROLLBACK TRANSACTION;
            
            IF ERROR_NUMBER() = 1205 AND @Reintentos < @MaxReintentos
            BEGIN
                WAITFOR DELAY '00:00:01';
                CONTINUE;
            END;
            
            THROW;
        END CATCH
    END
END
GO

PRINT '✓ Gestión de Direcciones: 2 SPs creados';
GO

-- =============================================
-- CATEGORÍA 9: GESTIÓN DE PROVEEDORES
-- =============================================

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_CrearProveedor')
    DROP PROCEDURE sp_CrearProveedor;
GO

CREATE PROCEDURE sp_CrearProveedor
    @NombreProveedor NVARCHAR(150),
    @NIT NVARCHAR(20),
    @Telefono NVARCHAR(20) = NULL,
    @Email NVARCHAR(100) = NULL,
    @Direccion NVARCHAR(255) = NULL,
    @CiudadID INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    
    DECLARE @Reintentos INT = 0;
    DECLARE @MaxReintentos INT = 3;
    DECLARE @Exitoso BIT = 0;
    
    WHILE @Reintentos < @MaxReintentos AND @Exitoso = 0
    BEGIN
        SET @Reintentos = @Reintentos + 1;
        
        BEGIN TRY
            BEGIN TRANSACTION;
            
            DECLARE @ProveedorID INT;
            
            IF EXISTS (
                SELECT 1 
                FROM Proveedores WITH (UPDLOCK, HOLDLOCK) 
                WHERE NIT = @NIT
            )
            BEGIN
                RAISERROR('Ya existe un proveedor con ese NIT', 16, 1);
            END
            
            IF @CiudadID IS NOT NULL AND NOT EXISTS (
                SELECT 1 FROM Ciudades WHERE CiudadID = @CiudadID
            )
            BEGIN
                RAISERROR('Ciudad no encontrada', 16, 1);
            END
            
            INSERT INTO Proveedores (
                NombreProveedor,
                NIT,
                Telefono,
                Email,
                Direccion,
                CiudadID,
                Activo
            )
            VALUES (
                @NombreProveedor,
                @NIT,
                @Telefono,
                @Email,
                @Direccion,
                @CiudadID,
                1
            );
            
            SET @ProveedorID = SCOPE_IDENTITY();
            
            COMMIT TRANSACTION;
            SET @Exitoso = 1;
            
            SELECT 
                @ProveedorID AS ProveedorID,
                'Proveedor creado exitosamente' AS Mensaje;
            
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0
                ROLLBACK TRANSACTION;
            
            IF ERROR_NUMBER() = 1205 AND @Reintentos < @MaxReintentos
            BEGIN
                PRINT 'Deadlock en sp_CrearProveedor, reintento ' + CAST(@Reintentos AS NVARCHAR);
                WAITFOR DELAY '00:00:01';
                CONTINUE;
            END;
            
            THROW;
        END CATCH
    END
END
GO

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_ActualizarProveedor')
    DROP PROCEDURE sp_ActualizarProveedor;
GO

CREATE PROCEDURE sp_ActualizarProveedor
    @ProveedorID INT,
    @NombreProveedor NVARCHAR(150) = NULL,
    @Telefono NVARCHAR(20) = NULL,
    @Email NVARCHAR(100) = NULL,
    @Direccion NVARCHAR(255) = NULL,
    @CiudadID INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        IF NOT EXISTS (SELECT 1 FROM Proveedores WHERE ProveedorID = @ProveedorID)
        BEGIN
            RAISERROR('Proveedor no encontrado', 16, 1);
        END
        
        UPDATE Proveedores WITH (UPDLOCK)
        SET 
            NombreProveedor = ISNULL(@NombreProveedor, NombreProveedor),
            Telefono = ISNULL(@Telefono, Telefono),
            Email = ISNULL(@Email, Email),
            Direccion = ISNULL(@Direccion, Direccion),
            CiudadID = ISNULL(@CiudadID, CiudadID)
        WHERE ProveedorID = @ProveedorID;
        
        COMMIT TRANSACTION;
        
        SELECT 
            @ProveedorID AS ProveedorID,
            'Proveedor actualizado exitosamente' AS Mensaje;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        THROW;
    END CATCH
END
GO

ALTER PROCEDURE sp_ObtenerProductosCatalogo
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
    
    -- Selecciona todos los campos de la vista optimizada para el cliente.
    SELECT * FROM vw_ProductosDisponibles
    ORDER BY Destacado DESC, NombreProducto ASC;
END
GO

CREATE PROCEDURE sp_ObtenerCategoriasConProductos
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
    
    SELECT DISTINCT 
        c.CategoriaID,
        c.NombreCategoria
    FROM Categorias c
    INNER JOIN Productos p 
        ON c.CategoriaID = p.CategoriaID
    WHERE 
        p.Activo = 1         -- Solo productos activos
        AND p.StockActual > 0  -- Solo productos con stock disponible
    ORDER BY 
        c.NombreCategoria ASC;
END
GO



exec sp_ObtenerCategoriasConProductos