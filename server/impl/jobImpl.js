const LocalContainer = require('../models/wekaDB/localContainer');
const AwsContainer = require('../models/wekaDB/awsContainer');

isAnyAlgorithms = (objectAlgorithms) => {
    if (objectAlgorithms.linearRegression.algorithm ||
        objectAlgorithms.linearRegressionBagging.algorithm ||
        objectAlgorithms.IBk.algorithm ||
        objectAlgorithms.ZeroR.algorithm ||
        objectAlgorithms.M5P.algorithm ||
        objectAlgorithms.M5PBagging.algorithm ||
        objectAlgorithms.M5Rules.algorithm ||
        objectAlgorithms.DecisionStump.algorithm ||
        objectAlgorithms.DecisionStumpBagging.algorithm ||
        objectAlgorithms.Libsvm.algorithm ||
        objectAlgorithms.LibsvmBagging.algorithm) {
        return true;
    }
    return false;
}

updateContainerWithJobId = async(containers, jobId, platform) => {
    let Job_id = jobId;
    let auxContainers = containers;
    let updateContainers = [];
    for (let i = 0; i < auxContainers.length; i++) {
        let container = auxContainers[i];
        if (platform === 'LOCAL') {
            await LocalContainer.findByIdAndUpdate(container._id, { Job_id }, { new: true })
            .then(containerUpdated => {
                // return containerUpdated;
                updateContainers.push(containerUpdated);
            })
            .catch(err => {
                console.error(err);
            });
        } else {
            await AwsContainer.findByIdAndUpdate(container._id, { Job_id }, { new: true })
            .then(containerUpdated => {
                // return containerUpdated;
                updateContainers.push(containerUpdated);
            })
            .catch(err => {
                console.error(err);
            });
        }
        
    }
    return updateContainers;
}

module.exports = {
    isAnyAlgorithms,
    updateContainerWithJobId
}