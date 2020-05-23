const express = require('express');
const app = express()

app.use(require('./user'));
app.use(require('./login'));
app.use(require('./dataset'));
// app.use(require('./algorithm')); // TODO: Eliminar linea y fichero .js, tambien algorithmImpl.js
app.use(require('./job'));
// app.use(require('./algorithm2')); // TODO: Eliminar linea y fichero .js
app.use(require('./docker'));
app.use(require('./globalConfig'));
app.use(require('./localContainer'));
app.use(require('./time'));

module.exports = app;