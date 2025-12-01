-- ============================================================================
-- TRIGGERS - AVILA'S TYRE COMPANY
-- ============================================================================
-- Automatización de operaciones críticas
-- ============================================================================

USE [Avila's Tyre Company];
GO

PRINT '============================================================================';
PRINT 'CREANDO TRIGGERS DEL SISTEMA';
PRINT '============================================================================';

-- ============================================================================
-- TRIGGER 1: Actualizar Stock al Crear Venta
-- ============================================================================
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_ActualizarStockVenta')
    DROP TRIGGER trg_ActualizarStockVenta;
GO

CREATE TRIGGER trg_ActualizarStockVenta
ON DetalleVentas
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    
    /*
    PROPÓSITO: Reducir automáticamente el stock cuando se crea un detalle de venta
    TRANSACCIÓN: Ya está dentro de la transacción de sp_CrearVenta
    */
    
    BEGIN TRY
        -- Actualizar stock de productos vendidos
        UPDATE p
        SET p.StockActual = p.StockActual - i.Cantidad
        FROM Productos p
        INNER JOIN inserted i ON p.ProductoID = i.ProductoID;
        
        -- Registrar movimiento en historial
        INSERT INTO MovimientosStock (
            ProductoID,
            TipoMovimientoID,
            Cantidad,
            StockAnterior,
            StockNuevo,
            UsuarioID,
            ReferenciaTabla,
            ReferenciaID,
            Observaciones
        )
        SELECT 
            p.ProductoID,
            1, -- VENTA
            i.Cantidad,
            p.StockActual + i.Cantidad, -- Stock antes del UPDATE
            p.StockActual, -- Stock después del UPDATE
            1, -- UsuarioID (se puede mejorar)
            'Ventas',
            i.VentaID,
            'Venta registrada - Producto: ' + p.NombreProducto
        FROM inserted i
        INNER JOIN Productos p ON i.ProductoID = p.ProductoID;
        
    END TRY
    BEGIN CATCH
        -- Si hay error, la transacción del SP se encargará del ROLLBACK
        THROW;
    END CATCH
END
GO
PRINT '✓ Trigger: trg_ActualizarStockVenta';

-- ============================================================================
-- TRIGGER 2: Actualizar Stock al Recibir Compra
-- ============================================================================
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_ActualizarStockCompra')
    DROP TRIGGER trg_ActualizarStockCompra;
GO

CREATE TRIGGER trg_ActualizarStockCompra
ON DetalleCompras
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    
    /*
    PROPÓSITO: Aumentar automáticamente el stock cuando se recibe una compra
    SOLO SE EJECUTA: Cuando el estado de la compra es "Recibida" (EstadoCompraID = 4)
    */
    
    BEGIN TRY
        -- Verificar que la compra esté en estado "Recibida"
        IF EXISTS (
            SELECT 1 
            FROM inserted i
            INNER JOIN Compras c ON i.CompraID = c.CompraID
            WHERE c.EstadoCompraID = 4 -- Recibida
        )
        BEGIN
            -- Actualizar stock
            UPDATE p
            SET p.StockActual = p.StockActual + i.Cantidad
            FROM Productos p
            INNER JOIN inserted i ON p.ProductoID = i.ProductoID
            INNER JOIN Compras c ON i.CompraID = c.CompraID
            WHERE c.EstadoCompraID = 4;
            
            -- Registrar movimiento
            INSERT INTO MovimientosStock (
                ProductoID,
                TipoMovimientoID,
                Cantidad,
                StockAnterior,
                StockNuevo,
                UsuarioID,
                ReferenciaTabla,
                ReferenciaID,
                Observaciones
            )
            SELECT 
                p.ProductoID,
                2, -- COMPRA
                i.Cantidad,
                p.StockActual - i.Cantidad,
                p.StockActual,
                c.UsuarioID,
                'Compras',
                i.CompraID,
                'Compra recibida - ' + CAST(i.Cantidad AS NVARCHAR) + ' unidades'
            FROM inserted i
            INNER JOIN Productos p ON i.ProductoID = p.ProductoID
            INNER JOIN Compras c ON i.CompraID = c.CompraID
            WHERE c.EstadoCompraID = 4;
        END
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END
GO
PRINT '✓ Trigger: trg_ActualizarStockCompra';

-- ============================================================================
-- TRIGGER 3: Actualizar Stock al Aprobar Devolución
-- ============================================================================
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_ActualizarStockDevolucion')
    DROP TRIGGER trg_ActualizarStockDevolucion;
GO

CREATE TRIGGER trg_ActualizarStockDevolucion
ON DetalleDevoluciones
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    
    /*
    PROPÓSITO: Devolver productos al stock cuando se aprueba una devolución
    SOLO SE EJECUTA: Cuando la devolución está aprobada (EstadoID = 3)
    */
    
    BEGIN TRY
        -- Verificar que la devolución esté aprobada
        IF EXISTS (
            SELECT 1 
            FROM inserted i
            INNER JOIN Devoluciones d ON i.DevolucionID = d.DevolucionID
            WHERE d.EstadoID = 3 -- Aprobada
        )
        BEGIN
            -- Aumentar stock solo si el producto está en condición NUEVO o BUENO
            UPDATE p
            SET p.StockActual = p.StockActual + i.CantidadDevuelta
            FROM Productos p
            INNER JOIN inserted i ON p.ProductoID = i.ProductoID
            INNER JOIN Devoluciones d ON i.DevolucionID = d.DevolucionID
            WHERE d.EstadoID = 3
            AND i.CondicionProducto IN ('NUEVO', 'BUENO');
            
            -- Registrar movimiento
            INSERT INTO MovimientosStock (
                ProductoID,
                TipoMovimientoID,
                Cantidad,
                StockAnterior,
                StockNuevo,
                UsuarioID,
                ReferenciaTabla,
                ReferenciaID,
                Observaciones
            )
            SELECT 
                p.ProductoID,
                3, -- DEVOLUCION_CLIENTE
                i.CantidadDevuelta,
                p.StockActual - i.CantidadDevuelta,
                p.StockActual,
                d.UsuarioAprobador,
                'Devoluciones',
                i.DevolucionID,
                'Devolución aprobada - Condición: ' + i.CondicionProducto
            FROM inserted i
            INNER JOIN Productos p ON i.ProductoID = p.ProductoID
            INNER JOIN Devoluciones d ON i.DevolucionID = d.DevolucionID
            WHERE d.EstadoID = 3
            AND i.CondicionProducto IN ('NUEVO', 'BUENO');
        END
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END
GO
PRINT '✓ Trigger: trg_ActualizarStockDevolucion';

-- ============================================================================
-- TRIGGER 4: Validar Stock Suficiente ANTES de Venta
-- ============================================================================
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_ValidarStockAntesVenta')
    DROP TRIGGER trg_ValidarStockAntesVenta;
GO

CREATE TRIGGER trg_ValidarStockAntesVenta
ON DetalleVentas
INSTEAD OF INSERT
AS
BEGIN
    SET NOCOUNT ON;
    
    /*
    PROPÓSITO: Validar que hay stock suficiente ANTES de crear el detalle de venta
    TIPO: INSTEAD OF - Intercepta el INSERT para validar primero
    */
    
    BEGIN TRY
        -- Verificar stock insuficiente
        DECLARE @ProductosSinStock TABLE (
            ProductoID INT,
            NombreProducto NVARCHAR(255),
            CantidadSolicitada INT,
            StockActual INT
        );
        
        INSERT INTO @ProductosSinStock
        SELECT 
            p.ProductoID,
            p.NombreProducto,
            i.Cantidad,
            p.StockActual
        FROM inserted i
        INNER JOIN Productos p ON i.ProductoID = p.ProductoID
        WHERE p.StockActual < i.Cantidad OR p.Activo = 0;
        
        -- Si hay productos sin stock, abortar
        IF EXISTS (SELECT 1 FROM @ProductosSinStock)
        BEGIN
            DECLARE @ErrorMsg NVARCHAR(MAX);
            
            SELECT @ErrorMsg = STRING_AGG(
                'Producto: ' + NombreProducto + 
                ' - Solicitado: ' + CAST(CantidadSolicitada AS NVARCHAR) + 
                ' - Disponible: ' + CAST(StockActual AS NVARCHAR),
                '; '
            )
            FROM @ProductosSinStock;
            
            RAISERROR('Stock insuficiente. %s', 16, 1, @ErrorMsg);
            RETURN;
        END
        
        -- Si todo OK, hacer el INSERT real
        INSERT INTO DetalleVentas (
            VentaID,
            ProductoID,
            Cantidad,
            PrecioUnitarioBs,
            DescuentoBs,
            SubtotalBs
        )
        SELECT 
            VentaID,
            ProductoID,
            Cantidad,
            PrecioUnitarioBs,
            DescuentoBs,
            SubtotalBs
        FROM inserted;
        
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END
GO
PRINT '✓ Trigger: trg_ValidarStockAntesVenta';

-- ============================================================================
-- TRIGGER 5: Actualizar Totales de Venta Automáticamente
-- ============================================================================
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_ActualizarTotalesVenta')
    DROP TRIGGER trg_ActualizarTotalesVenta;
GO

CREATE TRIGGER trg_ActualizarTotalesVenta
ON DetalleVentas
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    
    /*
    PROPÓSITO: Recalcular automáticamente los totales de la venta
    cuando se agregan, modifican o eliminan detalles
    */
    
    BEGIN TRY
        -- Obtener VentaIDs afectados
        DECLARE @VentasAfectadas TABLE (VentaID INT);
        
        INSERT INTO @VentasAfectadas
        SELECT DISTINCT VentaID FROM inserted
        UNION
        SELECT DISTINCT VentaID FROM deleted;
        
        -- Actualizar subtotal de cada venta
        UPDATE v
        SET v.SubtotalVentaBs = ISNULL(totales.Subtotal, 0),
            v.TotalVentaBs = ISNULL(totales.Subtotal, 0) - 
                            ISNULL(v.DescuentoPromocionBs, 0) - 
                            ISNULL(v.DescuentoCuponBs, 0)
        FROM Ventas v
        INNER JOIN @VentasAfectadas va ON v.VentaID = va.VentaID
        LEFT JOIN (
            SELECT 
                VentaID,
                SUM(SubtotalBs) AS Subtotal
            FROM DetalleVentas
            GROUP BY VentaID
        ) totales ON v.VentaID = totales.VentaID;
        
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END
GO
PRINT '✓ Trigger: trg_ActualizarTotalesVenta';

-- ============================================================================
-- TRIGGER 6: Validar Dirección Pertenece al Cliente
-- ============================================================================
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_ValidarDireccionCliente')
    DROP TRIGGER trg_ValidarDireccionCliente;
GO

CREATE TRIGGER trg_ValidarDireccionCliente
ON Ventas
INSTEAD OF INSERT
AS
BEGIN
    SET NOCOUNT ON;
    
    /*
    PROPÓSITO: Validar que la dirección de envío pertenezca al cliente
    SEGURIDAD: Evita que un cliente use direcciones de otros clientes
    */
    
    BEGIN TRY
        -- Verificar direcciones inválidas
        IF EXISTS (
            SELECT 1
            FROM inserted i
            INNER JOIN Direcciones d ON i.DireccionEnvioID = d.DireccionID
            WHERE d.ClienteID != i.ClienteID
        )
        BEGIN
            RAISERROR('La dirección seleccionada no pertenece al cliente', 16, 1);
            RETURN;
        END
        
        -- Si todo OK, hacer el INSERT real
        INSERT INTO Ventas (
            NumeroFactura,
            ClienteID,
            DireccionEnvioID,
            SubtotalVentaBs,
            DescuentoPromocionBs,
            DescuentoCuponBs,
            TotalVentaBs,
            MetodoPagoID,
            EstadoID,
            CuponID,
            Observaciones
        )
        SELECT 
            NumeroFactura,
            ClienteID,
            DireccionEnvioID,
            SubtotalVentaBs,
            DescuentoPromocionBs,
            DescuentoCuponBs,
            TotalVentaBs,
            MetodoPagoID,
            EstadoID,
            CuponID,
            Observaciones
        FROM inserted;
        
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END
GO
PRINT '✓ Trigger: trg_ValidarDireccionCliente';

-- ============================================================================
-- TRIGGER 7: Incrementar Uso de Cupones
-- ============================================================================
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_IncrementarUsoCupon')
    DROP TRIGGER trg_IncrementarUsoCupon;
GO

CREATE TRIGGER trg_IncrementarUsoCupon
ON Ventas
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    
    /*
    PROPÓSITO: Incrementar el contador de usos de un cupón cuando se usa en una venta
    */
    
    BEGIN TRY
        UPDATE c
        SET c.UsosActuales = c.UsosActuales + 1
        FROM Cupones c
        INNER JOIN inserted i ON c.CuponID = i.CuponID
        WHERE i.CuponID IS NOT NULL;
        
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END
GO
PRINT '✓ Trigger: trg_IncrementarUsoCupon';

-- ============================================================================
-- TRIGGER 8: Actualizar Solo Una Dirección Principal
-- ============================================================================
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_DireccionPrincipalUnica')
    DROP TRIGGER trg_DireccionPrincipalUnica;
GO

CREATE TRIGGER trg_DireccionPrincipalUnica
ON Direcciones
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    /*
    PROPÓSITO: Garantizar que un cliente solo tenga UNA dirección principal
    LÓGICA: Si se marca una dirección como principal, desmarcar las demás del mismo cliente
    */
    
    BEGIN TRY
        -- Para cada dirección marcada como principal
        UPDATE d
        SET d.EsPrincipal = 0
        FROM Direcciones d
        INNER JOIN inserted i ON d.ClienteID = i.ClienteID
        WHERE i.EsPrincipal = 1
        AND d.DireccionID != i.DireccionID
        AND d.EsPrincipal = 1;
        
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END
GO
PRINT '✓ Trigger: trg_DireccionPrincipalUnica';

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_AsignarRolUsuario')
    DROP PROCEDURE sp_AsignarRolUsuario;
GO

CREATE PROCEDURE sp_AsignarRolUsuario
    @UsuarioID INT,
    @NuevoRolID INT
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- 1. Verificar si el RolID existe
        IF NOT EXISTS (SELECT 1 FROM Roles WHERE RolID = @NuevoRolID)
        BEGIN
            -- Lanzar error si el RolID no es válido
            THROW 50000, 'El RolID especificado no existe en la base de datos.', 1;
        END

        -- 2. Verificar si el UsuarioID existe
        IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE UsuarioID = @UsuarioID)
        BEGIN
            -- Lanzar error si el UsuarioID no existe
            THROW 50001, 'El UsuarioID especificado no fue encontrado.', 1;
        END

        -- 3. Actualizar el RolID del usuario
        UPDATE Usuarios WITH (UPDLOCK)
        SET RolID = @NuevoRolID
        WHERE UsuarioID = @UsuarioID;

        COMMIT TRANSACTION;
        
        -- Devolver el resultado de la actualización
        SELECT 
            @UsuarioID AS UsuarioID, 
            @NuevoRolID AS NuevoRolID,
            (SELECT NombreRol FROM Roles WHERE RolID = @NuevoRolID) AS NombreRol,
            'Rol actualizado exitosamente' AS Mensaje;
            
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        -- Relanzar el error
        THROW;
    END CATCH
END
GO

EXEC sp_AsignarRolUsuario @UsuarioID = 5, @NuevoRolID = 1;


select * from Usuarios


-- ============================================================================
-- RESUMEN DE TRIGGERS CREADOS
-- ============================================================================
PRINT '';
PRINT '============================================================================';
PRINT 'RESUMEN DE TRIGGERS CREADOS';
PRINT '============================================================================';
PRINT '✓ 1. trg_ActualizarStockVenta        - Reduce stock al vender';
PRINT '✓ 2. trg_ActualizarStockCompra       - Aumenta stock al recibir compra';
PRINT '✓ 3. trg_ActualizarStockDevolucion   - Devuelve stock en devoluciones';
PRINT '✓ 4. trg_ValidarStockAntesVenta      - Valida stock antes de vender';
PRINT '✓ 5. trg_ActualizarTotalesVenta      - Recalcula totales automáticamente';
PRINT '✓ 6. trg_ValidarDireccionCliente     - Valida dirección del cliente';
PRINT '✓ 7. trg_IncrementarUsoCupon         - Cuenta usos de cupones';
PRINT '✓ 8. trg_DireccionPrincipalUnica     - Solo una dirección principal';
PRINT '';
PRINT 'TOTAL: 8 TRIGGERS AUTOMATIZADOS';
PRINT '============================================================================';

GO