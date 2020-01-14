const express = require('express');
const { verifyToken } = require('../middlewares/authentication');
var Docker = require('dockerode');

const app = express();
const docker = new Docker({ host: 'localhost', port: 2375 });

app.post('/containers', (req, res) => {

    let status = req.body.status;
    let statusList = ['created', 'restarting', 'running', 'removing', 'paused', 'exited', 'dead'];
    if (statusList.indexOf(status) < 0) {
        return res.status(400).json({
            ok: false,
            err: {
                message: 'Status required, the list of status are ' + statusList.join(', ')
            }
        });
    }

    docker.listContainers({ filters: { "status": [status] } })
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

// TODO: Implementar run container, para generar un contenedor partir del puerto 60000

module.exports = app;