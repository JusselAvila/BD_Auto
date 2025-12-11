const express = require('express');
const router = express.Router();
const {
    obtenerCarrito,
    agregarAlCarrito,
    actualizarCarrito,
    vaciarCarrito
} = require('../controllers/carritoController');

router.get('/:sessionId', obtenerCarrito);
router.post('/:sessionId/agregar', agregarAlCarrito);
router.put('/:sessionId/actualizar', actualizarCarrito);
router.delete('/:sessionId', vaciarCarrito);

module.exports = router;
