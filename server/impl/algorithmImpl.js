const Docker = require('dockerode');
const docker = new Docker({ host: 'localhost', port: 2375 });
const axios = require('axios');

getListContainers = async() => { // Listado de contenedores
    let [containersPromise] = await Promise.all([docker.listContainers({ all: true })]);
    let containersValid = containersPromise.filter(container => Number(container.Ports[0].PublicPort) >= 60000);
    return containersValid;
}

removeContainer = (container) => {
    let containerToRemove = docker.getContainer(container.Id);
    containerToRemove.stop() // TODO: ¿Que hacer con el resultado, un return?
        .then(function(data) {
            console.log(data);
            return { ok: true };
        }).catch(function(err) {
            console.log(error);
            return { ok: false };
        });
}

runAllRequests = async(listUrls, listFormDatas, listConfigs, type = 'post') => {
    let listRequest = []
    for (let i = 0; i < listUrls.length; i++) {
        if (type === 'post') {
            listRequest.push(axios.post(listUrls[i], listFormDatas[i], listConfigs[i]));
        } else { // get
            listRequest.push(axios.get(listUrls[i]));
        }
    }

    try {
        const listPromise = await axios.all(listRequest);
        return { ok: true, promises: listPromise };
    } catch (err) {
        return { ok: false, err, listPromise };
    }
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

module.exports = {
    getListContainers,
    removeContainer,
    runAllRequests,
    postRequest,
    getRequest,
    thereAreAlgorithms,
    thereAreContainers
}