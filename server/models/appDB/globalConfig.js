const mongoose = require('mongoose');
const appDB = require('../../connectionsDB').appDB;

let Schema = mongoose.Schema;

let globalConfigSchema = new Schema({

    localContainer: {
        type: Object,
        default: {
            numContMaxGlobal: 10,
            numContMaxUser: 4
        }
    },
    showLists: {
        type: Object,
        default: {
            dashboard: {
                showLatestsJobs: 2,
                showJobsRunning: 5
            },
            dataset: {
                showDatasets: 4
            },
            job: {
                showJobs: 4
            }
        }
    }
});

module.exports = appDB.model('GlobalConfig', globalConfigSchema);