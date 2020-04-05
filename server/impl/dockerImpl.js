const LocalContainer = require('../models/wekaDB/localContainer');

getCountContainers = async() => {
    let count = await LocalContainer.countDocuments({}, (err, count) => {
        if (err) {
            return -1;
        }
        return count;
    });
    return count;
}

getLastPort = async() => {
    let portReturn = -1;
    let count = await LocalContainer.find({}, (err, containers) => {
        if (err) {
            portReturn = -1;
        }
        let port = 59999;
        containers.forEach(container => {
            if (container.Ports) {
                container.Ports.forEach(continerPort => {
                    if (continerPort.PublicPort > port) {
                        port = continerPort.PublicPort;
                    }
                });
            }
        });
        portReturn = port + 1;
    });
    return portReturn;
}

module.exports = {
    getCountContainers,
    getLastPort
}