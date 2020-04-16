const mongoose = require('mongoose');
// const uniqueValidator = require('mongoose-unique-validator');
const wekaDB = require('../../connectionsDB').wekaDB;

let Schema = mongoose.Schema;

let modelSchema = new Schema({
    meta: {
        type: Object
    },
    model: {
        type: Array
    },
    validation: {
        type: Object
    }
});

module.exports = wekaDB.model('model', modelSchema);