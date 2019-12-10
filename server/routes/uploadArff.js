const express = require('express');
const app = express();

app.get('/usuario', (req, res) => {
    res.json('getUsuario');
})


module.exports = app;