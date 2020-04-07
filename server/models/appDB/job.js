const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const appDB = require('../../connectionsDB').appDB;

let Schema = mongoose.Schema;

let jobSchema = new Schema({
    name: {
        type: String,
        unique: true,
        required: [true, 'The job name must be exist.']
    },
    description: {
        type: String
    },
    dateCreation: {
        type: Date,
        default: Date.now
    },
    hasStatus: {
        type: String,
        default: 'RUNNING' // 'ERROR', 'COMPLETED' y 'PARTIAL'
    },
    error: {
        type: Object,
        default: null
    },
    dataAlgorithms: {
        type: Object
    }
});

jobSchema.plugin(uniqueValidator, { name: '{PATH} must be unique' });

module.exports = appDB.model('Job', jobSchema);