const express = require('express');
const { verifyToken } = require('../middlewares/authentication');
const { getCountContainers, getLastPort } = require('../impl/dockerImpl');
const LocalContainer = require('../models/wekaDB/localContainer');
var Docker = require('dockerode');

const app = express();
const docker = new Docker({ host: 'localhost', port: 2375 });

app.post('/containers', verifyToken, (req, res) => {

    let status = req.body.status;
    let config = {}
    if (status === 'all' || status === 'valid') {
        config = { all: true };
    } else {
        let statusList = ['created', 'restarting', 'running', 'removing', 'paused', 'exited', 'dead'];
        if (statusList.indexOf(status) < 0) {
            return res.status(400).json({
                ok: false,
                error: {
                    message: 'Status required, the list of status are valid, ' + statusList.join(', ')
                }
            });
        }
        config = { filters: { "status": [status] } };
    }

    docker.listContainers(config)
        .then(function(containers) {
            let containersValid = containers;
            if (status === 'valid') {
                containersValid = containersValid.filter(container => Number(container.Ports[0].PublicPort) >= 60000);
            }
            res.json({
                ok: true,
                containers: containersValid
            });
        }).catch(function(err) {
            res.status(500).json({
                ok: false,
                error: err
            });
        });
});

app.post('/containers/:id', verifyToken, (req, res) => {

    let idContainer = req.params.id;
    if (!idContainer) {
        return res.status(400).json({
            ok: false,
            error: {
                message: 'Id container required'
            }
        });
    }

    let action = req.body.action;
    let actionList = ['stop', 'start', 'remove'];
    if (actionList.indexOf(action) < 0) {
        return res.status(400).json({
            ok: false,
            err: {
                message: 'Action required, the list of actions are ' + actionList.join(', ')
            }
        });
    }

    let container = docker.getContainer(idContainer);

    switch (action) {
        case 'stop':
            container.stop()
                .then(function(data) {
                    res.json({
                        ok: true,
                        data
                    });
                }).catch(function(err) {
                    res.status(500).json({
                        ok: false,
                        error: err
                    });
                });
            break;
        case 'start':
            container.start()
                .then(function(data) {
                    res.json({
                        ok: true,
                        data
                    });
                }).catch(function(err) {
                    res.status(500).json({
                        ok: false,
                        error: err
                    });
                });
            break;
        case 'remove':
            LocalContainer.deleteMany({ Id: idContainer }, function(err) {});
            container.remove({ force: true })
                .then(function(data) {
                    res.json({
                        ok: true,
                        data
                    });
                }).catch(function(err) {
                    res.status(500).json({
                        ok: false,
                        error: err
                    });
                });
            break;
    }
});

app.post('/container/run', verifyToken, (req, res) => {

    init = async() => {
        let nContainers = Number(req.body.nContainers);
        if (!nContainers) {
            return res.status(400).json({
                ok: false,
                error: {
                    message: 'Number container required'
                }
            });
        }

        let numMaxContainerDockerConfig = 4; // TODO: Obtener desde configuracion
        if (!numMaxContainerDockerConfig) {
            return res.status(500).json({
                ok: false,
                error: {
                    message: 'Error when obtaining maximum number of local containers from configuration.'
                }
            });
        }

        let numMaxContainerDocker = await getCountContainers();
        if (numMaxContainerDocker < 0) {
            return res.status(500).json({
                ok: false,
                error: {
                    message: 'Error when obtaining maximum number of local containers from the database.'
                }
            });
        }

        let numContainerRun = numMaxContainerDockerConfig - numMaxContainerDocker;
        if (numContainerRun === 0) {
            return res.status(600).json({ // error 600 creado el maximo de contenedores
                ok: false,
                error: {
                    message: 'No more containers can be created.'
                }
            });
        }
        if (numContainerRun < 0) {
            return res.status(601).json({ // error 601 hay un excesso de contenedores
                ok: false,
                error: {
                    message: 'There is an excess of containers created.'
                }
            });
        }
        if (numContainerRun > 0 && numContainerRun < nContainers) {
            return res.status(602).json({ // error 602 no se pueden crear mas de N contenedores
                ok: false,
                error: {
                    message: `Cannot create more than ${ numContainerRun } containers.`,
                    numMaxContainerRun: numContainerRun
                }
            });
        }

        let nextPort = await getLastPort();

        for (let i = 0; i < nContainers; i++) {
            let config = {
                "Env": [
                    `MONGODB_URI_WEKA_JAVA=${ process.env.MONGODB_URI_WEKA_JAVA }`
                ],
                "HostConfig": {
                    // "Links": ["mongodb:mongodb"],
                    "PortBindings": {
                        "8080/tcp": [{
                            "HostPort": (nextPort + i).toString()
                        }]
                    }
                }
            }

            docker.run('jguweka', [], null, config, {}).catch(function(err) {});
            // , (err, data, container) => {
            //     if (err) {
            //         res.status(500).json({
            //             ok: false,
            //             error: err
            //         });
            //     }
            //     res.json({
            //         ok: true,
            //         data,
            //         container
            //     });
            // });
        }

        setTimeout(function() {
            docker.listContainers({ all: true })
                .then(containersDocker => {
                    let containersValid = containersDocker.filter(container => (container.Ports.length > 0 && Number(container.Ports[0].PublicPort) >= nextPort));

                    let containers = [];
                    containersValid.forEach(containerValid => {

                        let names = [];
                        containerValid.Names.forEach(name => {
                            names.push(name);
                        });

                        let ports = [];
                        containerValid.Ports.forEach(port => {
                            ports.push({
                                "IP": port.IP,
                                "PrivatePort": port.PrivatePort,
                                "PublicPort": port.PublicPort,
                                "Type": port.Type
                            });
                        });

                        let container = new LocalContainer({
                            Id: containerValid.Id,
                            Names: names,
                            Image: containerValid.Image,
                            Ports: ports,
                            State: containerValid.State,
                            User_id: req.user._id
                        });
                        containers.push(container);
                    });

                    LocalContainer.collection.insertMany(containers)
                        .then(result => {
                            res.json({
                                ok: true,
                                containers: result.ops
                            });
                        })
                        .catch(err => {
                            if (err) {
                                res.status(500).json({
                                    ok: false,
                                    error: err
                                });
                            }
                        });
                    //  => {

                    //     if (error) {
                    //         res.status(500).json({
                    //             ok: false,
                    //             error: error
                    //         });
                    //     }

                    //     res.json({
                    //         ok: true,
                    //         containers: insertedContainers.ops
                    //     });
                    // });

                }).catch(err => {
                    res.status(500).json({
                        ok: false,
                        error: err
                    });
                });
        }, 3000 + ((nContainers - 1) * 1000));
    }
    init();
});

module.exports = app;