const express = require('express');
const router = express.Router();
const {
    solicitarDevolucion,
    cambiarEstadoDevolucion
} = require('../controllers/devolucionesController');

router.post('/', solicitarDevolucion);
router.put('/estado', cambiarEstadoDevolucion);

module.exports = router;