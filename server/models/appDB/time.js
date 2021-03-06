const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const appDB = require('../../connectionsDB').appDB;

let Schema = mongoose.Schema;

let timeSchema = new Schema({
    user: {
        type: String
    },
    jobName: {
        type: String
    },
    jobDescription: {
        type: String
    },
    dateCreation: {
        type: Date
    },
    start: {
        type: Date
    },
    end: {
        type: Date
    },
    hasStatus: {
        type: String,
        default: 'RUNNING' // 'ERROR', 'COMPLETED' y 'PARTIAL'
    }
});

timeSchema.plugin(mongoosePaginate);

module.exports = appDB.model('Time', timeSchema);