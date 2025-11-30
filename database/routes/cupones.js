const express = require('express');
const router = express.Router();
const {
    crearCupon,
    validarCupon,
    aplicarCupon
} = require('../controllers/cuponesController');

router.post('/', crearCupon);
router.post('/validar', validarCupon);
router.post('/aplicar', aplicarCupon);

module.exports = router;