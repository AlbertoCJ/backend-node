const express = require('express');
const { verifyToken } = require('../middlewares/authentication');
const { getListContainers, thereAreAlgorithms, thereAreContainers, runAllRequests } = require('../impl/algorithmImpl');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
// const axios = require('axios');
const Job = require('../models/job');

const app = express();

app.post('/algorithm2', (req, res) => {

    // let fileName = req.params.fileName; // 'weather-11-6-807.arff';
    let fileName = 'housing.arff'; // 'housing-1-1-336.arff';
    if (!fileName) {
        res.status(400).json({
            ok: false,
            error: {
                message: 'Debes de pasar un nombre de fichero.'
            }
        });
    }
    let pathFile = path.resolve(__dirname, `../../${process.env.PATH_FILES_DATASET}/${ fileName }`);
    if (!fs.existsSync(pathFile)) {
        res.status(400).json({
            ok: false,
            error: {
                pathFile,
                message: 'No existe el fichero'
            }
        });
    }

    const algoritHardcode = [{ // TODO: HARDCODE
            name: 'Linear Regression',
            endpoint: 'linearRegression',
            config: {

            }
        },
        {
            name: 'Linear Regression Bagging',
            endpoint: 'linearRegression/bagging',
            config: {

            }
        },
        {
            name: 'IBk',
            endpoint: 'IBk',
            config: {

            }
        },
        {
            name: 'ZeroR',
            endpoint: 'ZeroR',
            config: {

            }
        },
        {
            name: 'M5P',
            endpoint: 'M5P',
            config: {

            }
        },
        {
            name: 'M5Rules',
            endpoint: 'M5Rules',
            config: {

            }
        },
        {
            name: 'DecisionStump',
            endpoint: 'DecisionStump',
            config: {

            }
        },
        {
            name: 'DecisionStump Bagging',
            endpoint: 'DecisionStump/bagging',
            config: {

            }
        }
    ];

    let listAlgorithm = algoritHardcode; // []; // TODO: Llega por req peticion
    let listAlgorithmError = [];

    let containersFree = [];
    let containersWorking = [];

    let jobCreated = null;

    // TODO: IMPOARTANTE Si hay algoritmos crear objeto basico a guardar en mongo
    let job = new Job({
        name: 'Nombre de prueba',
        description: 'descripción de prueba' // body.description
    });

    job.save((err, jobDB) => {
        if (err) {
            return res.status(500).json({
                ok: false,
                err
            });
        }
        console.log('Guardado job');
        // Almaceno el job creado
        jobCreated = jobDB;

        res.json({
            ok: true,
            status: 'RUNNING Provisional (Se pasará al job)',
            job: jobDB
        });
    });

    // Iniciar setInterval
    // let myVar;
    // init = () => {
    //     myVar = setInterval(mainFunction, 15000);
    // }
    let running = true;
    let firstLoad = true;
    mainFunction = async() => {
        while (running) {
            containersLength = await getListContainers();
            if (firstLoad) {
                containersFree = containersLength;
                firstLoad = false;
            }
            containersLength = containersLength.length;

            // TODO: IMPORTANTE Criterio de parada si no hay containers TREMINA
            if (containersLength === 0) {
                running = false; // Stop
            }

            while (thereAreAlgorithms(listAlgorithm) && thereAreContainers(containersFree)) {
                let algorithm = listAlgorithm.shift();
                let container = containersFree.shift();
                let formData = new FormData();
                formData.append('file', fs.createReadStream(pathFile));
                // TODO: Agregar parametros del algoritmo
                let requestConfig = {
                    headers: {
                        'accept': 'application/json',
                        'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
                    }
                }

                let promise = await postRequest(`http://localhost:${ container.Ports[0].PublicPort }/algorithm/${ algorithm.endpoint }`, formData, requestConfig);
                if (promise.status) {
                    if (promise.status === 200 || promise.status === 201 || promise.status === 202) {
                        containersWorking.push({ algorithm, container, task: promise.data });
                    } else {
                        // TODO: ¿Que hacer con este error?
                        console.log(promise);
                        // containersWorking.push({ algorithm, container, error: promise });
                    }

                } else {
                    // TODO: ¿Que hacer con este error?
                    console.log(promise);
                    // containersWorking.push({ algorithm, container, error: promise });
                }
            }



            // Recorre containersWorking
            for (let i = 0; i < containersWorking.length; i++) {
                let containerWork = containersWorking[i];
                let task = containerWork.task;
                if (task) {
                    let promiseTask = await getRequest(task.uri);
                    if (promiseTask.status) {
                        if (promiseTask.status === 200 || promiseTask.status === 201 || promiseTask.status === 202) {
                            let taskUpdated = promiseTask.data;
                            // Agregar task a containersWorking
                            containerWork.task = taskUpdated;

                            // Comprobaciones
                            if (taskUpdated.hasStatus === 'ERROR') {
                                // console.log('ko:  ', jobCreated._id);
                                Job.findById(jobCreated._id, (err, jobDB) => {
                                    // TODO: Controlar error
                                    let jobItems = jobDB.jobItems;
                                    jobItems.push({ algorithm: containerWork.algorithm, task: taskUpdated, model: null });
                                    Job.findByIdAndUpdate(jobCreated._id, { jobItems })
                                });
                                // Libero contenedor
                                containersFree.push(containerWork.container);
                                containerWork.task = null;
                            }
                            if (task.hasStatus === 'COMPLETED' && task.percentageCompleted === 100) {
                                // let promiseModel = await runAllRequests([task.resultURI], null, null, 'get');
                                let promiseModel = await getRequest(task.resultURI);
                                if (promiseModel.status) {
                                    if (promiseModel.status === 200 || promiseModel.status === 201 || promiseModel.status === 202) {
                                        model = promiseModel.data;
                                        // console.log('ok:  ', jobCreated._id);
                                        console.log(containerWork, ' AHORO');
                                        Job.findById(jobCreated._id, (err, jobDB) => {
                                            // TODO: Controlar error
                                            if (err) {
                                                console.log(err);
                                                // running = false;
                                            } else {
                                                let jobItems = jobDB.jobItems;
                                                jobItems.push({ algorithm: containerWork.algorithm, task: taskUpdated, model });
                                                Job.findByIdAndUpdate(jobCreated._id, { jobItems })
                                            }
                                        });

                                        // Libero contenedor
                                        containersFree.push(containerWork.container);
                                        containerWork.task = null;
                                    } else {
                                        // TODO: ¿Que hacer con este error?
                                        console.log(promise);
                                    }
                                } else {
                                    // TODO: ¿Que hacer con este error?
                                    console.log(promise);
                                }
                            }
                        } else {
                            // TODO: ¿Que hacer con este error?
                            console.log(promise);
                        }
                    } else {
                        // TODO: ¿Que hacer con este error?
                        console.log(promise);
                    }
                }
            }

            // Elimino los containersWorking libres
            containersWorking = containersWorking.filter(contWork => contWork.task !== null);

            if (containersWorking.length === 0) {
                // Elimino contenedores libres sin usar
                // while (containersFree.length > 0) {
                //     let removed = removeContainer(containersFree[0]);
                //     // TODO: ¿Que hacer si da error?
                //     containersFree.shift();
                // }
                running = false; // Stop
                console.log('FIN');
            }
        }
    }

    mainFunction();
    // init();

});

module.exports = app;