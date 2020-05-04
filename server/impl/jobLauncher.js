const fs = require('fs');
const path = require('path');
const Job = require('../models/appDB/job');
const {
    getJobsRunning,
    // getAlgorithmsWithContainer,
    // getAlgorithmsWithoutContainerAndTask,
    getContainersOwn,
    getContainersFree,
    updateContainerWorking,
    generateFormData,
    postRequest,
    getRequest,
    // updateDataAlgorithms,
    releaseContainer,
    liberateContainer,
    isCompleted,
    isPartial
} = require('./jobLauncherImpl');

mainManagerJobLauncher = async() => {

    console.log('Init');

    // Obtener listado jobs RUNNING
    let jobsRunning = await getJobsRunning();

    // Recorrer jobs
    for (let i = 0; i < jobsRunning.length; i++) {
        let job = jobsRunning[i];

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

        // Numero de algoritmos esperando.
        let numAlgorithmsWaiting = getNumberAlgorithmsWaiting(job);

        // Listado de contenedores asignados a usuario y job.
        let containersOwn = [];

        if (numAlgorithmsWaiting > 0) {
            containersOwn = await getContainersOwn(job.user.toString(), job._id.toString());

            if (numAlgorithmsWaiting > containersOwn.length) { // Si hay más algoritmos que contenedores.
                // Obtener contenedores si hay libres.
                let numContainers = numAlgorithmsWaiting - containersOwn.length;
                let containersFree = await getContainersFree(numContainers, job.user, job._id);
                containersOwn = containersOwn.concat(containersFree);
            } else if (numAlgorithmsWaiting < containersOwn.length) { // Si hay menos algoritmos que contenedores.
                // Libero contenedores si no son necesarios.
                let numContainers = containersOwn.length - numAlgorithmsWaiting;
                while (numContainers > 0 && containersOwn.length > 0) {
                    let containerLiberate = containersOwn.shift();
                    await liberateContainer(containerLiberate);
                    numContainers--;
                }
            }
        }

        // Recorro los algoritmos
        for (const key in job.dataAlgorithms) {
            if (job.dataAlgorithms.hasOwnProperty(key)) {

                let currentAlgorithm = job.dataAlgorithms[key];

                // Si algoritmo no ha sido iniciado.
                if (currentAlgorithm.algorithm && !currentAlgorithm.task && !currentAlgorithm.container && containersOwn.length > 0) {

                    // Asignar contenedor a algoritmo.
                    let container = containersOwn.shift();
                    currentAlgorithm.container = await updateContainerWorking(container);

                    // Inicar algoritmo en ese contenedor
                    let formData = generateFormData(currentAlgorithm.algorithm.config);
                    formData.append('file', fs.createReadStream(pathFile));

                    let requestConfig = {
                        headers: {
                            'accept': 'application/json',
                            'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
                        }
                    }

                    // TODO: Llevar el http://localhost a config, variable de entorno URL_DOCKER_SERVER
                    let promise = await postRequest(`http://localhost:${ currentAlgorithm.container.Port.PublicPort }/algorithm/${ currentAlgorithm.algorithm.endpoint }`, formData, requestConfig);
                    if (promise.status) {
                        if (promise.status === 200 || promise.status === 201 || promise.status === 202) {
                            currentAlgorithm.task = promise.data;
                        } else {
                            currentAlgorithm.task = promise.data;
                            // TODO: Este error se almacenara en el array de error del algoritmo.
                        }

                    } else {
                        // TODO: ¿Que hacer con este error?
                        console.error(promise);
                        // containersWorking.push({ algorithm, container, error: promise });
                    }

                    // Algoritmo iniciado pero no terminado.    
                } else if (currentAlgorithm.algorithm && currentAlgorithm.task && currentAlgorithm.container) {

                    let task = currentAlgorithm.task;
                    if (task) {
                        let promiseTask = await getRequest(task.uri);
                        if (promiseTask.status) {
                            if (promiseTask.status === 200 || promiseTask.status === 201 || promiseTask.status === 202) {
                                let taskUpdated = promiseTask.data;
                                // Agregar task a algorithmData
                                currentAlgorithm.task = taskUpdated;

                                // Comprobaciones
                                if (taskUpdated.hasStatus === 'RUNNING') {

                                    // Actualiza fecha en contendor.
                                    currentAlgorithm.container = await updateContainerWorking(currentAlgorithm.container);

                                }
                                if (taskUpdated.hasStatus === 'ERROR') {

                                    // Release container
                                    let containerReleased = await releaseContainer(currentAlgorithm.container);
                                    containersOwn.push(containerReleased);
                                    currentAlgorithm.container = null;

                                }
                                if (task.hasStatus === 'COMPLETED' && task.percentageCompleted === 100) {
                                    let promiseModel = await getRequest(task.resultURI);
                                    if (promiseModel.status) {
                                        if (promiseModel.status === 200 || promiseModel.status === 201 || promiseModel.status === 202) {
                                            currentAlgorithm.model = promiseModel.data;
                                            console.log('Model', promiseModel.data);

                                            // Release container
                                            let containerReleased = await releaseContainer(currentAlgorithm.container);
                                            containersOwn.push(containerReleased);
                                            currentAlgorithm.container = null;

                                        } else {
                                            // TODO: ¿Que hacer con este error? Guardar model como viene
                                            console.error(promiseModel);
                                        }
                                    } else {
                                        // TODO: ¿Que hacer con este error? Crear un objeto model del estilo de error de la api, y guardarlo en model
                                        // No se pudo obtener modelo
                                        console.error(promiseModel);
                                    }
                                }
                            } else {
                                // TODO: ¿Que hacer con este error? Guardar task como viene
                                console.error(promiseTask);
                            }
                        } else {
                            // TODO: ¿Que hacer con este error? Crear un objeto task del estilo de error de la api, y guardarlo en task
                            // No se pudo obtener task
                            console.error(promiseTask);
                        }
                    }

                }
            }
        }


        // Comprobar estado de los algoritmos para finalizar el jobs con los estados, COMPLETED o ERROR.
        if (job.hasStatus === 'ERROR') {
            while (containersOwn.length > 0) {
                let containerLiberate = containersOwn.shift();
                await liberateContainer(containerLiberate);
            }
        } else if (isCompleted(job)) {
            job.hasStatus = 'COMPLETED';
            while (containersOwn.length > 0) {
                let containerLiberate = containersOwn.shift();
                await liberateContainer(containerLiberate);
            }
        } else if (isPartial(job)) {
            job.hasStatus = 'PARTIAL';
            while (containersOwn.length > 0) {
                let containerLiberate = containersOwn.shift();
                await liberateContainer(containerLiberate);
            }
        }

        console.log('final job', job); // TODO: PARA PROBAR

        // Actualiza el job en la BD
        await Job.findByIdAndUpdate(job._id, { hasStatus: job.hasStatus, error: job.error, dataAlgorithms: job.dataAlgorithms, }, { new: true }, async(err, jobDB) => {
            if (err) {
                console.error(err);
            }
        });







        // let algorithmsRunnings = getAlgorithmsWithContainer(job.dataAlgorithms);
        // console.log('algorithmsRunnings', algorithmsRunnings);
        // let algorithmsRunningsTemp = [];
        // let algorithmsWaitings = getAlgorithmsWithoutContainerAndTask(job.dataAlgorithms);
        // console.log('algorithmsWaitings', algorithmsWaitings);

        // // Si hay algoritmos esperando, busco contenedores disponibles
        // if (algorithmsWaitings.length > 0) {
        //     let containersOwn = await getContainersOwn(job.user.toString(), job._id.toString());
        //     console.log('containersOwn', containersOwn);

        //     // Primeo asignar contenedores propios a algoritmos en espera y muevo algoritmo a algorithmsRunningsTemp
        //     while (algorithmsWaitings.length > 0 && containersOwn.length > 0) {
        //         let algorithm = algorithmsWaitings.shift();
        //         let container = containersOwn.shift();
        //         algorithm.container = container;
        //         algorithmsRunningsTemp.push(algorithm);
        //     }

        //     // Si sobran contenedores propios los libero
        //     for (let i = 0; i < containersOwn.length; i++) {
        //         await liberateContainer(containersOwn[i]);
        //     }

        //     // Si quedan algoritmos esperando, busco contenedores libres
        //     if (algorithmsWaitings.length > 0) {
        //         let containersFree = await getContainersFree(algorithmsWaitings.length, job.user, job._id);

        //         // Segundo asignar contenedores libres a algoritmos en espera y muevo algoritmo a algorithmsRunningsTemp
        //         while (algorithmsWaitings.length > 0 && containersFree.length > 0) {
        //             let algorithm = algorithmsWaitings.shift();
        //             let container = containersFree.shift();
        //             algorithm.container = container;
        //             algorithmsRunningsTemp.push(algorithm);
        //         }
        //     }
        // }

        // // Recorrer algoritmos running temporales y lanzo petición
        // while (algorithmsRunningsTemp.length > 0) {
        //     let algorithmData = algorithmsRunningsTemp.shift();

        //     // Actualizar contenedor: Working = true, Date_work_end = date now
        //     algorithmData.container = await updateContainerWorking(algorithmData.container);

        //     let formData = generateFormData(algorithmData.algorithm.config);
        //     formData.append('file', fs.createReadStream(pathFile));

        //     let requestConfig = {
        //         headers: {
        //             'accept': 'application/json',
        //             'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
        //         }
        //     }

        //     // TODO: Llevar el http://localhost a config, variable de entorno URL_DOCKER_SERVER
        //     let promise = await postRequest(`http://localhost:${ algorithmData.container.Port.PublicPort }/algorithm/${ algorithmData.algorithm.endpoint }`, formData, requestConfig);
        //     if (promise.status) {
        //         if (promise.status === 200 || promise.status === 201 || promise.status === 202) {
        //             algorithmData.task = promise.data;
        //             // containersWorking.push({ algorithm, container, task: promise.data });
        //         } else {
        //             console.log(promise);
        //             algorithmData.task = promise.data;
        //             // containersWorking.push({ algorithm, container, task: promise.data });
        //         }
        //         // TODO: Provisional hasta gestionar errores ######
        //         algorithmsRunnings.push(algorithmData);

        //     } else {
        //         // TODO: ¿Que hacer con este error?
        //         console.error(promise);
        //         // containersWorking.push({ algorithm, container, error: promise });
        //     }

        //     // console.log('containersWorking', containersWorking);
        // }

        // // Recorrer algoritmos running
        // for (let i = 0; i < algorithmsRunnings.length; i++) {
        //     let algorithm = algorithmsRunnings[i];
        //     let task = algorithm.task;
        //     if (task) {
        //         let promiseTask = await getRequest(task.uri);
        //         if (promiseTask.status) {
        //             if (promiseTask.status === 200 || promiseTask.status === 201 || promiseTask.status === 202) {
        //                 let taskUpdated = promiseTask.data;
        //                 // Agregar task a algorithmData
        //                 algorithm.task = taskUpdated;

        //                 // Comprobaciones
        //                 if (taskUpdated.hasStatus === 'RUNNING') {

        //                     await Job.findById(job._id, async(err, jobDB) => {

        //                         if (err) {
        //                             console.error(err);
        //                         } else {
        //                             let dataAlgorithms = jobDB.dataAlgorithms;
        //                             dataAlgorithms = updateDataAlgorithms(algorithm.algorithm, dataAlgorithms, taskUpdated, null);
        //                             await Job.findByIdAndUpdate(job._id, { dataAlgorithms }, { new: true }, (err, jobDB) => {
        //                                 job = jobDB;
        //                                 // console.log(jobDB); // TODO: Eliminar
        //                             });
        //                         }
        //                     });
        //                 }
        //                 if (taskUpdated.hasStatus === 'ERROR') {

        //                     await Job.findById(job._id, async(err, jobDB) => {

        //                         if (err) {
        //                             console.error(err);
        //                         } else {
        //                             // Release container
        //                             await releaseContainer(algorithm.container);
        //                             let dataAlgorithms = jobDB.dataAlgorithms;
        //                             dataAlgorithms = updateDataAlgorithms(algorithm.algorithm, dataAlgorithms, taskUpdated, null, null);
        //                             // , hasStatus: 'PARTIAL' // Detras de dataAlgorithms
        //                             await Job.findByIdAndUpdate(job._id, { dataAlgorithms }, { new: true }, async(err, jobDB) => {
        //                                 job = jobDB;
        //                                 // console.log(jobDB); // TODO: Eliminar
        //                                 // TODO: Eliminar task and model de wekaDB
        //                                 // await removeTask(task.taskID);
        //                             });
        //                         }
        //                     });
        //                 }
        //                 if (task.hasStatus === 'COMPLETED' && task.percentageCompleted === 100) {
        //                     let promiseModel = await getRequest(task.resultURI);
        //                     if (promiseModel.status) {
        //                         if (promiseModel.status === 200 || promiseModel.status === 201 || promiseModel.status === 202) {
        //                             model = promiseModel.data;

        //                             await Job.findById(job._id, async(err, jobDB) => {
        //                                 // TODO: Controlar error
        //                                 if (err) {
        //                                     console.error(err);
        //                                 } else {
        //                                     // Release container
        //                                     await releaseContainer(algorithm.container);
        //                                     let dataAlgorithms = jobDB.dataAlgorithms;
        //                                     dataAlgorithms = updateDataAlgorithms(algorithm.algorithm, dataAlgorithms, taskUpdated, model, null);
        //                                     await Job.findByIdAndUpdate(job._id, { dataAlgorithms }, { new: true }, async(err, jobDB) => {
        //                                         job = jobDB;
        //                                         // console.log(jobDB); // TODO: Eliminar
        //                                         // TODO: Eliminar task and model de wekaDB
        //                                         // await removeTask(task.taskID);
        //                                         // let arrayModel = task.resultURI.split('/');
        //                                         // await removeModel(arrayModel[arrayModel.length - 1]);
        //                                     });
        //                                 }
        //                             });
        //                         } else {
        //                             // TODO: ¿Que hacer con este error? Guardar model como viene
        //                             console.log(promise);
        //                         }
        //                     } else {
        //                         // TODO: ¿Que hacer con este error? Crear un objeto model del estilo de error de la api, y guardarlo en model
        //                         // No se pudo obtener modelo
        //                         console.log(promise);
        //                     }
        //                 }
        //             } else {
        //                 // TODO: ¿Que hacer con este error? Guardar task como viene
        //                 console.log(promise);
        //             }
        //         } else {
        //             // TODO: ¿Que hacer con este error? Crear un objeto task del estilo de error de la api, y guardarlo en task
        //             // No se pudo obtener task
        //             console.log(promise);
        //         }
        //     }
        // }

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