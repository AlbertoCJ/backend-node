const express = require('express');
const app = express()

app.use(require('./user'));
app.use(require('./login'));
app.use(require('./dataset'));
app.use(require('./job'));
app.use(require('./docker'));
app.use(require('./dockerAWS'));
app.use(require('./globalConfig'));
app.use(require('./localContainer'));
app.use(require('./awsContainer'));
app.use(require('./time'));

module.exports = app;