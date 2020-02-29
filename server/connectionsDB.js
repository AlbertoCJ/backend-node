require('./config/config');
const mongoose = require('mongoose');

const appDB = mongoose.createConnection(process.env.MONGODB_URI_APP, {
    useCreateIndex: true,
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true
}, (err, res) => {
    if (err) throw err;

    console.log('appBD ONLINE');
});

const wekaDB = mongoose.createConnection(process.env.MONGODB_URI_WEKA_NODE, {
    useCreateIndex: true,
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true
}, (err, res) => {
    if (err) throw err;

    console.log('wekaBD ONLINE');
});

module.exports = {
    appDB,
    wekaDB
}