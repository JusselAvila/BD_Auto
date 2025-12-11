// Script para verificar la venta 22 y probar el SP
require('dotenv').config();
const sql = require('mssql');

const sqlConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function debugVenta22() {
    try {
        await sql.connect(sqlConfig);
        console.log('✅ Conectado\n');

        // 1. Verificar que la venta 22 existe
        console.log('📋 Consultando venta 22...');
        const ventaResult = await sql.query`
      SELECT VentaID, ClienteID, NumeroFactura, TotalVentaBs
      FROM Ventas 
      WHERE VentaID = 22
    `;

        if (ventaResult.recordset.length === 0) {
            console.log('❌ La venta 22 NO existe en la base de datos');
            return;
        }

        const venta = ventaResult.recordset[0];
        console.log('✅ Venta encontrada:');
        console.log('   VentaID:', venta.VentaID);
        console.log('   ClienteID:', venta.ClienteID);
        console.log('   NumeroFactura:', venta.NumeroFactura);
        console.log('   Total:', venta.TotalVentaBs);

        // 2. Probar el SP con los datos correctos
        console.log('\n🧪 Ejecutando sp_ObtenerDetalleVenta...');
        try {
            const result = await sql.query`
        EXEC sp_ObtenerDetalleVenta 
          @VentaID = ${venta.VentaID}, 
          @ClienteID = ${venta.ClienteID}
      `;

            console.log('✅ SP ejecutado correctamente');
            console.log('📊 Registros devueltos:', result.recordset.length);

            if (result.recordset.length > 0) {
                console.log('\n📦 Detalles:');
                result.recordset.forEach((item, index) => {
                    console.log(`   ${index + 1}. ${item.NombreProducto} - Cantidad: ${item.Cantidad} - Total: Bs. ${item.SubtotalBs}`);
                });
            }
        } catch (spError) {
            console.log('❌ Error ejecutando SP:', spError.message);
            console.log('Stack:', spError.stack);
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await sql.close();
        process.exit();
    }
}

debugVenta22();
