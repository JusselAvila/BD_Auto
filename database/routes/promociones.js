const express = require('express');
const router = express.Router();
const {
    crearPromocion,
    asignarProductosPromocion,
    cambiarEstadoPromocion
} = require('../controllers/promocionesController');

router.post('/', crearPromocion);
router.post('/asignar-productos', asignarProductosPromocion);
router.put('/estado', cambiarEstadoPromocion);

module.exports = router;