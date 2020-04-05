const mongoose = require('mongoose');
// const uniqueValidator = require('mongoose-unique-validator');
const wekaDB = require('../../connectionsDB').wekaDB;

let Schema = mongoose.Schema;

let localContainerSchema = new Schema({
    Id: {
        type: String
    },
    Names: {
        type: Array
    },
    Image: {
        type: String
    },
    Ports: {
        type: Array
    },
    State: {
        type: String
    },
    Job_id: {
        type: String,
        default: ''
    },
    User_id: {
        type: String
    },
    Date_creation: {
        type: Date,
        default: Date.now
    },
    Working: {
        type: Boolean,
        default: false
    },
    Date_work_end: {
        type: Date,
        default: Date.now
    }
});

module.exports = wekaDB.model('localContainer', localContainerSchema);