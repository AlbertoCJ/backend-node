const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const appDB = require('../../connectionsDB').appDB;

let Schema = mongoose.Schema;

let datasetSchema = new Schema({
    description: {
        type: String,
        unique: true,
        required: [true, 'La descripción es necesaria']
    },
    file: {
        type: String,
        required: [true, 'El fichero es necesario']
    },
    extension: {
        type: String
    },
    date_creation: {
        type: Date
    },
    name: {
        type: String
    },
    full_name: {
        type: String
    },
    size: {
        type: String
    }
});

datasetSchema.plugin(uniqueValidator, { message: '{PATH} debe ser único' });

module.exports = appDB.model('Dataset', datasetSchema);