// const Docker = require('dockerode');
// const docker = new Docker({ host: 'localhost', port: 2375 });
const mongoose = require('mongoose');
const delay = require('delay');
const axios = require('axios');
const FormData = require('form-data');
const LocalContainer = require('../models/wekaDB/localContainer');
const Task = require('../models/wekaDB/task');
const Model = require('../models/wekaDB/model');

createArrayAlgorithms = (objectAlgorithms) => {
    let arrayAlgorithms = [];
    if (objectAlgorithms.linearRegression.algorithm) { arrayAlgorithms.push(objectAlgorithms.linearRegression.algorithm); }
    if (objectAlgorithms.linearRegressionBagging.algorithm) { arrayAlgorithms.push(objectAlgorithms.linearRegressionBagging.algorithm); }
    if (objectAlgorithms.IBk.algorithm) { arrayAlgorithms.push(objectAlgorithms.IBk.algorithm); }
    if (objectAlgorithms.ZeroR.algorithm) { arrayAlgorithms.push(objectAlgorithms.ZeroR.algorithm); }
    if (objectAlgorithms.M5P.algorithm) { arrayAlgorithms.push(objectAlgorithms.M5P.algorithm); }
    if (objectAlgorithms.M5Rules.algorithm) { arrayAlgorithms.push(objectAlgorithms.M5Rules.algorithm); }
    if (objectAlgorithms.DecisionStump.algorithm) { arrayAlgorithms.push(objectAlgorithms.DecisionStump.algorithm); }
    if (objectAlgorithms.DecisionStumpBagging.algorithm) { arrayAlgorithms.push(objectAlgorithms.DecisionStumpBagging.algorithm); }
    return arrayAlgorithms;
}

isAnyAlgorithms = (objectAlgorithms) => {
    if (objectAlgorithms.linearRegression.algorithm ||
        objectAlgorithms.linearRegressionBagging.algorithm ||
        objectAlgorithms.IBk.algorithm ||
        objectAlgorithms.ZeroR.algorithm ||
        objectAlgorithms.M5P.algorithm ||
        objectAlgorithms.M5Rules.algorithm ||
        objectAlgorithms.DecisionStump.algorithm ||
        objectAlgorithms.DecisionStumpBagging.algorithm) {
        return true;
    }
    return false;
}

// getListContainers = async() => { // Listado de contenedores // TODO: Quizas eliminar
//     let containersPromise = await docker.listContainers({ all: true });
//     let containersValid = containersPromise.filter(container => Number(container.Ports[0].PublicPort) >= 60000);
//     return containersValid;
// }

// removeContainer = async(container) => { // TODO: Quizas eliminar
//     let containerToRemove = await docker.getContainer(container.Id);
//     return containerToRemove.remove({ force: true }) // TODO: ¿Que hacer con el resultado, un return?
//         .then(function(data) {
//             console.log(data);
//             return { ok: true };
//         }).catch(function(err) {
//             console.log(error);
//             return { ok: false };
//         });
// }

// runAllRequests = async(listUrls, listFormDatas, listConfigs, type = 'post') => { // TODO: Quizas eliminar
//     let listRequest = []
//     for (let i = 0; i < listUrls.length; i++) {
//         if (type === 'post') {
//             listRequest.push(axios.post(listUrls[i], listFormDatas[i], listConfigs[i]));
//         } else { // get
//             listRequest.push(axios.get(listUrls[i]));
//         }
//     }

//     try {
//         const listPromise = await axios.all(listRequest);
//         return { ok: true, promises: listPromise };
//     } catch (err) {
//         return { ok: false, err, listPromise };
//     }
// }

generateFormData = (config) => {
    let formData = new FormData();

    for (var key in config) {
        if (config.hasOwnProperty(key)) {
            // Mostrando en pantalla la clave junto a su valor
            // console.log("La clave es " + key + " y el valor es " + config[key]);
            // alert("La clave es " + clave + " y el valor es " + json[clave]);
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

thereAreAlgorithms = (listAlgorithm) => { // ¿Hay algoritmos?
    return listAlgorithm.length > 0;
}

thereAreContainers = (containersFree) => { // ¿Hay contenedores?
    return containersFree.length > 0;
}

getContainersFree = async(numContainersGet, userId, jobId) => {
    let containersUpdated = [];
    await LocalContainer.find({ "User_id": "", "Job_id": "", "Working": false }, async(err, listContainers) => {
        if (listContainers) {
            for (let i = 0; i < numContainersGet && i < listContainers.length; i++) {
                let container = listContainers[i];
                await LocalContainer.findByIdAndUpdate(container._id, { User_id: userId, Job_id: jobId }, { new: true }, (err, containerUpdated) => {
                    if (err) {
                        console.error(err);
                    }
                    if (containerUpdated) {
                        containersUpdated.push(containerUpdated);
                    }
                });
            }

        }
    });
    return containersUpdated;
}

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

liberateContainer = async(container) => {
    await LocalContainer.findByIdAndUpdate(container._id, { Working: false, Date_work_end: new Date(), User_id: '', Job_id: '' }, { new: true })
        .then(containerUpdated => {
            return containerUpdated;
        })
        .catch(err => {
            console.error(err);
        });
}

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

updateContainerWithJobId = async(containers, jobId) => {
    let Job_id = jobId;
    let auxContainers = containers;
    let updateContainers = [];
    for (let i = 0; i < auxContainers.length; i++) {
        let container = auxContainers[i];
        await LocalContainer.findByIdAndUpdate(container._id, { Job_id }, { new: true }, (err, containerUpdated) => {
            if (err) {
                console.error(err);
            }
            if (containerUpdated) {
                updateContainers.push(containerUpdated);
            }
        });
    }
    return updateContainers;
}

updateDataAlgorithms = (algorithm, dataAlgorithms, taskUpdated, model) => {
    let nweDataAlgorithms = dataAlgorithms;
    switch (algorithm.id) {
        case 1:
            nweDataAlgorithms.linearRegression.task = taskUpdated;
            nweDataAlgorithms.linearRegression.model = model;
            break;
        case 2:
            nweDataAlgorithms.linearRegressionBagging.task = taskUpdated;
            nweDataAlgorithms.linearRegressionBagging.model = model;
            break;
        case 3:
            nweDataAlgorithms.IBk.task = taskUpdated;
            nweDataAlgorithms.IBk.model = model;
            break;
        case 4:
            nweDataAlgorithms.ZeroR.task = taskUpdated;
            nweDataAlgorithms.ZeroR.model = model;
            break;
        case 5:
            nweDataAlgorithms.M5P.task = taskUpdated;
            nweDataAlgorithms.M5P.model = model;
            break;
        case 6:
            nweDataAlgorithms.M5Rules.task = taskUpdated;
            nweDataAlgorithms.M5Rules.model = model;
            break;
        case 7:
            nweDataAlgorithms.DecisionStump.task = taskUpdated;
            nweDataAlgorithms.DecisionStump.model = model;
            break;
        case 8:
            nweDataAlgorithms.DecisionStumpBagging.task = taskUpdated;
            nweDataAlgorithms.DecisionStumpBagging.model = model;
            break;
    }
    return nweDataAlgorithms;
}

removeTask = async(taskId) => { // TODO: Eliminar si no vale
    console.log(taskId);
    await Task.findByIdAndDelete(mongoose.Types.ObjectId(taskId), (err, taskRemoved) => {

        if (err) {
            console.error(err);
        }

        if (taskRemoved) {
            // TODO: que devolver?
            console.log(taskRemoved);
        }
    });
}

removeModel = async(modelId) => { // TODO: Eliminar si no vale
    console.log(modelId);
    await Model.findByIdAndDelete(mongoose.Types.ObjectId(modelId), (err, modelRemoved) => {

        if (err) {
            console.error(err);
        }

        if (modelRemoved) {
            // TODO: que devolver?
            console.log(modelRemoved);
        }
    });
}

waitRamdonSeconds = async() => {
    let time = Math.floor(Math.random() * 10) + 4; // aleatorio entre 4 y 10
    await delay(Number(`${ time }000`));
}


module.exports = {
    createArrayAlgorithms,
    isAnyAlgorithms,
    // getListContainers,
    // removeContainer,
    // runAllRequests,
    generateFormData,
    postRequest,
    getRequest,
    thereAreAlgorithms,
    thereAreContainers,
    getContainersFree,
    releaseContainer,
    liberateContainer,
    updateContainerWorking,
    updateContainerWithJobId,
    updateDataAlgorithms,
    removeTask,
    removeModel,
    waitRamdonSeconds
}