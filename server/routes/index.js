const express = require('express');
const app = express()

app.use(require('./user'));
app.use(require('./login'));
app.use(require('./dataset'));
app.use(require('./algorithm'));
app.use(require('./job'));
app.use(require('./algorithm2'));
app.use(require('./docker'));

module.exports = app;