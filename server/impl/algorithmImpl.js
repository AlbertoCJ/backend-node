const Docker = require('dockerode');
const docker = new Docker({ host: 'localhost', port: 2375 });
const axios = require('axios');

getListContainers = async() => { // Listado de contenedores
    let [containersPromise] = await Promise.all([docker.listContainers({ all: true })]);
    let containersValid = containersPromise.filter(container => Number(container.Ports[0].PublicPort) >= 60000);
    return containersValid;
}

runAllRequests = async(listUrls, listFormDatas, listConfigs) => {

    try {
        let listRequest = []
        for (let i = 0; i < listUrls.length; i++) {
            listRequest.push(axios.post(listUrls[i], listFormDatas[i], listConfigs[i]));
        }
        const listPromise = await axios.all(listRequest);
        return { ok: true, promises: listPromise };
    } catch (err) {
        return { ok: false, err };
    }
}

thereAreAlgorithms = (listAlgorithm) => { // ¿Hay algoritmos?
    return listAlgorithm.length > 0;
}

thereAreContainers = (containersFree) => { // ¿Hay contenedores?
    return containersFree.length > 0;
}

module.exports = {
    getListContainers,
    runAllRequests,
    thereAreAlgorithms,
    thereAreContainers
}