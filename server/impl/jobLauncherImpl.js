const FormData = require('form-data');
const axios = require('axios');
const Job = require('../models/appDB/job');
const Time = require('../models/appDB/time');
const LocalContainer = require('../models/wekaDB/localContainer');
const AwsContainer = require('../models/wekaDB/awsContainer');

const AWS = require('aws-sdk');
const { isError } = require('underscore');
AWS.config.update({region:'us-east-1'});
const elasticbeanstalk = new AWS.ElasticBeanstalk();

// Obtiene los jobs corriendo
getJobsRunning = async() => {
    let jobsRunning = [];
    jobsRunning = await Job.find({ $query: { hasStatus: 'RUNNING' }, $orderby: { dateCreation: 'desc' } }, async(err, jobsRunningDB) => {
        if (err) {
            return [];
        }
        if (jobsRunningDB) {
            return jobsRunningDB;
        }
    });
    return jobsRunning;
}

// Obtiene el numero de algoritmos que estan esperando para ser lanzados.
getNumberAlgorithmsWaiting = (job) => {
    let numAlgorithmsWaiting = 0;
    let dataAlgorithms = job.dataAlgorithms;
    for (const key in dataAlgorithms) {
        if (dataAlgorithms.hasOwnProperty(key)) {
            // Si existe algoritmo y no existe ni task ni container, algoritmo esperando.
            if (dataAlgorithms[key].algorithm && !dataAlgorithms[key].task && !dataAlgorithms[key].container && dataAlgorithms[key].algorithm.status === 'OK') {
                numAlgorithmsWaiting++;
            }
        }
    }
    return numAlgorithmsWaiting;
}

// Actualiza los contenedores en DB
updateAWSContainerLaunching = async(userId, jobId) => {
    await AwsContainer.find({ "User_id": userId, "Job_id": jobId, "Working": false, Status: 'Launching' }, async(err, listContainers) => {
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
getContainersOwn = async(userId, jobId, platform) => {
    let containersOwn = [];
    if (platform === 'LOCAL') {
        containersOwn = await LocalContainer.find({ "User_id": userId, "Job_id": jobId, "Working": false }, async(err, listContainers) => {
            if (err) {
                return [];
            }
            if (listContainers) {
                return listContainers;
            }
        });
    } else {
        containersOwn = await AwsContainer.find({ "User_id": userId, "Job_id": jobId, "Working": false, Status: 'Ready' }, async(err, listContainers) => {
            if (err) {
                return [];
            }
            if (listContainers) {
                return listContainers;
            }
        });
    }
    
    return containersOwn;
}

// Obtiene los contenedores libres (sin usuario ni job asignado), asignandolos a ese usuario y job
getContainersFree = async(numContainersGet, userId, jobId, platform) => {
    let containersUpdated = [];

    if (platform === 'LOCAL') {
        await LocalContainer.find({ "User_id": "", "Job_id": "", "Working": false }, async(err, listContainers) => {
            if (listContainers) {
                for (let i = 0; i < numContainersGet && i < listContainers.length; i++) {
                    let container = listContainers[i];
                    await LocalContainer.findByIdAndUpdate(container._id, { User_id: userId, Job_id: jobId }, { new: true }, (err, containerUpdated) => {
                        if (containerUpdated) {
                            containersUpdated.push(containerUpdated);
                        }
                    });
                }
    
            }
        });
    } else {
        await AwsContainer.find({ "User_id": "", "Job_id": "", "Working": false, Status: 'Ready' }, async(err, listContainers) => {
            if (listContainers) {
                for (let i = 0; i < numContainersGet && i < listContainers.length; i++) {
                    let container = listContainers[i];
                    await LocalContainer.findByIdAndUpdate(container._id, { User_id: userId, Job_id: jobId }, { new: true }, (err, containerUpdated) => {
                        if (containerUpdated) {
                            containersUpdated.push(containerUpdated);
                        }
                    });
                }
    
            }
        });
    }
    
    return containersUpdated;
}

// Actualizar contenedor working true y date_work_end fecha actual
updateContainerWorking = async(container, platform) => {
    let containerWorking = [];
    if (platform === 'LOCAL') {
        containerWorking = await LocalContainer.findByIdAndUpdate(container._id, { Working: true, Date_work_end: new Date() }, { new: true })
        .then(containerUpdated => {
            return containerUpdated;
        })
        .catch(err => {
            console.error(err);
        });
    } else {
        containerWorking = await AwsContainer.findByIdAndUpdate(container._id, { Working: true, Date_work_end: new Date() }, { new: true })
        .then(containerUpdated => {
            return containerUpdated;
        })
        .catch(err => {
            console.error(err);
        });
    }

    return containerWorking;
}

// Genera FormData para petición
generateFormData = (config) => {
    let formData = new FormData();

    for (var key in config) {
        if (config.hasOwnProperty(key)) {
            formData.append(key, config[key]);
        }
    }
    return formData;
}

postRequest = async(url, formData, requestConfig) => {
    return axios.post(url, formData, requestConfig).then(promise => {
        return promise;
    }).catch(err => {
        return err;
    });
}

getRequest = async(url) => {
    return axios.get(url).then(promise => {
        return promise;
    }).catch(err => {
        return err;
    });
}

// Libera el contenedor poniendo working a false
releaseContainer = async(container, platform) => {
    let containerReleased = [];
    if (platform === 'LOCAL') {
        containerReleased = await LocalContainer.findByIdAndUpdate(container._id, { Working: false, Date_work_end: new Date() }, { new: true })
        .then(containerUpdated => {
            return containerUpdated;
        })
        .catch(err => {
            console.error(err);
        });
    } else {
        containerReleased = await AwsContainer.findByIdAndUpdate(container._id, { Working: false, Date_work_end: new Date() }, { new: true })
        .then(containerUpdated => {
            return containerUpdated;
        })
        .catch(err => {
            console.error(err);
        });
    }
    return containerReleased;
}

// Libera el contenedor del usuario y job, tambien pone a working false
liberateContainer = async(container, platform) => {
    if (platform === 'LOCAL') {
        await LocalContainer.findByIdAndUpdate(container._id, { Working: false, Date_work_end: new Date(), User_id: '', Job_id: '' }, { new: true })
        .then(containerUpdated => {
            return containerUpdated;
        })
        .catch(err => {
            console.error(err);
        });
    } else { // 'AWS'
        await AwsContainer.findByIdAndUpdate(container._id, { Working: false, Date_work_end: new Date(), User_id: '', Job_id: '' }, { new: true })
        .then(containerUpdated => {
            return containerUpdated;
        })
        .catch(err => {
            console.error(err);
        });
    }
    
}

isCompleted = (job) => {
    let completed = true;
    let dataAlgorithms = job.dataAlgorithms;
    for (const key in dataAlgorithms) {
        if (dataAlgorithms.hasOwnProperty(key) && completed) {
            if (dataAlgorithms[key].algorithm && dataAlgorithms[key].algorithm.status === 'ERROR') {
                completed = false;
            } else if (dataAlgorithms[key].algorithm && !dataAlgorithms[key].task) {
                completed = false;
            } else if (dataAlgorithms[key].task && dataAlgorithms[key].task.status !== 'COMPLETED') {
                completed = false;
            } else if (dataAlgorithms[key].task && dataAlgorithms[key].task.status === 'COMPLETED' && !dataAlgorithms[key].model) {
                completed = false;
            } 
        }
    }
    return completed;
}

isPartial = (job) => {
    let partial = true;
    let dataAlgorithms = job.dataAlgorithms;
    for (const key in dataAlgorithms) {
        if (dataAlgorithms.hasOwnProperty(key) && partial) {
            // if (dataAlgorithms[key].algorithm && !dataAlgorithms[key].task && dataAlgorithms[key].algorithm.status === 'ok') {
            //     partial = false;
            // } else if (dataAlgorithms[key].task && dataAlgorithms[key].task.status !== 'COMPLETED' && dataAlgorithms[key].task.status !== 'ERROR') {
            //     partial = false;
            // } else if (dataAlgorithms[key].task && dataAlgorithms[key].task.status === 'COMPLETED' && !dataAlgorithms[key].model) {
            //     partial = false;
            // }

            if (dataAlgorithms[key].algorithm && dataAlgorithms[key].algorithm.status === 'ERROR') {
                // partial = true;
            } else if(dataAlgorithms[key].algorithm && dataAlgorithms[key].algorithm.status === 'OK' && dataAlgorithms[key].task && dataAlgorithms[key].task.status === 'COMPLETED' && dataAlgorithms[key].model) {
                // partial = true;
            } else {
                partial = false;
            }
        }
    }
    return partial;
}

isFullError = (job) => {
    let error = true;
    let dataAlgorithms = job.dataAlgorithms;
    for (const key in dataAlgorithms) {
        if (dataAlgorithms.hasOwnProperty(key) && error) {
            if (dataAlgorithms[key].algorithm && dataAlgorithms[key].algorithm.status === 'ERROR') {
                // error = true;
            } else {
                error = false;
            }
        }
    }
    return error;
}

// Actualizar time al finalizar job
updateTime = async(job) => {
    await Time.findByIdAndUpdate(job.time, { hasStatus: job.hasStatus, end: new Date() }, { new: true })
        .then(timeUpdated => {
            return timeUpdated;
        })
        .catch(err => {
            console.error(err);
        });
}


module.exports = {
    getJobsRunning,
    getNumberAlgorithmsWaiting,
    updateAWSContainerLaunching,
    getContainersOwn,
    getContainersFree,
    updateContainerWorking,
    generateFormData,
    postRequest,
    getRequest,
    releaseContainer,
    liberateContainer,
    isCompleted,
    isPartial,
    isFullError,
    updateTime
}