const express = require('express');
const router = express.Router();
const {
    crearCompra,
    cambiarEstadoCompra
} = require('../controllers/comprasController');

router.post('/', crearCompra);
router.put('/estado', cambiarEstadoCompra);

module.exports = router;
