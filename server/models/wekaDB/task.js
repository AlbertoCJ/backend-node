const mongoose = require('mongoose');
// const uniqueValidator = require('mongoose-unique-validator');
const wekaDB = require('../../connectionsDB').wekaDB;

let Schema = mongoose.Schema;

let Status = {
    values: ['ACCEPTED', 'RUNNING', 'COMPLETED', 'CANCELLED', 'ERROR']
};

let Step = {
    values: ['PREPARATION', 'TRAINING', 'VALIDATION', 'PREDICTION', 'SAVED']
};

let taskSchema = new Schema({
    taskID: {
        type: String
    },
    URI: {
        type: String
    },
    resultURI: {
        type: String
    },
    date: {
        type: Date
    },
    creator: {
        type: String
    },
    step: {
        type: String,
        enum: Step
    },
    title: {
        type: String
    },
    hasStatus: {
        type: String,
        enum: Status
    },
    description: {
        type: String
    },
    percentageCompleted: {
        type: Number
    },
});

module.exports = wekaDB.model('task', taskSchema);