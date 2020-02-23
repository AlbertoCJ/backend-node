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
    let fileName = 'housing-1-1-336.arff';
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

        // Almaceno el job creado
        jobCreated = jobDB;

        res.json({
            ok: true,
            status: 'RUNNING Provisional',
            job: jobDB
        });
    });

    // Iniciar setInterval
    let myVar;
    init = () => {
        myVar = setInterval(mainFunction, 15000);
    }

    mainFunction = async() => {
        containersLength = await getListContainers();
        if (containersFree.length === 0 && containersLength.length > 0) {
            containersFree = containersLength;
        }
        containersLength = containersLength.length;

        // TODO: IMPORTANTE Criterio de parada si no hay containers TREMINA
        if (containersLength === 0) {
            clearInterval(myVar); // Stop
        }

        if (thereAreAlgorithms(listAlgorithm) && thereAreContainers(containersFree)) {
            let listUrls = [];
            let listFormDatas = [];
            let listConfigs = [];
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
                    // httpAgent: new http.Agent({ keepAlive: true }),
                    // httpsAgent: new https.Agent({ keepAlive: true })
                }

                listUrls.push(`http://localhost:${ container.Ports[0].PublicPort }/algorithm/${ algorithm.endpoint }`);
                listFormDatas.push(formData);
                listConfigs.push(requestConfig);

                containersWorking.push({ algorithm, container, task: null });

            }

            let listPromise = await runAllRequests(listUrls, listFormDatas, listConfigs);
            if (listPromise.ok) {

                for (let i = 0; i < listPromise.promises.length; i++) {
                    let task = listPromise.promises[i].data;

                    // Agregar task a containersWorking
                    containersWorking[i].task = task;
                }
            } else {
                // TODO: ¿Que hacer con este error?
                console.log(listPromise);
            }
        }

        // Elimino contenedores libres sin usar
        // while (containersFree.length > 0) {
        //     let removed = removeContainer(containersFree[0]);
        //     // TODO: ¿Que hacer si da error?
        //     containersFree.shift();
        // }

        let listUrls = [];
        // Recorre containersWorking
        for (let i = 0; i < containersWorking.length; i++) {
            let task = containersWorking[i].task;
            if (task) {
                listUrls.push(task.uri);
            }
        }

        let listPromise = await runAllRequests(listUrls, null, null, 'get');
        if (listPromise.ok) {

            for (let i = 0; i < listPromise.promises.length; i++) {
                let task = listPromise.promises[i].data;

                // Agregar task a containersWorking
                containersWorking[i].task = task;

                // Comprobaciones
                if (task.hasStatus === 'ERROR') {
                    console.log('ko:  ', jobCreated._id);
                    Job.findById(jobCreated._id, (err, jobDB) => {
                        // TODO: Controlar error
                        let jobItems = jobDB.jobItems;
                        jobItems.push({ algorithm: containersWorking.algorithm, task, model: null });
                        Job.findByIdAndUpdate(jobCreated._id, { jobItems })
                    });
                    // Libero contenedor
                    containersFree.push(containersWorking[i].container);
                    containersWorking[i].task = null;
                }
                if (task.hasStatus === 'COMPLETED' && task.percentageCompleted === 100) {
                    let promiseModel = await runAllRequests([task.resultURI], null, null, 'get');
                    let model = null;
                    if (promiseModel.ok && promiseModel.promises && promiseModel.promises.length > 0) {
                        model = promiseModel.promises[0].data;
                        console.log('ok:  ', jobCreated._id);
                        Job.findById(jobCreated._id, (err, jobDB) => {
                            // TODO: Controlar error
                            let jobItems = jobDB.jobItems;
                            jobItems.push({ algorithm: containersWorking.algorithm, task, model });
                            Job.findByIdAndUpdate(jobCreated._id, { jobItems })
                        });
                    }
                    // Libero contenedor
                    containersFree.push(containersWorking[i].container);
                    containersWorking[i].task = null;

                }
            }

            // Elimino los containersWorking libres
            containersWorking = containersWorking.filter(contWork => contWork.task !== null);
        } else {
            console.log(listPromise);
            // TODO: ¿Que hacer con este error?
        }

        if (containersWorking.length === 0) {
            // Elimino contenedores libres sin usar
            // while (containersFree.length > 0) {
            //     let removed = removeContainer(containersFree[0]);
            //     // TODO: ¿Que hacer si da error?
            //     containersFree.shift();
            // }
            clearInterval(myVar); // Stop
            console.log('FIN');
        }

        // console.log(containersWorking);




        // res.json({
        //     ok: true,
        //     containersWorking
        // });
    }

    // mainFunction();
    init();

    // .then(function(containers) {
    //     let containersValid = containers.filter(container => container.Ports[0].PublicPort >= "60000");
    //     containersFree = containersValid;
    // }).catch(function(err) {
    //     res.status(400).json({
    //         ok: false,
    //         error: err
    //     });
    // });

    // thereAreAlgorithms = () => {
    //     return listAlgorithm.length > 0;
    // }

    // thereAreContainers = () => {
    //     return containersFree.length > 0;
    // }

    // while (thereAreAlgorithms() && thereAreContainers()) {
    //     let algorithm = listAlgorithm.shift();
    //     let container = containersFree.shift();

    //     let contWork;
    //     // TODO: Peticion lanzar algoritmo metodo await 

    // }


    // const headers = {
    //     'Content-Type': 'multipart/form-data',
    //     'accept': 'application/json' // 'text/uri-list'
    // };
    // const formData = {
    //     file: fs.createReadStream(pathFile),
    // };



    // let firstLoadContainers = false;
    // let containersFree = [];
    // let containersBussy = [];
    // let algorithms = [];


    // let cont = 0;
    // let myVar;
    // init = () => {
    //     myVar = setInterval(mainFunction, 5000);
    // }

    // mainFunction = () => {

    //     docker.listContainers({ all: true })
    //         .then(function(containers) {
    //             let containersValid = containers.filter(container => container.Ports[0].PublicPort >= "60000");
    //             if (!firstLoadContainers) {
    //                 containersFree = containersValid;
    //                 firstLoadContainers = true;
    //             }
    //             if (containersValid.length === 0) {
    //                 clearInterval(myVar); // Stop
    //             }
    //         }).catch(function(err) {
    //             clearInterval(myVar); // Stop
    //         });





    //     cont = cont + 1;
    //     console.log(cont);
    //     if (cont + 1 > 11) {
    //         clearInterval(myVar); // Stop
    //         console.log('FIN');
    //     }
    // }

    // init();

    // res.json({
    //     ok: true,
    //     message: 'Start run algorithms'
    // });












    // const formData = {
    //     file: fs.createReadStream(pathFile),
    //     // batchSize: 100,
    //     // useKernelEstimator: 0,
    //     // useSupervisedDiscretization: 0,
    //     // validation: 'CrossValidation',
    //     // validationNum: 10
    // };


    // request.post({ url: 'http://localhost:60000/algorithm/linearRegression', headers: headers, formData: formData }, function(err, httpResponse, body) {
    //     if (err) {
    //         res.json({
    //             ok: false,
    //             err
    //         });
    //     }
    //     // checkTask(body.taskUrl);
    //     res.json({
    //         ok: true,
    //         taskUrl: body
    //     });
    // });
});

module.exports = app;