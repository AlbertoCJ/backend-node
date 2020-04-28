const fs = require('fs');
const path = require('path');
const Job = require('../models/appDB/job');
const {
    getJobsRunning,
    getAlgorithmsWithContainer,
    getAlgorithmsWithoutContainerAndTask,
    getContainersOwn,
    getContainersFree,
    updateContainerWorking,
    generateFormData,
    postRequest,
    getRequest,
    updateDataAlgorithms,
    releaseContainer,
    liberateContainer
} = require('./jobLauncherImpl');

mainManagerJobLauncher = async() => {

    console.log('Init');

    // Obtener listado jobs RUNNING
    let jobsRunning = await getJobsRunning();

    console.log('JOBSRUNNING', jobsRunning);

    // Recorrer jobs
    for (let i = 0; i < jobsRunning.length; i++) {
        let job = jobsRunning[i];
        console.log('JOB', job);
        let pathFile = path.resolve(__dirname, `../../${process.env.PATH_FILES_DATASET}/${ job.fileName }`);
        // TODO: Si no existe agregar error al job no res.status
        // if (!fs.existsSync(pathFile)) {
        //     res.status(400).json({
        //         ok: false,
        //         error: {
        //             pathFile,
        //             message: 'File does not exist.'
        //         }
        //     });
        // }

        let algorithmsRunnings = getAlgorithmsWithContainer(job.dataAlgorithms);
        console.log('algorithmsRunnings', algorithmsRunnings);
        let algorithmsRunningsTemp = [];
        let algorithmsWaitings = getAlgorithmsWithoutContainerAndTask(job.dataAlgorithms);
        console.log('algorithmsWaitings', algorithmsWaitings);

        // Si hay algoritmos esperando, busco contenedores disponibles
        if (algorithmsWaitings.length > 0) {
            let containersOwn = await getContainersOwn(job.user.toString(), job._id.toString());
            console.log('containersOwn', containersOwn);

            // Primeo asignar contenedores propios a algoritmos en espera y muevo algoritmo a algorithmsRunningsTemp
            while (algorithmsWaitings.length > 0 && containersOwn.length > 0) {
                let algorithm = algorithmsWaitings.shift();
                let container = containersOwn.shift();
                algorithm.container = container;
                algorithmsRunningsTemp.push(algorithm);
            }

            // Si sobran contenedores propios los libero
            for (let i = 0; i < containersOwn.length; i++) {
                await liberateContainer(containersOwn[i]);
            }

            // Si quedan algoritmos esperando, busco contenedores libres
            if (algorithmsWaitings.length > 0) {
                let containersFree = await getContainersFree(algorithmsWaitings.length, job.user, job._id);

                // Segundo asignar contenedores libres a algoritmos en espera y muevo algoritmo a algorithmsRunningsTemp
                while (algorithmsWaitings.length > 0 && containersFree.length > 0) {
                    let algorithm = algorithmsWaitings.shift();
                    let container = containersFree.shift();
                    algorithm.container = container;
                    algorithmsRunningsTemp.push(algorithm);
                }
            }
        }

        // Recorrer algoritmos running temporales y lanzo petición
        while (algorithmsRunningsTemp.length > 0) {
            let algorithmData = algorithmsRunningsTemp.shift();

            // Actualizar contenedor: Working = true, Date_work_end = date now
            algorithmData.container = await updateContainerWorking(algorithmData.container);

            let formData = generateFormData(algorithmData.algorithm.config);
            formData.append('file', fs.createReadStream(pathFile));

            let requestConfig = {
                headers: {
                    'accept': 'application/json',
                    'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
                }
            }

            // TODO: Llevar el http://localhost a config, variable de entorno URL_DOCKER_SERVER
            let promise = await postRequest(`http://localhost:${ algorithmData.container.Port.PublicPort }/algorithm/${ algorithmData.algorithm.endpoint }`, formData, requestConfig);
            if (promise.status) {
                if (promise.status === 200 || promise.status === 201 || promise.status === 202) {
                    algorithmData.task = promise.data;
                    // containersWorking.push({ algorithm, container, task: promise.data });
                } else {
                    console.log(promise);
                    algorithmData.task = promise.data;
                    // containersWorking.push({ algorithm, container, task: promise.data });
                }
                // TODO: Provisional hasta gestionar errores ######
                algorithmsRunnings.push(algorithmData);

            } else {
                // TODO: ¿Que hacer con este error?
                console.error(promise);
                // containersWorking.push({ algorithm, container, error: promise });
            }

            // console.log('containersWorking', containersWorking);
        }

        // Recorrer algoritmos running
        for (let i = 0; i < algorithmsRunnings.length; i++) {
            let algorithm = algorithmsRunnings[i];
            let task = algorithm.task;
            if (task) {
                let promiseTask = await getRequest(task.uri);
                if (promiseTask.status) {
                    if (promiseTask.status === 200 || promiseTask.status === 201 || promiseTask.status === 202) {
                        let taskUpdated = promiseTask.data;
                        // Agregar task a algorithmData
                        algorithm.task = taskUpdated;

                        // Comprobaciones
                        if (taskUpdated.hasStatus === 'RUNNING') {

                            await Job.findById(job._id, async(err, jobDB) => {

                                if (err) {
                                    console.error(err);
                                } else {
                                    let dataAlgorithms = jobDB.dataAlgorithms;
                                    dataAlgorithms = updateDataAlgorithms(algorithm.algorithm, dataAlgorithms, taskUpdated, null);
                                    await Job.findByIdAndUpdate(job._id, { dataAlgorithms }, { new: true }, (err, jobDB) => {
                                        job = jobDB;
                                        // console.log(jobDB); // TODO: Eliminar
                                    });
                                }
                            });
                        }
                        if (taskUpdated.hasStatus === 'ERROR') {

                            await Job.findById(job._id, async(err, jobDB) => {

                                if (err) {
                                    console.error(err);
                                } else {
                                    // Release container
                                    await releaseContainer(algorithm.container);
                                    let dataAlgorithms = jobDB.dataAlgorithms;
                                    dataAlgorithms = updateDataAlgorithms(algorithm.algorithm, dataAlgorithms, taskUpdated, null, null);
                                    // , hasStatus: 'PARTIAL' // Detras de dataAlgorithms
                                    await Job.findByIdAndUpdate(job._id, { dataAlgorithms }, { new: true }, async(err, jobDB) => {
                                        job = jobDB;
                                        // console.log(jobDB); // TODO: Eliminar
                                        // TODO: Eliminar task and model de wekaDB
                                        // await removeTask(task.taskID);
                                    });
                                }
                            });
                        }
                        if (task.hasStatus === 'COMPLETED' && task.percentageCompleted === 100) {
                            let promiseModel = await getRequest(task.resultURI);
                            if (promiseModel.status) {
                                if (promiseModel.status === 200 || promiseModel.status === 201 || promiseModel.status === 202) {
                                    model = promiseModel.data;

                                    await Job.findById(job._id, async(err, jobDB) => {
                                        // TODO: Controlar error
                                        if (err) {
                                            console.error(err);
                                        } else {
                                            // Release container
                                            await releaseContainer(algorithm.container);
                                            let dataAlgorithms = jobDB.dataAlgorithms;
                                            dataAlgorithms = updateDataAlgorithms(algorithm.algorithm, dataAlgorithms, taskUpdated, model, null);
                                            await Job.findByIdAndUpdate(job._id, { dataAlgorithms }, { new: true }, async(err, jobDB) => {
                                                job = jobDB;
                                                // console.log(jobDB); // TODO: Eliminar
                                                // TODO: Eliminar task and model de wekaDB
                                                // await removeTask(task.taskID);
                                                // let arrayModel = task.resultURI.split('/');
                                                // await removeModel(arrayModel[arrayModel.length - 1]);
                                            });
                                        }
                                    });
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

        // // Finish Job
        // let algorithmFinished = 0;
        // let algorithmFinishedWithError = 0;
        // for (let i = 0; i < algorithmsRunnings.length; i++) {
        //     let algorithm = algorithmsRunnings[i];
        //     if (algorithm.task && algorithm.task.hasStatus === 'RUNNING') {
        //         algorithmFinished++;
        //     }
        //     if (algorithm.task && algorithm.task.hasStatus === 'ERROR') {
        //         algorithmFinishedWithError++;
        //     }
        // }
        // if (algorithmFinished === 0) {
        //     if (algorithmFinishedWithError > 0) {
        //         await Job.findByIdAndUpdate(job._id, { hasStatus: 'PARTIAL_COMPLETED' }, { new: true }, (err, jobDB) => {
        //             job = jobDB;
        //         });
        //     } else if (job.hasStatus === 'RUNNING') {
        //         await Job.findByIdAndUpdate(job._id, { hasStatus: 'COMPLETED' }, { new: true }, (err, jobDB) => {
        //             job = jobDB;
        //         });
        //     }

        //     let containersOwnToLiberate = await getContainersOwn(job.user, job._id);
        //     while (containersOwnToLiberate.length > 0) {
        //         await liberateContainer(containersOwnToLiberate[i]);
        //     }
        //     console.log('END JOB');
        // }
    }
    console.log('END CRONJOB');
}

module.exports = {
    mainManagerJobLauncher
}