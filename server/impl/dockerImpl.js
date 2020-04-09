const LocalContainer = require('../models/wekaDB/localContainer');
const Docker = require('dockerode');
const docker = new Docker({ host: 'localhost', port: 2375 });

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
    let port = await LocalContainer
        .find()
        .sort({ "Port": -1 })
        .limit(1)
        .then((container) => {
            if (container.length > 0) {
                let port = container[0].Port.PublicPort;
                return port + 1;
            } else {
                return 60000;
            }
        })
        .catch(err => {
            console.error(err);
        });

    return port;
}

module.exports = {
    getCountContainers,
    getLastPort
}