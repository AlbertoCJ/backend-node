const express = require('express');
const { verifyToken } = require('../middlewares/authentication');
const {
    createArrayAlgorithms,
    isAnyAlgorithms,
    generateFormData,
    postRequest,
    getRequest,
    thereAreAlgorithms,
    thereAreContainers,
    getContainersFree,
    releaseContainer,
    liberateContainer,
    updateContainerWorking,
    updateContainerWithJobId,
    updateDataAlgorithms,
    removeTask,
    removeModel,
    waitRamdonSeconds
} = require('../impl/algorithmImpl');

const delay = require('delay');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
// const axios = require('axios');
const Job = require('../models/appDB/job');

const app = express();

app.post('/algorithm', verifyToken, (req, res) => {

    let user_id = req.user._id;
    let fileName = req.body.fileName; // 'weather-11-6-807.arff';
    // let fileName = 'housing.arff'; // 'housing-1-1-336.arff';
    if (!fileName) {
        res.status(400).json({
            ok: false,
            error: {
                message: 'You must pass a fileName.'
            }
        });
    }
    let pathFile = path.resolve(__dirname, `../../${process.env.PATH_FILES_DATASET}/${ fileName }`);
    if (!fs.existsSync(pathFile)) {
        res.status(400).json({
            ok: false,
            error: {
                pathFile,
                message: 'File does not exist.'
            }
        });
    }

    let jobName = req.body.jobName;
    // let jobName = 'jobName';
    if (!jobName) {
        res.status(400).json({
            ok: false,
            error: {
                message: 'You must pass a jobName.'
            }
        });
    }
    let jobDescription = req.body.jobDescription || '';

    // const algoritHardcode = [{ // TODO: HARDCODE
    //         name: 'Linear Regression',
    //         endpoint: 'linearRegression',
    //         config: {

    //         }
    //     },
    //     {
    //         name: 'Linear Regression Bagging',
    //         endpoint: 'linearRegression/bagging',
    //         config: {

    //         }
    //     },
    //     {
    //         name: 'IBk',
    //         endpoint: 'IBk',
    //         config: {

    //         }
    //     },
    //     {
    //         name: 'ZeroR',
    //         endpoint: 'ZeroR',
    //         config: {

    //         }
    //     },
    //     {
    //         name: 'M5P',
    //         endpoint: 'M5P',
    //         config: {

    //         }
    //     },
    //     {
    //         name: 'M5Rules',
    //         endpoint: 'M5Rules',
    //         config: {

    //         }
    //     },
    //     {
    //         name: 'DecisionStump',
    //         endpoint: 'DecisionStump',
    //         config: {

    //         }
    //     },
    //     {
    //         name: 'DecisionStump Bagging',
    //         endpoint: 'DecisionStump/bagging',
    //         config: {

    //         }
    //     }
    // ];

    // let listAlgorithm = algoritHardcode; // []; // TODO: Llega por req peticion

    let algorithms = JSON.parse(req.body.algorithms);
    if (!algorithms) {
        res.status(400).json({
            ok: false,
            error: {
                message: 'You must pass a list algorithms.'
            }
        });
    }
    // let provisionalAlgo = { linearRegression: { algorithm: { id: 1, name: "Linear Regression", endpoint: "linearRegression", config: { attributeSelectionMethod: 2, eliminateColinearAttributes: "0", validation: "Hold-Out", validationNum: "5" } } }, linearRegressionBagging: { algorithm: null }, IBk: { algorithm: null }, ZeroR: { algorithm: null }, M5P: { algorithm: null }, M5Rules: { algorithm: null }, DecisionStump: { algorithm: null }, DecisionStumpBagging: { algorithm: null } };
    // algorithms = provisionalAlgo; // JSON.parse(algorithms);algorithms
    if (!isAnyAlgorithms(algorithms)) {
        res.status(400).json({
            ok: false,
            error: {
                message: 'You must pass one or more algorithms.'
            }
        });
    }

    let jobCreated = null;

    let containers = JSON.parse(req.body.containers) || [];

    let job = new Job({
        name: jobName,
        description: jobDescription,
        dataAlgorithms: algorithms,
        user: req.user._id
    });

    let listAlgorithm = createArrayAlgorithms(algorithms);
    // let containersFree = [];
    let containersWorking = [];

    job.save(async(err, jobDB) => {
        if (err) {
            return res.status(500).json({
                ok: false,
                err
            });
        }
        console.log('Guardado job');
        // Almaceno el job creado
        jobCreated = jobDB;

        containers = await updateContainerWithJobId(containers, jobDB._id);

        res.json({
            ok: true,
            job: jobDB,
            containers
        });

        mainFunction();
    });

    mainFunction = async() => {
        let running = true;
        while (running) {

            // Check number of algorithms and number of containers
            const numAlgorithms = listAlgorithm.length;
            const numContainers = containers.length;
            if (numAlgorithms > numContainers) { // Get container inactives
                let numContainersGet = numAlgorithms - numContainers;
                let containersFree = await getContainersFree(numContainersGet, user_id, jobCreated._id);
                containersFree.forEach(containerFree => {
                    containers.push(containerFree);
                });
            }

            if (numAlgorithms < numContainers) { // Liberate containers
                let numContainersRemove = numContainers - numAlgorithms;
                for (let i = 0; i < numContainersRemove; i++) {
                    let container = containers.shift();
                    // Liberate containers
                    await liberateContainer(container);
                }
            }

            while (thereAreContainers(containers)) {
                let algorithm = listAlgorithm.shift();
                let container = containers.shift();

                // TODO: actualizar contenedor: Working = true, Date_work_end = date now
                container = await updateContainerWorking(container);

                let formData = generateFormData(algorithm.config); // new FormData();
                formData.append('file', fs.createReadStream(pathFile));

                let requestConfig = {
                    headers: {
                        'accept': 'application/json',
                        'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
                    }
                }

                let promise = await postRequest(`http://localhost:${ container.Port.PublicPort }/algorithm/${ algorithm.endpoint }`, formData, requestConfig);
                if (promise.status) {
                    if (promise.status === 200 || promise.status === 201 || promise.status === 202) {
                        containersWorking.push({ algorithm, container, task: promise.data });
                    } else {
                        console.log(promise);
                        containersWorking.push({ algorithm, container, task: promise.data });
                    }

                } else {
                    // TODO: ¿Que hacer con este error?
                    console.error(promise);
                    // containersWorking.push({ algorithm, container, error: promise });
                }

                // console.log('containersWorking', containersWorking);
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
                            if (taskUpdated.hasStatus === 'RUNNING') {

                                await Job.findById(jobCreated._id, async(err, jobDB) => {

                                    if (err) {
                                        console.error(err);
                                    } else {
                                        let dataAlgorithms = jobDB.dataAlgorithms;
                                        dataAlgorithms = updateDataAlgorithms(containerWork.algorithm, dataAlgorithms, taskUpdated, null);
                                        await Job.findByIdAndUpdate(jobCreated._id, { dataAlgorithms }, { new: true }, (err, jobDB) => {
                                            jobCreated = jobDB;
                                            // console.log(jobDB); // TODO: Eliminar
                                        });
                                    }
                                });
                            }
                            if (taskUpdated.hasStatus === 'ERROR') {

                                await Job.findById(jobCreated._id, async(err, jobDB) => {

                                    if (err) {
                                        console.error(err);
                                    } else {
                                        let dataAlgorithms = jobDB.dataAlgorithms;
                                        dataAlgorithms = updateDataAlgorithms(containerWork.algorithm, dataAlgorithms, taskUpdated, null);
                                        await Job.findByIdAndUpdate(jobCreated._id, { dataAlgorithms, hasStatus: 'PARTIAL' }, { new: true }, async(err, jobDB) => {
                                            jobCreated = jobDB;
                                            // console.log(jobDB); // TODO: Eliminar
                                            // TODO: Eliminar task and model de wekaDB
                                            // await removeTask(task.taskID);
                                        });
                                    }
                                });

                                // Release container
                                let containerUpdated = await releaseContainer(containerWork.container);
                                containers.push(containerUpdated);
                                containerWork.task = null;
                            }
                            if (task.hasStatus === 'COMPLETED' && task.percentageCompleted === 100) {
                                let promiseModel = await getRequest(task.resultURI);
                                if (promiseModel.status) {
                                    if (promiseModel.status === 200 || promiseModel.status === 201 || promiseModel.status === 202) {
                                        model = promiseModel.data;

                                        await Job.findById(jobCreated._id, async(err, jobDB) => {
                                            // TODO: Controlar error
                                            if (err) {
                                                console.error(err);
                                            } else {
                                                let dataAlgorithms = jobDB.dataAlgorithms;
                                                dataAlgorithms = updateDataAlgorithms(containerWork.algorithm, dataAlgorithms, taskUpdated, model);
                                                await Job.findByIdAndUpdate(jobCreated._id, { dataAlgorithms }, { new: true }, async(err, jobDB) => {
                                                    jobCreated = jobDB;
                                                    // console.log(jobDB); // TODO: Eliminar
                                                    // TODO: Eliminar task and model de wekaDB
                                                    // await removeTask(task.taskID);
                                                    // let arrayModel = task.resultURI.split('/');
                                                    // await removeModel(arrayModel[arrayModel.length - 1]);
                                                });
                                            }
                                        });

                                        // Release container
                                        let containerUpdated = await releaseContainer(containerWork.container);
                                        containers.push(containerUpdated);
                                        containerWork.task = null;
                                    } else {
                                        // TODO: ¿Que hacer con este error? Guardar model como viene
                                        console.log(promise);
                                    }
                                } else {
                                    // TODO: ¿Que hacer con este error? Crear un objeto model del estilo de error de la api, y guardarlo en model
                                    // No se pudo obtener modelo
                                    console.log(promise);
                                }
                            }
                        } else {
                            // TODO: ¿Que hacer con este error? Guardar task como viene
                            console.log(promise);
                        }
                    } else {
                        // TODO: ¿Que hacer con este error? Crear un objeto task del estilo de error de la api, y guardarlo en task
                        // No se pudo obtener task
                        console.log(promise);
                    }
                }
            }

            // Remove containersWorking free
            containersWorking = containersWorking.filter(contWork => contWork.task !== null);

            // Finish Job
            if (containersWorking.length === 0 && listAlgorithm.length === 0) {
                if (jobCreated.hasStatus === 'RUNNING') {
                    await Job.findByIdAndUpdate(jobCreated._id, { hasStatus: 'COMPLETED' }, { new: true }, (err, jobDB) => {
                        jobCreated = jobDB;
                    });
                }

                while (containers.length > 0) {
                    let container = containers.shift();
                    // Liberate containers
                    await liberateContainer(container);
                }
                running = false;
            }
            // Wait a seconds
            await waitRamdonSeconds();
        }
        console.log('End');
    }



});

module.exports = app;