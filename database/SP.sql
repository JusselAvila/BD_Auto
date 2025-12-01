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
    
    JUSTIFICACIÓN:
    - Evita que dos transacciones simultáneas creen clientes con el mismo email/CI
    - Sin SERIALIZABLE: 
      * Transacción A verifica email no existe ✓
      * Transacción B verifica email no existe ✓ (mismo email)
      * Ambas insertan → Violación de UNIQUE constraint
    - Con SERIALIZABLE:
      * Primera transacción bloquea hasta completar
      * Segunda transacción espera y luego detecta duplicado
    */
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    
    DECLARE @Reintentos INT = 0;
    DECLARE @MaxReintentos INT = 3;
    DECLARE @Exitoso BIT = 0;
    
    -- MANEJO DE DEADLOCKS: Reintentos automáticos
    WHILE @Reintentos < @MaxReintentos AND @Exitoso = 0
    BEGIN
        SET @Reintentos = @Reintentos + 1;
        
        BEGIN TRY
            BEGIN TRANSACTION;
            
            DECLARE @UsuarioID INT;
            DECLARE @ClienteID INT;
            DECLARE @RolClienteID INT;
            
            -- Verificar email único (con bloqueo)
            IF EXISTS (SELECT 1 FROM Usuarios WITH (UPDLOCK, HOLDLOCK) WHERE Email = @Email AND Activo = 1)
            BEGIN
                RAISERROR('El email ya está registrado en el sistema', 16, 1);
            END
            
            -- Verificar CI único (con bloqueo)
            IF EXISTS (SELECT 1 FROM Clientes WITH (UPDLOCK, HOLDLOCK) WHERE NumeroDocumento = @CI)
            BEGIN
                RAISERROR('El CI ya está registrado en el sistema', 16, 1);
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
            
            -- Otros errores o máximo de reintentos alcanzado
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
                'Email o contraseña incorrectos' AS Mensaje;
            RETURN;
        END
        
        -- Validar que está activo
        IF @Activo = 0
        BEGIN
            SELECT 
                0 AS Exito,
                'Usuario inactivo. Contacte al administrador' AS Mensaje;
            RETURN;
        END
        
        -- Obtener información de cliente (si es cliente)
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


select * from Vehiculo_Marcas

ALTER PROCEDURE sp_ObtenerMarcasVehiculos
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
    
    SELECT DISTINCT
        vm.MarcaVehiculoID,
        vm.Nombre AS NombreMarca
    FROM Vehiculo_Marcas vm
    -- Obliga a que exista la cadena completa de Modelos, Versiones, y Compatibilidad
    INNER JOIN Vehiculo_Modelos vmod ON vm.MarcaVehiculoID = vmod.MarcaVehiculoID
    INNER JOIN Vehiculo_Versiones vv ON vmod.ModeloVehiculoID = vv.ModeloVehiculoID
    INNER JOIN Llantas_Compatibilidad lc ON vv.VersionVehiculoID = lc.VersionVehiculoID
    ORDER BY vm.Nombre ASC;
END
GO

PRINT '✓ sp_ObtenerMarcasVehiculos creado';
GO

-- =============================================
-- SP 2: Obtener Modelos de una Marca
-- =============================================
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_ObtenerModelosVehiculo')
    DROP PROCEDURE sp_ObtenerModelosVehiculo;
GO

ALTER PROCEDURE sp_ObtenerMarcasVehiculos
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
    
    SELECT DISTINCT
        vm.MarcaVehiculoID,
        vm.Nombre AS NombreMarca
    FROM Vehiculo_Marcas vm
    -- Obliga a que exista la cadena completa de Modelos, Versiones, y Compatibilidad
    INNER JOIN Vehiculo_Modelos vmod ON vm.MarcaVehiculoID = vmod.MarcaVehiculoID
    INNER JOIN Vehiculo_Versiones vv ON vmod.ModeloVehiculoID = vv.ModeloVehiculoID
    INNER JOIN Llantas_Compatibilidad lc ON vv.VersionVehiculoID = lc.VersionVehiculoID
    ORDER BY vm.Nombre ASC;
END
GO

-- =============================================
-- SP 3: Obtener Años de un Modelo
-- =============================================
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_ObtenerAniosVehiculo')
    DROP PROCEDURE sp_ObtenerAniosVehiculo;
GO

CREATE PROCEDURE sp_ObtenerAniosVehiculo
    @ModeloVehiculoID INT
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
    
    /*
    RETORNA: Todos los años disponibles para un modelo específico
    que tienen compatibilidad de llantas
    */
    
    SELECT DISTINCT
        vv.Anio
    FROM Vehiculo_Versiones vv
    INNER JOIN Llantas_Compatibilidad lc ON vv.VersionVehiculoID = lc.VersionVehiculoID
    WHERE vv.ModeloVehiculoID = @ModeloVehiculoID
    ORDER BY vv.Anio DESC; -- Años más recientes primero
END
GO

PRINT '✓ sp_ObtenerAniosVehiculo creado';
GO

-- =============================================
-- SP 4: Obtener Versiones de un Modelo y Año
-- =============================================
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_ObtenerVersionesVehiculo')
    DROP PROCEDURE sp_ObtenerVersionesVehiculo;
GO

CREATE PROCEDURE sp_ObtenerVersionesVehiculo
    @ModeloVehiculoID INT,
    @Anio INT
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
    
    /*
    RETORNA: Todas las versiones de un modelo y año específico
    que tienen compatibilidad de llantas
    */
    
    SELECT DISTINCT
        vv.VersionVehiculoID,
        vv.NombreVersion,
        vv.Anio
    FROM Vehiculo_Versiones vv
    INNER JOIN Llantas_Compatibilidad lc ON vv.VersionVehiculoID = lc.VersionVehiculoID
    WHERE vv.ModeloVehiculoID = @ModeloVehiculoID
    AND vv.Anio = @Anio
    ORDER BY vv.NombreVersion ASC;
END
GO

PRINT '✓ sp_ObtenerVersionesVehiculo creado';
GO

-- =============================================
-- SP 5: Obtener Llantas Compatibles con Vehículo
-- =============================================
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_ObtenerLlantasCompatibles')
    DROP PROCEDURE sp_ObtenerLlantasCompatibles;
GO

CREATE PROCEDURE sp_ObtenerLlantasCompatibles
    @VersionVehiculoID INT,
    @MarcaLlantaID INT = NULL,
    @PrecioMinBs DECIMAL(10,2) = NULL,
    @PrecioMaxBs DECIMAL(10,2) = NULL,
    @SoloConStock BIT = 1,
    @OrdenarPor NVARCHAR(20) = 'PRECIO_ASC'
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
    
    /*
    RETORNA: Todas las llantas compatibles con una versión específica de vehículo
    Incluye información de la versión del vehículo
    */
    
    BEGIN TRY
        SELECT 
            -- Información del producto
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
            
            -- Formato completo (ej: 225/45R17 94W)
            CASE 
                WHEN p.Ancho IS NOT NULL AND p.Perfil IS NOT NULL AND p.DiametroRin IS NOT NULL
                THEN CAST(p.Ancho AS NVARCHAR) + '/' + CAST(p.Perfil AS NVARCHAR) + 'R' + 
                     CAST(p.DiametroRin AS NVARCHAR) + 
                     ISNULL(' ' + p.IndiceCarga, '') + ISNULL(p.IndiceVelocidad, '')
                ELSE NULL
            END AS MedidaCompleta,
            
            -- Marca de llanta
            m.MarcaID,
            m.NombreMarca AS MarcaLlanta,
            m.PaisOrigen,
            
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
                WHEN p.StockActual <= (p.StockMinimo * 2) THEN 'STOCK MEDIO'
                ELSE 'STOCK DISPONIBLE'
            END AS EstadoStock,
            
            -- Compatibilidad
            lc.Posicion AS PosicionVehiculo, -- DELANTERA, TRASERA, TODAS
            lc.Observacion AS ObservacionCompatibilidad,
            
            -- Información del vehículo
            vm.Nombre AS MarcaVehiculo,
            vmod.NombreModelo AS ModeloVehiculo,
            vv.NombreVersion AS VersionVehiculo,
            vv.Anio AS AnioVehiculo,
            
            -- Destacado
            p.Destacado,
            
            -- Estadísticas de ventas
            (SELECT ISNULL(SUM(dv.Cantidad), 0) 
             FROM DetalleVentas dv 
             WHERE dv.ProductoID = p.ProductoID) AS TotalVendido
            
        FROM Llantas_Compatibilidad lc
        INNER JOIN Productos p ON lc.ProductoID = p.ProductoID
        INNER JOIN Vehiculo_Versiones vv ON lc.VersionVehiculoID = vv.VersionVehiculoID
        INNER JOIN Vehiculo_Modelos vmod ON vv.ModeloVehiculoID = vmod.ModeloVehiculoID
        INNER JOIN Vehiculo_Marcas vm ON vmod.MarcaVehiculoID = vm.MarcaVehiculoID
        INNER JOIN Categorias cat ON p.CategoriaID = cat.CategoriaID
        LEFT JOIN Marcas m ON p.MarcaID = m.MarcaID
        
        WHERE lc.VersionVehiculoID = @VersionVehiculoID
        AND p.Activo = 1
        
        -- FILTROS OPCIONALES
        AND (@MarcaLlantaID IS NULL OR p.MarcaID = @MarcaLlantaID)
        AND (@PrecioMinBs IS NULL OR p.PrecioVentaBs >= @PrecioMinBs)
        AND (@PrecioMaxBs IS NULL OR p.PrecioVentaBs <= @PrecioMaxBs)
        AND (@SoloConStock = 0 OR p.StockActual > 0)
        
        -- ORDENAMIENTO DINÁMICO
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
        SELECT 
            ERROR_NUMBER() AS ErrorNumero,
            ERROR_MESSAGE() AS ErrorMensaje;
    END CATCH
END
GO