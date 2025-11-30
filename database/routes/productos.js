const express = require('express');
const router = express.Router();
const {
    crearProducto,
    actualizarProducto
} = require('../controllers/productosController');

router.post('/', crearProducto);
router.put('/', actualizarProducto);

module.exports = router;