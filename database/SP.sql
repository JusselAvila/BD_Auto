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
    
    /*
    NIVEL DE AISLAMIENTO: SERIALIZABLE
    
    JUSTIFICACI�N:
    - Evita que dos transacciones simult�neas creen clientes con el mismo email/CI
    - Sin SERIALIZABLE: 
      * Transacci�n A verifica email no existe ?
      * Transacci�n B verifica email no existe ? (mismo email)
      * Ambas insertan ? Violaci�n de UNIQUE constraint
    - Con SERIALIZABLE:
      * Primera transacci�n bloquea hasta completar
      * Segunda transacci�n espera y luego detecta duplicado
    */
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    
    DECLARE @Reintentos INT = 0;
    DECLARE @MaxReintentos INT = 3;
    DECLARE @Exitoso BIT = 0;
    
    -- MANEJO DE DEADLOCKS: Reintentos autom�ticos
    WHILE @Reintentos < @MaxReintentos AND @Exitoso = 0
    BEGIN
        SET @Reintentos = @Reintentos + 1;
        
        BEGIN TRY
            BEGIN TRANSACTION;
            
            DECLARE @UsuarioID INT;
            DECLARE @ClienteID INT;
            DECLARE @RolClienteID INT;
            
            -- Verificar email unico (con bloqueo)
            IF EXISTS (SELECT 1 FROM Usuarios WITH (UPDLOCK, HOLDLOCK) WHERE Email = @Email AND Activo = 1)
            BEGIN
                RAISERROR('El email ya est� registrado en el sistema', 16, 1);
            END

            IF @FechaNacimiento IS NOT NULL
            BEGIN
                DECLARE @Edad INT;
                
                -- Cálculo de edad más preciso
                SET @Edad = DATEDIFF(YEAR, @FechaNacimiento, GETDATE()) -
                            CASE
                                -- Resta 1 si la fecha de hoy es anterior al cumpleaños de este año
                                WHEN MONTH(@FechaNacimiento) > MONTH(GETDATE()) OR
                                     (MONTH(@FechaNacimiento) = MONTH(GETDATE()) AND DAY(@FechaNacimiento) > DAY(GETDATE()))
                                THEN 1
                                ELSE 0
                            END;
                            
                -- Validacin: Menor de 18
                IF @Edad < 18
                BEGIN
                    RAISERROR('El cliente debe tener al menos 18 años.', 16, 1);
                END
                
                -- Validacin: Mayor de 100
                IF @Edad > 100
                BEGIN
                    RAISERROR('La edad del cliente no puede ser mayor a 100 años.', 16, 1);
                END
            END

            
            -- Verificar CI �nico (con bloqueo)
            IF EXISTS (SELECT 1 FROM Clientes WITH (UPDLOCK, HOLDLOCK) WHERE NumeroDocumento = @CI)
            BEGIN
                RAISERROR('El CI ya est� registrado en el sistema', 16, 1);
            END
            
            -- Obtener RolID de Cliente
            SELECT @RolClienteID = RolID FROM Roles WHERE NombreRol = 'Cliente';
            
            IF @RolClienteID IS NULL
            BEGIN
                RAISERROR('Error del sistema: Rol Cliente no encontrado', 16, 1);
            END
            
            -- Insertar Usuario
            INSERT INTO Usuarios (Email, PasswordHash, RolID, Activo)
            VALUES (@Email, @PasswordHash, @RolClienteID, 1);
            
            SET @UsuarioID = SCOPE_IDENTITY();
            
            -- Insertar Cliente
            INSERT INTO Clientes (UsuarioID, NumeroDocumento, TipoDocumento, TipoCliente, Telefono)
            VALUES (@UsuarioID, @CI, 'CI', 'Persona', @Telefono);
            
            SET @ClienteID = SCOPE_IDENTITY();
            
            -- Insertar Persona
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
            
            -- Manejo de deadlock
            IF ERROR_NUMBER() = 1205
            BEGIN
                IF @Reintentos < @MaxReintentos
                BEGIN
                    PRINT 'Deadlock detectado, reintento ' + CAST(@Reintentos AS NVARCHAR) + '...';
                    WAITFOR DELAY '00:00:01'; -- Esperar 1 segundo
                    CONTINUE; -- Reintentar
                END
            END;
            
            -- Otros errores o m�ximo de reintentos alcanzado
            THROW;
        END CATCH
    END
END
GO

CREATE PROCEDURE sp_ValidarLogin
    @Email NVARCHAR(100),
    @PasswordHash NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    
   SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
    
    BEGIN TRY
        DECLARE @UsuarioID INT;
        DECLARE @RolID INT;
        DECLARE @Activo BIT;
        DECLARE @ClienteID INT = NULL;
        DECLARE @TipoCliente NVARCHAR(20) = NULL;
        
        -- Buscar usuario por email
        SELECT 
            @UsuarioID = u.UsuarioID,
            @RolID = u.RolID,
            @Activo = u.Activo
        FROM Usuarios u
        WHERE u.Email = @Email 
        AND u.PasswordHash = @PasswordHash;
        
        -- Validar que existe
        IF @UsuarioID IS NULL
        BEGIN
            SELECT 
                0 AS Exito,
                'Email o contrase�a incorrectos' AS Mensaje;
            RETURN;
        END
        
        -- Validar que est� activo
        IF @Activo = 0
        BEGIN
            SELECT 
                0 AS Exito,
                'Usuario inactivo. Contacte al administrador' AS Mensaje;
            RETURN;
        END
        
        -- Obtener informaci�n de cliente (si es cliente)
        SELECT 
            @ClienteID = c.ClienteID,
            @TipoCliente = c.TipoCliente
        FROM Clientes c
        WHERE c.UsuarioID = @UsuarioID;
        
        -- Login exitoso - Retornar datos del usuario
        SELECT 
            1 AS Exito,
            'Login exitoso' AS Mensaje,
            u.UsuarioID,
            u.Email,
            r.RolID,
            r.NombreRol,
            @ClienteID AS ClienteID,
            @TipoCliente AS TipoCliente,
            CASE 
                WHEN @TipoCliente = 'Persona' THEN p.Nombres + ' ' + p.ApellidoPaterno
                WHEN @TipoCliente = 'Empresa' THEN e.RazonSocial
                ELSE 'Usuario Sistema'
            END AS NombreCompleto
        FROM Usuarios u
        INNER JOIN Roles r ON u.RolID = r.RolID
        LEFT JOIN Clientes c ON u.UsuarioID = c.UsuarioID
        LEFT JOIN Personas p ON c.ClienteID = p.ClienteID
        LEFT JOIN Empresas e ON c.ClienteID = e.ClienteID
        WHERE u.UsuarioID = @UsuarioID;
        
    END TRY
    BEGIN CATCH
        SELECT 
            0 AS Exito,
            'Error en el sistema: ' + ERROR_MESSAGE() AS Mensaje;
    END CATCH
END
GO

-- =================================================================
-- SP 1: Obtener Marcas de Veh�culos (sp_ObtenerMarcasVehiculos)
-- =================================================================
-- Se usa ALTER PROCEDURE en lugar de CREATE para permitir la edici�n.
ALTER PROCEDURE sp_ObtenerMarcasVehiculos
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
    
    SELECT DISTINCT
        vm.MarcaVehiculoID,
        vm.Nombre AS NombreMarca -- Campo de salida: NombreMarca
    FROM Vehiculo_Marcas vm
    -- Obliga a que exista la cadena completa de Modelos, Versiones, y Compatibilidad
    INNER JOIN Vehiculo_Modelos vmod ON vm.MarcaVehiculoID = vmod.MarcaVehiculoID
    INNER JOIN Vehiculo_Versiones vv ON vmod.ModeloVehiculoID = vv.ModeloVehiculoID
    INNER JOIN Llantas_Compatibilidad lc ON vv.VersionVehiculoID = lc.VersionVehiculoID
    ORDER BY vm.Nombre ASC;
END
GO

-- =================================================================
-- SP 2: Obtener Modelos de una Marca (sp_ObtenerModelosVehiculos)
-- =================================================================
-- NOTA: El SP debe llamarse 'sp_ObtenerModelosVehiculos' (plural) para coincidir con Node.js

ALTER PROCEDURE sp_ObtenerModelosVehiculos
    @MarcaID INT
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
    
    SELECT DISTINCT
        vmod.ModeloVehiculoID,
        vmod.NombreModelo -- Campo de salida: NombreModelo
    FROM Vehiculo_Modelos vmod
    
    -- Unimos a Versiones y Compatibilidad para asegurar que el modelo est� 'activo'
    INNER JOIN Vehiculo_Versiones vv ON vmod.ModeloVehiculoID = vv.ModeloVehiculoID
    INNER JOIN Llantas_Compatibilidad lc ON vv.VersionVehiculoID = lc.VersionVehiculoID
    
    -- Filtramos por la MarcaVehiculoID recibida
    WHERE vmod.MarcaVehiculoID = @MarcaID
    
    ORDER BY vmod.NombreModelo ASC;
END
GO

-- =================================================================
-- SP 3: Obtener A�os de un Modelo (sp_ObtenerAniosVehiculo)
-- =================================================================


ALTER PROCEDURE sp_ObtenerAniosVehiculo
    @ModeloVehiculoID INT
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
    
    SELECT DISTINCT
        vv.Anio 
    FROM Vehiculo_Versiones vv
    INNER JOIN Llantas_Compatibilidad lc ON vv.VersionVehiculoID = lc.VersionVehiculoID
    WHERE vv.ModeloVehiculoID = @ModeloVehiculoID
    ORDER BY vv.Anio DESC; 
END
GO



-- =============================================
-- SP 5: Obtener Llantas Compatibles con Veh�culo
-- =============================================




ALTER PROCEDURE sp_ObtenerLlantasCompatibles
    @ModeloVehiculoID INT,
    @Anio INT,
    @MarcaLlantaID INT = NULL,
    @PrecioMinBs DECIMAL(10,2) = NULL,
    @PrecioMaxBs DECIMAL(10,2) = NULL,
    @SoloConStock BIT = 1,
    @OrdenarPor NVARCHAR(20) = 'PRECIO_ASC'
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        SELECT 
            -- Producto
            p.ProductoID,
            p.CodigoProducto,
            p.NombreProducto,
            p.Descripcion,

            -- Medidas
            p.Ancho,
            p.Perfil,
            p.DiametroRin,
            p.IndiceCarga,
            p.IndiceVelocidad,

            CASE 
                WHEN p.Ancho IS NOT NULL AND p.Perfil IS NOT NULL AND p.DiametroRin IS NOT NULL
                THEN CAST(p.Ancho AS NVARCHAR) + '/' + CAST(p.Perfil AS NVARCHAR) + 'R' +
                     CAST(p.DiametroRin AS NVARCHAR) +
                     ISNULL(' ' + p.IndiceCarga, '') +
                     ISNULL(p.IndiceVelocidad, '')
            END AS MedidaCompleta,

            -- Marca de la llanta
            m.MarcaID,
            m.NombreMarca AS MarcaLlanta,

            -- Categoría
            cat.NombreCategoria,

            -- Precios
            p.PrecioVentaBs,

            -- Stock
            p.StockActual,
            p.StockMinimo,
            CASE 
                WHEN p.StockActual <= 0 THEN 'SIN STOCK'
                WHEN p.StockActual <= p.StockMinimo THEN 'STOCK BAJO'
                WHEN p.StockActual <= p.StockMinimo * 2 THEN 'STOCK MEDIO'
                ELSE 'STOCK DISPONIBLE'
            END AS EstadoStock,

            -- Compatibilidad
            lc.Posicion,
            lc.Observacion,

            -- Vehículo
            vm.Nombre AS MarcaVehiculo,
            vmod.NombreModelo AS ModeloVehiculo,
            vv.Anio AS AnioVehiculo,

            -- Destacado
            p.Destacado,

            -- Total vendido
            (SELECT ISNULL(SUM(dv.Cantidad), 0)
             FROM DetalleVentas dv 
             WHERE dv.ProductoID = p.ProductoID) AS TotalVendido

        FROM Llantas_Compatibilidad lc
        INNER JOIN Vehiculo_Versiones vv 
            ON lc.VersionVehiculoID = vv.VersionVehiculoID
        INNER JOIN Vehiculo_Modelos vmod 
            ON vv.ModeloVehiculoID = vmod.ModeloVehiculoID
        INNER JOIN Vehiculo_Marcas vm 
            ON vmod.MarcaVehiculoID = vm.MarcaVehiculoID
        INNER JOIN Productos p 
            ON lc.ProductoID = p.ProductoID
        INNER JOIN Categorias cat 
            ON p.CategoriaID = cat.CategoriaID
        LEFT JOIN Marcas m 
            ON p.MarcaID = m.MarcaID

        WHERE 
            vv.ModeloVehiculoID = @ModeloVehiculoID
            AND vv.Anio = @Anio
            AND p.Activo = 1

            -- Filtros opcionales
            AND (@MarcaLlantaID IS NULL OR p.MarcaID = @MarcaLlantaID)
            AND (@PrecioMinBs IS NULL OR p.PrecioVentaBs >= @PrecioMinBs)
            AND (@PrecioMaxBs IS NULL OR p.PrecioVentaBs <= @PrecioMaxBs)
            AND (@SoloConStock = 0 OR p.StockActual > 0)

        ORDER BY
            CASE WHEN @OrdenarPor = 'PRECIO_ASC' THEN p.PrecioVentaBs END ASC,
            CASE WHEN @OrdenarPor = 'PRECIO_DESC' THEN p.PrecioVentaBs END DESC,
            CASE WHEN @OrdenarPor = 'NOMBRE' THEN p.NombreProducto END ASC,
            CASE WHEN @OrdenarPor = 'MARCA' THEN m.NombreMarca END ASC,
            CASE WHEN @OrdenarPor = 'STOCK' THEN p.StockActual END DESC,
            p.Destacado DESC,
            p.ProductoID ASC;

    END TRY
    BEGIN CATCH
        SELECT ERROR_NUMBER() AS ErrorNumero,
               ERROR_MESSAGE() AS ErrorMensaje;
    END CATCH
END
GO




CREATE PROCEDURE sp_ObtenerHistorialVentasCliente
    @ClienteID INT
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    SELECT 
        v.VentaID,
        v.NumeroFactura,
        v.FechaVenta,
        v.TotalVentaBs,
        ep.NombreEstado AS Estado,
        (
            SELECT 
                p.NombreProducto,
                dv.Cantidad,
                dv.PrecioUnitarioBs,
                dv.SubtotalBs
            FROM DetalleVentas dv
            JOIN Productos p ON dv.ProductoID = p.ProductoID
            WHERE dv.VentaID = v.VentaID
            FOR JSON PATH
        ) AS Detalles
    FROM Ventas v
    JOIN EstadosPedido ep ON v.EstadoID = ep.EstadoID
    WHERE v.ClienteID = @ClienteID
    ORDER BY v.FechaVenta DESC;
END
GO




-- SP para contar productos activos
CREATE PROCEDURE sp_ContarProductosActivos
AS
BEGIN
    SET NOCOUNT ON;
    SELECT COUNT(*) AS TotalProductos FROM Productos WHERE Activo = 1;
END
GO

-- SP para contar clientes
CREATE PROCEDURE sp_ContarClientes
AS
BEGIN
    SET NOCOUNT ON;
    SELECT COUNT(*) AS TotalClientes FROM Clientes;
END
GO

-- SP para obtener el total de ventas del mes actual
CREATE PROCEDURE sp_ObtenerVentasDelMes
AS
BEGIN
    SET NOCOUNT ON;
    SELECT ISNULL(SUM(TotalVentaBs), 0) AS TotalVentasMes
    FROM Ventas
    WHERE MONTH(FechaVenta) = MONTH(GETDATE())
      AND YEAR(FechaVenta) = YEAR(GETDATE());
END
GO

-- SP para obtener el total de transacciones de ventas de hoy
CREATE PROCEDURE sp_ObtenerTotalTransaccionesVentasHoy
AS
BEGIN
    SET NOCOUNT ON;
    SELECT COUNT(*) AS TotalTransaccionesHoy
    FROM Ventas
    WHERE CAST(FechaVenta AS DATE) = CAST(GETDATE() AS DATE);
END
GO

--INTENTO
