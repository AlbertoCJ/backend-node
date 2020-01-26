const express = require('express');
const { verifyToken } = require('../middlewares/authentication');
var Docker = require('dockerode');

const app = express();
const docker = new Docker({ host: 'localhost', port: 2375 });

app.post('/containers', (req, res) => {

    let status = req.body.status;
    let config = {}
    if (status === 'all') {
        config = { all: true };
    } else {
        let statusList = ['created', 'restarting', 'running', 'removing', 'paused', 'exited', 'dead'];
        if (statusList.indexOf(status) < 0) {
            return res.status(400).json({
                ok: false,
                err: {
                    message: 'Status required, the list of status are ' + statusList.join(', ')
                }
            });
        }
        config = { filters: { "status": [status] } };
    }

    docker.listContainers(config)
        .then(function(data) {
            res.json({
                ok: true,
                containers: data
            });
        }).catch(function(err) {
            res.status(500).json({
                ok: false,
                error: err
            });
        });
});

app.post('/containers/:id', (req, res) => {

    let idContainer = req.params.id;
    if (!idContainer) {
        return res.status(400).json({
            ok: false,
            err: {
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

app.post('/container/run', (req, res) => {

    let nContainers = Number(req.body.nContainers);
    if (!nContainers) {
        return res.status(400).json({
            ok: false,
            err: {
                message: 'Number container required'
            }
        });
    }
    if (nContainers > 10 || nContainers < 1) {
        return res.status(400).json({
            ok: false,
            err: {
                message: 'Number container should be between 1 and 10'
            }
        });
    }

    for (let i = 0; i < nContainers; i++) {
        let config = {
            "HostConfig": {
                "Links": ["mongodb:mongodb"],
                "PortBindings": {
                    "8080/tcp": [{
                        "HostPort": (60000 + i).toString()
                    }]
                }
            }
        }

        docker.run('jguweka', [], null, config, {});
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

        setTimeout(function() {
            docker.listContainers({ all: true })
                .then(function(containers) {

                    let containersValid = containers.filter(container => container.Ports[0].PublicPort >= "60000");

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
        }, 2000);
    }
});

module.exports = app;