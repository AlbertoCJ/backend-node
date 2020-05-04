const FormData = require('form-data');
const axios = require('axios');
const Job = require('../models/appDB/job');
const LocalContainer = require('../models/wekaDB/localContainer');

// Obtiene los jobs corriendo
getJobsRunning = async() => {
    let jobsRunning = [];
    // hasStatus: { $in: ['RUNNING', 'PARTIAL'] }
    jobsRunning = await Job.find({ $query: { hasStatus: 'RUNNING' }, $orderby: { dateCreation: 'desc' } }, async(err, jobsRunningDB) => {
        // await Job.find({ $query: { $or: [{ hasStatus: "COMPLETED" }, { hasStatus: "COMPLETED" }] }, $orderby: { dateCreation: 'desc' } }, async(err, jobsRunningDB) => {
        if (err) {
            return [];
        }
        if (jobsRunningDB) {
            // jobsRunningDB.forEach(jobRunning => { jobsRunning.push(jobRunning); });
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
            if (dataAlgorithms[key].algorithm && !dataAlgorithms[key].task && !dataAlgorithms[key].container) {
                numAlgorithmsWaiting++;
            }
        }
    }
    return numAlgorithmsWaiting;
}



// Obtiene los algoritmos con contenedor asignado
// getAlgorithmsWithContainer = (objectAlgorithms) => {
//     let arrayAlgorithmsWithContainer = [];
//     if (objectAlgorithms.linearRegression.container) { arrayAlgorithmsWithContainer.push(objectAlgorithms.linearRegression); }
//     if (objectAlgorithms.linearRegressionBagging.container) { arrayAlgorithmsWithContainer.push(objectAlgorithms.linearRegressionBagging); }
//     if (objectAlgorithms.IBk.container) { arrayAlgorithms.push(arrayAlgorithmsWithContainer.IBk); }
//     if (objectAlgorithms.ZeroR.container) { arrayAlgorithms.push(arrayAlgorithmsWithContainer.ZeroR); }
//     if (objectAlgorithms.M5P.container) { arrayAlgorithms.push(arrayAlgorithmsWithContainer.M5P); }
//     if (objectAlgorithms.M5Rules.container) { arrayAlgorithms.push(arrayAlgorithmsWithContainer.M5Rules); }
//     if (objectAlgorithms.DecisionStump.container) { arrayAlgorithms.push(arrayAlgorithmsWithContainer.DecisionStump); }
//     if (objectAlgorithms.DecisionStumpBagging.container) { arrayAlgorithms.push(arrayAlgorithmsWithContainer.DecisionStumpBagging); }
//     return arrayAlgorithmsWithContainer;
// }

// Obtiene los algoritmos sin contenedor asignado ni tarea empezada
// getAlgorithmsWithoutContainerAndTask = (objectAlgorithms) => {
//     let arrayAlgorithmsWithoutContainerAndTask = [];
//     if (objectAlgorithms.linearRegression.algorithm && !objectAlgorithms.linearRegression.container && !objectAlgorithms.linearRegression.task) { arrayAlgorithmsWithoutContainerAndTask.push(objectAlgorithms.linearRegression); }
//     if (objectAlgorithms.linearRegressionBagging.algorithm && !objectAlgorithms.linearRegressionBagging.container && !objectAlgorithms.linearRegressionBagging.task) { arrayAlgorithmsWithoutContainerAndTask.push(objectAlgorithms.linearRegressionBagging); }
//     if (objectAlgorithms.IBk.algorithm && !objectAlgorithms.IBk.container && !objectAlgorithms.IBk.task) { arrayAlgorithmsWithoutContainerAndTask.push(objectAlgorithms.IBk); }
//     if (objectAlgorithms.ZeroR.algorithm && !objectAlgorithms.ZeroR.container && !objectAlgorithms.ZeroR.task) { arrayAlgorithmsWithoutContainerAndTask.push(objectAlgorithms.ZeroR); }
//     if (objectAlgorithms.M5P.algorithm && !objectAlgorithms.M5P.container && !objectAlgorithms.M5P.task) { arrayAlgorithmsWithoutContainerAndTask.push(objectAlgorithms.M5P); }
//     if (objectAlgorithms.M5Rules.algorithm && !objectAlgorithms.M5Rules.container && !objectAlgorithms.M5Rules.task) { arrayAlgorithmsWithoutContainerAndTask.push(objectAlgorithms.M5Rules); }
//     if (objectAlgorithms.DecisionStump.algorithm && !objectAlgorithms.DecisionStump.container && !objectAlgorithms.DecisionStump.task) { arrayAlgorithmsWithoutContainerAndTask.push(objectAlgorithms.DecisionStump); }
//     if (objectAlgorithms.DecisionStumpBagging.algorithm && !objectAlgorithms.DecisionStumpBagging.container && !objectAlgorithms.DecisionStumpBagging.task) { arrayAlgorithmsWithoutContainerAndTask.push(objectAlgorithms.DecisionStumpBagging); }
//     return arrayAlgorithmsWithoutContainerAndTask;
// }

// Obtiene los contenedores del usuario y del job asignado
getContainersOwn = async(userId, jobId) => {
    let containersOwn = [];
    containersOwn = await LocalContainer.find({ "User_id": userId, "Job_id": jobId, "Working": false }, async(err, listContainers) => {
        if (err) {
            return [];
        }
        if (listContainers) {
            // listContainers.forEach(container => { containersOwn.push(container) });
            return listContainers;
        }
    });
    return containersOwn;
}

// Obtiene los contenedores libres (sin usuario ni job asignado), asignandolos a ese usuario y job
getContainersFree = async(numContainersGet, userId, jobId) => {
    let containersUpdated = [];
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
    return containersUpdated;
}

// Actualizar contenedor working true y date_work_end fecha actual
updateContainerWorking = async(container) => {
    let containerWorking = await LocalContainer.findByIdAndUpdate(container._id, { Working: true, Date_work_end: new Date() }, { new: true })
        .then(containerUpdated => {
            return containerUpdated;
        })
        .catch(err => {
            console.error(err);
        });
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

// Actualiza task y model en el algoritmo correspondiente
// updateDataAlgorithms = (algorithm, dataAlgorithms, taskUpdated, model, container) => {
//     let newDataAlgorithms = dataAlgorithms;
//     switch (algorithm.id) {
//         case 1:
//             newDataAlgorithms.linearRegression.task = taskUpdated;
//             newDataAlgorithms.linearRegression.model = model;
//             newDataAlgorithms.linearRegression.container = container;
//             break;
//         case 2:
//             newDataAlgorithms.linearRegressionBagging.task = taskUpdated;
//             newDataAlgorithms.linearRegressionBagging.model = model;
//             newDataAlgorithms.linearRegressionBagging.container = container;
//             break;
//         case 3:
//             newDataAlgorithms.IBk.task = taskUpdated;
//             newDataAlgorithms.IBk.model = model;
//             newDataAlgorithms.IBk.container = container;
//             break;
//         case 4:
//             newDataAlgorithms.ZeroR.task = taskUpdated;
//             newDataAlgorithms.ZeroR.model = model;
//             newDataAlgorithms.ZeroR.container = container;
//             break;
//         case 5:
//             newDataAlgorithms.M5P.task = taskUpdated;
//             newDataAlgorithms.M5P.model = model;
//             newDataAlgorithms.M5P.container = container;
//             break;
//         case 6:
//             newDataAlgorithms.M5Rules.task = taskUpdated;
//             newDataAlgorithms.M5Rules.model = model;
//             newDataAlgorithms.M5Rules.container = container;
//             break;
//         case 7:
//             newDataAlgorithms.DecisionStump.task = taskUpdated;
//             newDataAlgorithms.DecisionStump.model = model;
//             newDataAlgorithms.DecisionStump.container = container;
//             break;
//         case 8:
//             newDataAlgorithms.DecisionStumpBagging.task = taskUpdated;
//             newDataAlgorithms.DecisionStumpBagging.model = model;
//             newDataAlgorithms.DecisionStumpBagging.container = container;
//             break;
//     }
//     return newDataAlgorithms;
// }

// Libera el contenedor poniendo working a false
releaseContainer = async(container) => {
    let containerReleased = await LocalContainer.findByIdAndUpdate(container._id, { Working: false, Date_work_end: new Date() }, { new: true })
        .then(containerUpdated => {
            return containerUpdated;
        })
        .catch(err => {
            console.error(err);
        });
    return containerReleased;
}

// Libera el contenedor del usuario y job, tambien pone a working false
liberateContainer = async(container) => {
    await LocalContainer.findByIdAndUpdate(container._id, { Working: false, Date_work_end: new Date(), User_id: '', Job_id: '' }, { new: true })
        .then(containerUpdated => {
            return containerUpdated;
        })
        .catch(err => {
            console.error(err);
        });
}

isCompleted = (job) => {
    let completed = true;
    let dataAlgorithms = job.dataAlgorithms;
    for (const key in dataAlgorithms) {
        if (dataAlgorithms.hasOwnProperty(key)) {
            if (dataAlgorithms[key].algorithm && !dataAlgorithms[key].task) {
                completed = false;
            } else if (dataAlgorithms[key].task && dataAlgorithms[key].task.hasStatus !== 'COMPLETED') {
                completed = false;
            } else if (dataAlgorithms[key].task && dataAlgorithms[key].task.hasStatus === 'COMPLETED' && !dataAlgorithms[key].model) {
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
        if (dataAlgorithms.hasOwnProperty(key)) {
            if (dataAlgorithms[key].algorithm && !dataAlgorithms[key].task) {
                partial = false;
            } else if (dataAlgorithms[key].task && dataAlgorithms[key].task.hasStatus !== 'COMPLETED' && dataAlgorithms[key].task.hasStatus !== 'ERROR') {
                partial = false;
            } else if (dataAlgorithms[key].task && dataAlgorithms[key].task.hasStatus === 'COMPLETED' && !dataAlgorithms[key].model) {
                partial = false;
            }
        }
    }
    return partial;
}



module.exports = {
    getJobsRunning,
    // getAlgorithmsWithContainer,
    // getAlgorithmsWithoutContainerAndTask,
    getContainersOwn,
    getContainersFree,
    updateContainerWorking,
    generateFormData,
    postRequest,
    getRequest,
    // updateDataAlgorithms,
    releaseContainer,
    liberateContainer,
    isCompleted,
    isPartial
}