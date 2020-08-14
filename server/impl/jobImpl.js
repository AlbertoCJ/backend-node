const LocalContainer = require('../models/wekaDB/localContainer');
const AwsContainer = require('../models/wekaDB/awsContainer');
const AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});
const elasticbeanstalk = new AWS.ElasticBeanstalk();

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

// Actualiza la hora en los contenedores en DB
updateAWSContainerFree = async() => { // userId, jobId
    await AwsContainer.find({ Job_id: '', User_id: '' }, async(err, listContainers) => {    
        if (err) {
            return [];
        }
        if (listContainers) {
            // return listContainers;
            listContainers.forEach(async awsContainerDB => {
                let params = {
                    EnvironmentNames: [
                        awsContainerDB.Environment_name[0]
                    ]
                };
                await elasticbeanstalk.describeEnvironments(params, async function(err, dataGetEnvironment) {
                    if (err) console.log(err, err.stack); // an error occurred
                    else {  // successful response  
                        let dataEnv = dataGetEnvironment.Environments[0];
                        
                        let awsContainerUpdate = {
                            Health: dataEnv.Health,
                            Health_status: dataEnv.HealthStatus,
                            Status: dataEnv.Status,
                            Endpoint_URL: dataEnv.EndpointURL,
                            Date_work_end: new Date()
                        };
                
                        await AwsContainer.findByIdAndUpdate(awsContainerDB._id, awsContainerUpdate, { new: true })
                        .then(containerUpdated => {
                            // return containerUpdated;
                            // updateContainers.push(containerUpdated);
                        })
                        .catch(err => {
                            console.error(err);
                        });

                    }         
                });
            });
        }
    });
}

// Obtiene los contenedores del usuario y del job asignado
getMyContainersAws = async(userId, jobId) => {
    let containersOwn = [];
    containersOwn = await AwsContainer.find({ "User_id": userId, "Job_id": jobId }, async(err, listContainers) => {
        if (err) {
            return [];
        }
        if (listContainers) {
            return listContainers;
        }
    });
    return containersOwn;
}

module.exports = {
    isAnyAlgorithms,
    updateContainerWithJobId,
    updateAWSContainerFree,
    getMyContainersAws
}