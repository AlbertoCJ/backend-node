const LocalContainer = require('../models/wekaDB/localContainer');
const GlobalConfig = require('../models/appDB/globalConfig');
// const Docker = require('dockerode');
// const docker = new Docker({ host: 'localhost', port: 2375 });

getNumContMaxGlobal = async() => {
    let numContMaxGlobal = await GlobalConfig.find({}, (err, globalConfigDB) => {
        if (err) {
            console.error(err);
            return null;
        }
        if (globalConfigDB.length > 0) {
            return globalConfigDB[0].localContainer.numContMaxGlobal;
        } else {
            return null;
        }
    });
    return numContMaxGlobal;
}

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
    getNumContMaxGlobal,
    getCountContainers,
    getLastPort
}