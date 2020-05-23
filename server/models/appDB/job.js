const mongoose = require('mongoose');
// const uniqueValidator = require('mongoose-unique-validator');
const mongoosePaginate = require('mongoose-paginate-v2');
const appDB = require('../../connectionsDB').appDB;

let Schema = mongoose.Schema;

let jobSchema = new Schema({
    name: {
        type: String,
        // unique: true,
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
    errorList: {
        type: Array,
        default: []
    },
    dataAlgorithms: {
        type: Object
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    fileName: {
        type: String
    },
    time: {
        type: Schema.Types.ObjectId,
        ref: 'Time'
    }
});

jobSchema.plugin(mongoosePaginate);

module.exports = appDB.model('Job', jobSchema);