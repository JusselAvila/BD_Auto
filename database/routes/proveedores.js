const express = require('express');
const router = express.Router();
const {
    crearProveedor,
    actualizarProveedor
} = require('../controllers/proveedoresController');

router.post('/', crearProveedor);
router.put('/', actualizarProveedor);

module.exports = router;