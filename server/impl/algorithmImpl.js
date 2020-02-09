var Docker = require('dockerode');
const docker = new Docker({ host: 'localhost', port: 2375 });

// function getContainers() {
//     let promise = ;
//     console.log('Promesa1: ', promise);
//     return promise //TODO: Realizar una peticion usando await mejor que esto
//         // .then(function(containers) {
//         //     let containersValid = containers.filter(container => container.Ports[0].PublicPort >= "60000");
//         //     containersFree = containersValid;
//         //     return containersFree;
//         // }).catch(function(err) {
//         //     res.status(400).json({
//         //         ok: false,
//         //         error: err
//         //     });
//         // });
// }

async function getListContainers() {
    let [containersPromise] = await Promise.all([docker.listContainers({ all: true })]);
    // let resultContainers = await containersPromise;
    // console.log(containersPromise);
    return containersPromise; // resultContainers;
}

module.exports = {
    getListContainers
}