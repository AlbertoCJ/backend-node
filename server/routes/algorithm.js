const express = require('express');
const { verifyToken } = require('../middlewares/authentication');
const { getListContainers, thereAreAlgorithms, thereAreContainers, runAlgorithm } = require('../impl/algorithmImpl');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const app = express();

app.post('/algorithm', (req, res) => {

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

    res.json({
        ok: true,
        status: 'RUNNING'
    });

    const algoritHardcode = [{ // TODO: HARDCODE
            name: 'Linear Regression',
            endpoint: 'linearRegression',
            config: {

            }
        },
        // {
        //     name: 'Linear Regression Bagging',
        //     endpoint: 'linearRegression/bagging',
        //     config: {

        //     }
        // },
        {
            name: 'IBk',
            endpoint: 'IBk',
            config: {

            }
        }
        // {
        //     name: 'ZeroR',
        //     endpoint: 'ZeroR',
        //     config: {

        //     }
        // },
        // {
        //     name: 'M5P',
        //     endpoint: 'M5P',
        //     config: {

        //     }
        // },
        // {
        //     name: 'M5Rules',
        //     endpoint: 'M5Rules',
        //     config: {

        //     }
        // },
        // {
        //     name: 'DecisionStump',
        //     endpoint: 'DecisionStump',
        //     config: {

        //     }
        // },
        // {
        //     name: 'DecisionStump Bagging',
        //     endpoint: 'DecisionStump/bagging',
        //     config: {

        //     }
        // }
    ];

    const headers = { // TODO: HARDCODE
        'Content-Type': 'multipart/form-data',
        'accept': 'application/json' // 'text/uri-list'
    };

    // TODO: HARDCODE
    // const formData = {
    //     file: fs.createReadStream(pathFile),
    // };
    // console.log(formData);

    const formData = new FormData();
    formData.append('file', fs.createReadStream(pathFile));

    let listAlgorithm = algoritHardcode; // []; // TODO: Llega por req peticion
    let listAlgorithmError = [];

    let containersFree = [];
    let containersWorking = [];

    // docker.listContainers({ all: true }) //TODO: Realizar una peticion usando await mejor que esto
    //     .then(function(containers) {
    //         let containersValid = containers.filter(container => container.Ports[0].PublicPort >= "60000");
    //         containersFree = containersValid;
    //         res.json({
    //             ok: true,
    //             containersFree
    //         });
    //     }).catch(function(err) {
    //         res.status(400).json({
    //             ok: false,
    //             error: err
    //         });
    //     });
    mainFunction = async() => {
        containersFree = await getListContainers();

        while (thereAreAlgorithms(listAlgorithm) && thereAreContainers(containersFree)) {
            let algorithm = listAlgorithm.shift();
            let container = containersFree.shift();
            console.log('espera');
            let algorithmRunning = await runAlgorithm(algorithm, container, headers, formData);
            console.log(algorithmRunning.title);
            console.log('continua');
            if (algorithmRunning.uri) {
                containersWorking.push({ container, task: algorithmRunning })
            } else {
                containersWorking.push({ container, err: algorithmRunning })
            }

        }

        // res.json({
        //     ok: true,
        //     containersWorking
        // });
    }

    mainFunction();

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