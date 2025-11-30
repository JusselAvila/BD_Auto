const express = require('express');
const router = express.Router();
const {
    agregarDireccionCliente,
    establecerDireccionPrincipal
} = require('../controllers/direccionesController');

router.post('/', agregarDireccionCliente);
router.put('/principal', establecerDireccionPrincipal);

module.exports = router;