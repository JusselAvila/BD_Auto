const express = require('express');
const router = express.Router();
const {
    crearClientePersona,
    crearClienteEmpresa,
    actualizarClientePersona,
    actualizarClienteEmpresa
} = require('../controllers/clientesController');

router.post('/persona', crearClientePersona);
router.post('/empresa', crearClienteEmpresa);
router.put('/persona', actualizarClientePersona);
router.put('/empresa', actualizarClienteEmpresa);

module.exports = router;