const Docker = require('dockerode');
const docker = new Docker({ host: 'localhost', port: 2375 });
const axios = require('axios');

getListContainers = async() => { // Listado de contenedores
    let [containersPromise] = await Promise.all([docker.listContainers({ all: true })]);
    let containersValid = containersPromise.filter(container => Number(container.Ports[0].PublicPort) >= 60000);
    return containersValid;
}

runAlgorithm = async(algorithm, container, headers, formData) => {
    let requestConfig = {
        headers: {
            'accept': 'application/json',
            'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
        }
    }

    let result = await axios.post(`http://localhost:${ container.Ports[0].PublicPort }/algorithm/${ algorithm.endpoint }`, formData, requestConfig)
        .then(response => {
            console.log(response.data);
            return response.data;
            // return response
        })
        .catch(err => {
            console.log(err);
            return err;
        });
    return result;
}

thereAreAlgorithms = (listAlgorithm) => { // ¿Hay algoritmos?
    return listAlgorithm.length > 0;
}

thereAreContainers = (containersFree) => { // ¿Hay contenedores?
    return containersFree.length > 0;
}

module.exports = {
    getListContainers,
    runAlgorithm,
    thereAreAlgorithms,
    thereAreContainers
}