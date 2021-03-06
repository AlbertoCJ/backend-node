const fs = require('fs');
const path = require('path');
const Job = require('../models/appDB/job');
const {
    getJobsRunning,
    getNumberAlgorithmsWaiting,
    updateAWSContainerLaunching,
    getContainersOwn,
    getContainersFree,
    updateContainerWorking,
    generateFormData,
    postRequest,
    getRequest,
    releaseContainer,
    liberateContainer,
    isCompleted,
    isPartial,
    isFullError,
    updateTime
} = require('./jobLauncherImpl');
const FormData = require('form-data');

const { sendEmail } = require('../mail/nodemailer');

const AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});

const s3 = new AWS.S3();

mainManagerJobLauncher = async() => {

    console.log('Init');

    // Obtener listado jobs RUNNING
    let jobsRunning = await getJobsRunning();

    // Recorrer jobs
    for (let i = 0; i < jobsRunning.length; i++) {
        let job = jobsRunning[i];

        // Listado de contenedores asignados a usuario y job.
        let containersOwn = [];

        // let pathFile = path.resolve(__dirname, `../../${process.env.PATH_FILES_DATASET}/${ job.fileName }`);
        // if (!fs.existsSync(pathFile)) {
        //     job.errorList.push('File does not exist.');
        //     job.hasStatus = 'ERROR';
        //     containersOwn = await getContainersOwn(job.user.toString(), job._id.toString(), job.platform);
        // }

        var params = {
            Bucket: `${ process.env.BUCKET_AWS_S3 }`, 
            Key: job.fileName
        };
        s3.getObject(params, async(err, fileData) => {
            if (err) {
                job.errorList.push('File does not exist.');
                job.hasStatus = 'ERROR';
                containersOwn = await getContainersOwn(job.user.toString(), job._id.toString(), job.platform);
            }
    

            if (job.platform === 'AWS') {
                // Actualiza en BD el estado de los contenedores en aws lanzados
                await updateAWSContainerLaunching(); // job.user.toString(), job._id.toString()
            }
    
    
            if (job.hasStatus !== 'ERROR') { // && containersOwn.length > 0
    
                // Numero de algoritmos esperando.
                let numAlgorithmsWaiting = getNumberAlgorithmsWaiting(job);
    
                // if (numAlgorithmsWaiting > 0) {
                containersOwn = await getContainersOwn(job.user.toString(), job._id.toString(), job.platform);

                if (numAlgorithmsWaiting > containersOwn.length) { // Si hay más algoritmos que contenedores.
                    // Obtener contenedores si hay libres.
                    let numContainers = numAlgorithmsWaiting - containersOwn.length;
                    let containersFree = await getContainersFree(numContainers, job.user, job._id, job.platform);
                    containersOwn = containersOwn.concat(containersFree);
                    
                } else if (numAlgorithmsWaiting < containersOwn.length) { // Si hay menos algoritmos que contenedores.
                    // Libero contenedores si no son necesarios.
                    let numContainers = containersOwn.length - numAlgorithmsWaiting;
                    while (numContainers > 0 && containersOwn.length > 0) {
                        let containerLiberate = containersOwn.shift();
                        await liberateContainer(containerLiberate, job.platform);
                        numContainers--;
                    }
                }
                // }
    
                // Recorro los algoritmos
                for (const key in job.dataAlgorithms) {
                    if (job.dataAlgorithms.hasOwnProperty(key)) {
    
                        let currentAlgorithm = job.dataAlgorithms[key];
    
                        // Si algoritmo no ha sido iniciado y no contiene error.
                        if (currentAlgorithm.algorithm && !currentAlgorithm.task && !currentAlgorithm.container && containersOwn.length > 0 && currentAlgorithm.algorithm.status === 'OK') {
    
                            // Asignar contenedor a algoritmo.
                            let container = containersOwn.shift();
                            currentAlgorithm.container = await updateContainerWorking(container, job.platform);
    
                            // Inicar algoritmo en ese contenedor
                            let formData = generateFormData(currentAlgorithm.algorithm.config);
                            // formData.append('file', fs.createReadStream(pathFile));
                            formData.append('file', fileData.Body);
    
                            let requestConfig = {
                                headers: {
                                    'accept': 'application/json',
                                    'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
                                }
                            }
    
                            let promise;
                            if (job.platform === 'LOCAL') {
                                promise = await postRequest(`${ process.env.URL_DOCKER_LOCAL_SERVER }:${ currentAlgorithm.container.Port.PublicPort }/algorithm/${ currentAlgorithm.algorithm.endpoint }`, formData, requestConfig);
                            } else {
                                promise = await postRequest(`http://${ currentAlgorithm.container.Endpoint_URL }/algorithm/${ currentAlgorithm.algorithm.endpoint }`, formData, requestConfig);
                            }
    
                            // let promise = await postRequest(`http://localhost:${ currentAlgorithm.container.Port.PublicPort }/algorithm/${ currentAlgorithm.algorithm.endpoint }`, formData, requestConfig);
                            if (promise && promise.status) {
                                if (promise.status === 200 || promise.status === 201 || promise.status === 202) {
                                    currentAlgorithm.task = promise.data;
                                } else {
                                    currentAlgorithm.algorithm.errorList.push(promise.message);
                                    currentAlgorithm.algorithm.status = 'ERROR';
                                    // Release container
                                    let containerReleased = await releaseContainer(currentAlgorithm.container, job.platform);
                                    containersOwn.push(containerReleased);
                                    currentAlgorithm.container = null;
                                }
    
                            } else {
                                currentAlgorithm.algorithm.errorList.push('Error with container launching algorithm.');
                                if (promise.response && promise.response.statusText) {
                                    currentAlgorithm.algorithm.errorList.push(promise.response.statusText);
                                }
                                currentAlgorithm.algorithm.status = 'ERROR';
                                // Release container
                                let containerReleased = await releaseContainer(currentAlgorithm.container, job.platform);
                                containersOwn.push(containerReleased);
                                currentAlgorithm.container = null;
                            }
                            
                            // Algoritmo iniciado pero no terminado y no contiene error.    
                        } else if (currentAlgorithm.algorithm && currentAlgorithm.task && currentAlgorithm.container && currentAlgorithm.algorithm.status === 'OK') {
    
                            let task = currentAlgorithm.task;
                            if (task) {
                                let promiseTask = await getRequest(task.uri);
                                if (promiseTask.status) {
                                    if (promiseTask.status === 200 || promiseTask.status === 201 || promiseTask.status === 202) {
                                        let taskUpdated = promiseTask.data;
                                        // Agregar task a algorithmData
                                        currentAlgorithm.task = taskUpdated;
    
                                        // Comprobaciones
                                        if (taskUpdated.status === 'RUNNING') {
    
                                            // Actualiza fecha en contendor.
                                            currentAlgorithm.container = await updateContainerWorking(currentAlgorithm.container, job.platform);
    
                                        } else if (taskUpdated.status === 'ERROR') {
                                            currentAlgorithm.algorithm.errorList.push('Error with the algorithm execution task.');
                                            if (taskUpdated.errorReport && taskUpdated.errorReport.message) {
                                                currentAlgorithm.algorithm.errorList.push(taskUpdated.errorReport.message);
                                            }
                                            currentAlgorithm.algorithm.status = 'ERROR';
                                            // Release container
                                            let containerReleased = await releaseContainer(currentAlgorithm.container, job.platform);
                                            containersOwn.push(containerReleased);
                                            currentAlgorithm.container = null;
    
                                        } else if (task.status === 'COMPLETED') { // && task.percentageCompleted === 100
    
                                            // Obtener modelo
                                            let promiseModel = await getRequest(task.resultURI);
                                            if (promiseModel.status) {
                                                if (promiseModel.status === 200 || promiseModel.status === 201 || promiseModel.status === 202) {
                                                    currentAlgorithm.model = promiseModel.data;
                                                    console.log('Model actualizado'); // TODO: PARA PROBAR
    
                                                    // Obtener la prediccion
                                                    let formData = new FormData();
                                                    // formData.append('file', fs.createReadStream(pathFile));
                                                    formData.append('file', fileData.Body);
    
                                                    let requestConfig = {
                                                        headers: {
                                                            'accept': 'text/x-arff',
                                                            'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
                                                        }
                                                    }
    
                                                    let promisePrediction = await postRequest(task.resultURI, formData, requestConfig);
                                                    if (promisePrediction.status) {
                                                        if (promisePrediction.status === 200 || promisePrediction.status === 201 || promisePrediction.status === 202) {
    
                                                            let rows = promisePrediction.data.split('\n');
                                                            let fields = rows.map( row => { 
                                                                let field = row.split(',');
                                                                return Number(field[field.length - 1]);
                                                            });
                                                            currentAlgorithm.model.prediction = fields;
    
                                                        } else {
                                                            currentAlgorithm.algorithm.errorList.push(promisePrediction.message);
                                                            currentAlgorithm.algorithm.status = 'ERROR';
                                                        }
    
                                                    } else {
                                                        currentAlgorithm.algorithm.errorList.push('Error with container getting prediction.');
                                                        currentAlgorithm.algorithm.status = 'ERROR';
                                                    }
    
    
                                                    // Release container
                                                    let containerReleased = await releaseContainer(currentAlgorithm.container, job.platform);
                                                    containersOwn.push(containerReleased);
                                                    currentAlgorithm.container = null;
    
                                                } else {
                                                    currentAlgorithm.errorList.push(promiseModel.message);
                                                    currentAlgorithm.algorithm.status = 'ERROR';
                                                    // Release container
                                                    let containerReleased = await releaseContainer(currentAlgorithm.container, job.platform);
                                                    containersOwn.push(containerReleased);
                                                    currentAlgorithm.container = null;
                                                }
                                            } else {
                                                currentAlgorithm.errorList.push('Error with container getting model');
                                                currentAlgorithm.algorithm.status = 'ERROR';
                                                // Release container
                                                let containerReleased = await releaseContainer(currentAlgorithm.container, job.platform);
                                                containersOwn.push(containerReleased);
                                                currentAlgorithm.container = null;
                                            }
    
                                        }
                                    } else {
                                        currentAlgorithm.errorList.push(promiseTask.message);
                                        currentAlgorithm.algorithm.status = 'ERROR';
                                        // Release container
                                        let containerReleased = await releaseContainer(currentAlgorithm.container, job.platform);
                                        containersOwn.push(containerReleased);
                                        currentAlgorithm.container = null;
                                    }
                                } else {
                                    currentAlgorithm.algorithm.errorList.push('Error with container getting task');
                                    currentAlgorithm.algorithm.status = 'ERROR';
                                    // Release container
                                    let containerReleased = await releaseContainer(currentAlgorithm.container, job.platform);
                                    containersOwn.push(containerReleased);
                                    currentAlgorithm.container = null;
                                }
                            }
                        }
                    }
                }
            }
    
            // Comprobar estado de los algoritmos para finalizar el jobs con los estados, COMPLETED o ERROR.
            if (job.hasStatus === 'ERROR' || isFullError(job)) {
                job.hasStatus = 'ERROR';
                while (containersOwn.length > 0) {
                    let containerLiberate = containersOwn.shift();
                    await liberateContainer(containerLiberate, job.platform);
                }
                updateTime(job);
                if (job.sendEmail) sendEmail(job.userEmail, `Job ${ job.name } Done`, `Job ${ job.name } has been completed with errors.`);
            } else if (isCompleted(job)) {
                job.hasStatus = 'COMPLETED';
                while (containersOwn.length > 0) {
                    let containerLiberate = containersOwn.shift();
                    await liberateContainer(containerLiberate, job.platform);
                }
                updateTime(job);
                if (job.sendEmail) sendEmail(job.userEmail, `Job ${ job.name } Done`, `Job ${ job.name } has been successfully completed.`);
            } else if (isPartial(job)) {
                job.hasStatus = 'PARTIAL';
                while (containersOwn.length > 0) {
                    let containerLiberate = containersOwn.shift();
                    await liberateContainer(containerLiberate, job.platform);
                }
                updateTime(job);
                if (job.sendEmail) sendEmail(job.userEmail, `Job ${ job.name } Done`, `Job ${ job.name } has been partially completed.`);
            }
    
            console.log('final job'); // TODO: PARA PROBAR
    
            // Actualiza el job en la BD
            await Job.findByIdAndUpdate(job._id, { hasStatus: job.hasStatus, error: job.error, dataAlgorithms: job.dataAlgorithms, errorList: job.errorList }, { new: true }, async(err, jobDB) => {
                if (err) {
                    console.error(err);
                }
            });


        }); // end S3
        
    }
    console.log('END CRONJOB');
    return jobsRunning;
}

module.exports = {
    mainManagerJobLauncher
}