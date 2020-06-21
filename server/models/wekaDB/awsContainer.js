const mongoose = require('mongoose');
const wekaDB = require('../../connectionsDB').wekaDB;

let Schema = mongoose.Schema;

let awsContainerSchema = new Schema({
    Application_name: {
        type: String
    },
    Environment_name: {
        type: Array
    },
    Health: {
        type: String
    },
    Health_status: {
        type: String // 'Unknown', 'pending', 'OK'
    },
    Status: {
        type: String // 'Launching', 'Updating', 'Ready', 'Terminating', 'Terminated'
    },
    Endpoint_URL: {
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

module.exports = wekaDB.model('AwsContainer', awsContainerSchema);