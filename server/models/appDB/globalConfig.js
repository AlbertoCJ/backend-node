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
                showLatestsJobs: 5,
                showJobsRunning: 2
            },
            dataset: {
                showDatasets: 4
            },
            job: {
                showJobs: 4
            }
        }
    },
    algorithms: {
        type: Object,
        default: {
            linearRegression: true,
            linearRegressionBagging: true,
            IBk: true,
            ZeroR: true,
            M5P: true,
            M5PBagging: true,
            M5Rules: true,
            DecisionStump: true,
            DecisionStumpBagging: true,
            Libsvm: true,
            LibsvmBagging: true
        }
    }
});

module.exports = appDB.model('GlobalConfig', globalConfigSchema);