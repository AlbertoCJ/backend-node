const FormData = require('form-data');
const axios = require('axios');
const Job = require('../models/appDB/job');
const LocalContainer = require('../models/wekaDB/localContainer');

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
            if (dataAlgorithms[key].algorithm && !dataAlgorithms[key].task && !dataAlgorithms[key].container) {
                numAlgorithmsWaiting++;
            }
        }
    }
    return numAlgorithmsWaiting;
}

// Obtiene los contenedores del usuario y del job asignado
getContainersOwn = async(userId, jobId) => {
    let containersOwn = [];
    containersOwn = await LocalContainer.find({ "User_id": userId, "Job_id": jobId, "Working": false }, async(err, listContainers) => {
        if (err) {
            return [];
        }
        if (listContainers) {
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
        if (dataAlgorithms.hasOwnProperty(key)) {
            if (dataAlgorithms[key].algorithm && !dataAlgorithms[key].task) {
                partial = false;
            } else if (dataAlgorithms[key].task && dataAlgorithms[key].task.status !== 'COMPLETED' && dataAlgorithms[key].task.status !== 'ERROR') {
                partial = false;
            } else if (dataAlgorithms[key].task && dataAlgorithms[key].task.status === 'COMPLETED' && !dataAlgorithms[key].model) {
                partial = false;
            }
        }
    }
    return partial;
}



module.exports = {
    getJobsRunning,
    getContainersOwn,
    getContainersFree,
    updateContainerWorking,
    generateFormData,
    postRequest,
    getRequest,
    releaseContainer,
    liberateContainer,
    isCompleted,
    isPartial
}