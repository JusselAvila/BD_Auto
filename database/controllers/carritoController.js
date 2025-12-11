const CarritoTemporal = require('../models/CarritoTemporal');
const { getConnection, sql } = require('../config/database');

const obtenerCarrito = async (req, res) => {
    try {
        let carrito = await CarritoTemporal.findOne({ sessionId: req.params.sessionId });

        if (!carrito) {
            carrito = await CarritoTemporal.create({
                sessionId: req.params.sessionId,
                items: [],
                total: 0
            });
        }

        res.json(carrito);
    } catch (err) {
        console.error('Error obteniendo carrito:', err);
        res.status(500).json({ error: 'Error al obtener carrito' });
    }
};

const agregarAlCarrito = async (req, res) => {
    try {
        const { productoID, cantidad } = req.body;

        if (!productoID || !cantidad || cantidad < 1) {
            return res.status(400).json({ error: 'Datos inválidos' });
        }

        const pool = await getConnection();
        const productoResult = await pool.request()
            .input('ProductoID', sql.Int, productoID)
            .query('SELECT ProductoID, NombreProducto, PrecioVentaBs, StockActual FROM Productos WHERE ProductoID = @ProductoID AND Activo = 1');

        if (productoResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        const producto = productoResult.recordset[0];

        if (producto.StockActual < cantidad) {
            return res.status(400).json({ error: 'Stock insuficiente' });
        }

        let carrito = await CarritoTemporal.findOne({ sessionId: req.params.sessionId });

        if (!carrito) {
            carrito = new CarritoTemporal({ sessionId: req.params.sessionId, items: [] });
        }

        const itemIndex = carrito.items.findIndex(item => item.productoID === productoID);

        if (itemIndex > -1) {
            carrito.items[itemIndex].cantidad += cantidad;
            carrito.items[itemIndex].subtotal = carrito.items[itemIndex].cantidad * carrito.items[itemIndex].precio;
        } else {
            carrito.items.push({
                productoID: producto.ProductoID,
                nombre: producto.NombreProducto,
                precio: producto.PrecioVentaBs,
                cantidad: cantidad,
                subtotal: producto.PrecioVentaBs * cantidad
            });
        }

        carrito.total = carrito.items.reduce((sum, item) => sum + item.subtotal, 0);
        await carrito.save();

        res.json(carrito);
    } catch (err) {
        console.error('Error agregando al carrito:', err);
        res.status(500).json({ error: 'Error al agregar producto' });
    }
};

const actualizarCarrito = async (req, res) => {
    try {
        const { productoID, cantidad } = req.body;
        const productoIdNum = parseInt(productoID, 10);

        const carrito = await CarritoTemporal.findOne({ sessionId: req.params.sessionId });

        if (!carrito) {
            return res.status(404).json({ error: 'Carrito no encontrado' });
        }

        if (cantidad === 0) {
            carrito.items = carrito.items.filter(item => item.productoID !== productoIdNum);
        } else {
            const itemIndex = carrito.items.findIndex(item => item.productoID === productoIdNum);

            if (itemIndex > -1) {
                carrito.items[itemIndex].cantidad = cantidad;
                carrito.items[itemIndex].subtotal = carrito.items[itemIndex].cantidad * carrito.items[itemIndex].precio;
            }
        }

        carrito.total = carrito.items.reduce((sum, item) => sum + item.subtotal, 0);
        await carrito.save();

        res.json(carrito);
    } catch (err) {
        console.error('Error actualizando carrito:', err);
        res.status(500).json({ error: 'Error al actualizar carrito' });
    }
};

const vaciarCarrito = async (req, res) => {
    try {
        await CarritoTemporal.findOneAndUpdate(
            { sessionId: req.params.sessionId },
            { items: [], total: 0 },
            { new: true, upsert: true }
        );

        res.json({ success: true, message: 'Carrito vaciado' });
    } catch (err) {
        console.error('Error vaciando carrito:', err);
        res.status(500).json({ error: 'Error al vaciar carrito' });
    }
};

module.exports = {
    obtenerCarrito,
    agregarAlCarrito,
    actualizarCarrito,
    vaciarCarrito
};
