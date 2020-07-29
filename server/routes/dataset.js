const express = require('express');
const fileUpload = require('express-fileupload');
const Dataset = require('../models/appDB/dataset');
const { verifyToken } = require('../middlewares/authentication');
const _ = require('underscore');
const fs = require('fs');
const path = require('path');
const app = express();
const AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});

const s3 = new AWS.S3();

// default options
app.use(fileUpload());

app.get('/dataset', verifyToken, (req, res) => {

    let page = req.query.page || 1;
    let limit = req.query.limit || 1;
    let descriptionSearch = req.query.descriptionSearch || '';

    if (limit > 20) limit = 20
    if (limit < 1) limit = 1

    const options = {
        page,
        limit,
        sort: { date_creation: 'desc' }
    };

    Dataset.paginate({ description: { $regex: descriptionSearch, $options: 'ix' }, user: req.user._id }, options, (err, datasetsDB) => {

        if (err) {
            return res.status(500).json({
                ok: false,
                err
            });
        }

        res.json({
            ok: true,
            datasets: datasetsDB
        });

    });

});

app.get('/dataset/:id', verifyToken, (req, res) => {
    let id = req.params.id;

    Dataset.findById(id, (err, datasetDB) => {

        if (err) {
            return res.status(500).json({
                ok: false,
                err
            });
        }

        res.json({
            ok: true,
            dataset: datasetDB
        });
    });


});

// app.post('/dataset/download', verifyToken, (req, res) => {

//     let fileName = req.body.fileName;
//     if (!fileName) {
//         return res.status(400).json({
//             ok: false,
//             message: 'You must pass a fileName.'
//         });
//     }
//     let pathFile = path.resolve(__dirname, `../../${process.env.PATH_FILES_DATASET}/${ fileName }`);
//     if (!fs.existsSync(pathFile)) {
//         return res.status(400).json({
//             ok: false,
//             message: 'File does not exist.'
//         });
//     }

//     let originalName = req.body.originalName;
//     if (!originalName) {
//         originalName = fileName;
//     }

//     res.download(pathFile, originalName, (err) => {
//         if (err) {
//             return res.status(400).json({
//                 ok: false,
//                 message: 'Error to download dataset.'
//             });
//         }
//     });
// });

app.post('/dataset', verifyToken, (req, res) => {

    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({
            ok: false,
            message: 'No files were uploaded.'
        });
    }

    let file = req.files.file;
    let fileNameSplit = file.name.split('.');
    let name = '';
    for (let i = 0; i < fileNameSplit.length - 1; i++) {
        name += fileNameSplit[i];
    }
    let extension = fileNameSplit[fileNameSplit.length - 1];
    let size = file.size;

    let extensionsAllowed = process.env.EXTENSION_ALLOWED;

    if (extensionsAllowed.indexOf(extension) < 0) {
        return res.status(400).json({
            ok: false,
            message: 'Extensions allowed are ' + extensionsAllowed.join(', '),
            ext: extension
        });
    }

    let body = req.body;

    let dataset = new Dataset({
        description: body.description,
        file: '',
        user: req.user._id
    });

    let date = new Date();
    let fileNameCustom = `${ fileNameSplit[0] }-${ date.getMonth()}-${ date.getDay()}-${ date.getMilliseconds() }.${ extension }`;

    let pathSaveFile = 'uploads/filesDatasets';

    file.mv(`${ pathSaveFile }/${ fileNameCustom }`, (err) => {
        if (err) {
            return res.status(500).json({
                ok: false,
                err
            });
        }

        var params = {Bucket: `${ process.env.BUCKET_AWS_S3 }`, Key: fileNameCustom, Body: file.data, ACL: "public-read"};
        s3.upload(params, function(err, data) {  
            if (err) {
                return res.status(500).json({
                    ok: false,
                    err
                });
            }
            // let attributes = [];
            // let pathFile = path.resolve(__dirname, `../../${process.env.PATH_FILES_DATASET}/${ fileNameCustom }`);
            // let pathFile = data.Location;
            // let dataFile = fs.readFileSync(file.data, 'utf-8');
            // let dataFile = fs.readFileSync(file, 'utf-8');
            // let sentences = dataFile.split('\n');
            // let finished = false;
            // for (let i=0; i < sentences.length && !finished; i++) {
            //     if (line.match(/@/) || line.match(/%/)) {
            //         console.log(line);
            //         if (line.match(/@attribute/)) {
            //             let words = line.split(' ');
            //             words.shift();
            //             let newLine = words.join(' ');
            //             attributes.push(newLine);
            //         }
            //     } else {
            //         finished = true;
            //     }
            // }
            // sentences.forEach(line => {
            //     if (line.match(/@attribute/)) {
            //         let words = line.split(' ');
            //         words.shift();
            //         let newLine = words.join(' ');
            //         attributes.push(newLine);
            //     }
            // });

            let attributes = [];
            let pathFile = path.resolve(__dirname, `../../${ pathSaveFile }/${ fileNameCustom }`);
            let dataFile = fs.readFileSync(pathFile, 'utf-8');
            let sentences = dataFile.split('\n');
            sentences.forEach(line => {
                if (line.match(/@attribute/)) {
                    let words = line.split(' ');
                    words.shift();
                    let newLine = words.join(' ');
                    attributes.push(newLine);
                }
            });

            dataset.file = fileNameCustom;
            dataset.extension = extensionsAllowed;
            dataset.date_creation = date;
            dataset.name = name;
            dataset.full_name = file.name;
            dataset.size = size;
            dataset.attributes = attributes;
            dataset.locationS3 = data.Location;
            dataset.save((err, datasetDB) => {
                if (err) {
                    return res.status(400).json({
                        ok: false,
                        err
                    });
                }

                res.json({
                    ok: true,
                    dataset: datasetDB,
                    file_name: fileNameCustom,
                    message: `File ${ fileNameCustom } uploaded!`
                });
            });

        });
    });

    // file.mv(`${ process.env.PATH_FILES_DATASET }/${ fileNameCustom }`, (err) => {
    //     if (err)
    //         return res.status(500).json({
    //             ok: false,
    //             err
    //         });

    //     let attributes = [];
    //     let pathFile = path.resolve(__dirname, `../../${process.env.PATH_FILES_DATASET}/${ fileNameCustom }`);
    //     let data = fs.readFileSync(pathFile, 'utf-8');
    //     let sentences = data.split('\n');
    //     sentences.forEach(line => {
    //         if (line.match(/@attribute/)) {
    //             let words = line.split(' ');
    //             words.shift();
    //             let newLine = words.join(' ');
    //             attributes.push(newLine);
    //         }
    //     });

    //     dataset.file = fileNameCustom;
    //     dataset.extension = extensionsAllowed;
    //     dataset.date_creation = date;
    //     dataset.name = name;
    //     dataset.full_name = file.name;
    //     dataset.size = size;
    //     dataset.attributes = attributes;
    //     dataset.save((err, datasetDB) => {
    //         if (err) {
    //             return res.status(400).json({
    //                 ok: false,
    //                 err
    //             });
    //         }

    //         res.json({
    //             ok: true,
    //             dataset: datasetDB,
    //             file_name: fileNameCustom,
    //             message: `File ${ fileNameCustom } uploaded!`
    //         });
    //     });
    // });
});

app.put('/dataset/:id', verifyToken, (req, res) => {

    let id = req.params.id;
    let body = _.pick(req.body, 'description'); // Undercore library

    Dataset.findByIdAndUpdate(id, body, { new: true }, (err, datasetDB) => {

        if (err) {
            return res.status(500).json({
                ok: false,
                err
            });
        }

        res.json({
            ok: true,
            dataset: datasetDB
        });
    });


});

app.delete('/dataset/:id', verifyToken, (req, res) => {
    let id = req.params.id;

    Dataset.findByIdAndRemove(id, (err, datasetRemoved) => {

        if (err) {
            return res.status(500).json({
                ok: false,
                err
            });
        }

        if (datasetRemoved === null) {
            return res.status(500).json({
                ok: false,
                message: 'Dataset not found.'
            });
        }

        let fileExist = false;
        let fileDeleted = false;
        // let pathFileDataset = path.resolve(__dirname, `../../${ process.env.PATH_FILES_DATASET }/${ datasetRemoved.file }`);
        // if (fs.existsSync(pathFileDataset)) {
        //     fs.unlinkSync(pathFileDataset);
        //     fileExist = true;
        //     fileDeleted = true;
        // }

        var params = {
            Bucket: `${ process.env.BUCKET_AWS_S3 }`, 
            Key: datasetRemoved.file
           };
        s3.deleteObject(params, function(err, data) {
            if (!err) {
                fileExist = true;
                fileDeleted = true;
            }
           
            res.json({
                ok: true,
                dataset: datasetRemoved,
                file_exist: fileExist,
                file_deleted: fileDeleted
            });
        });

      
    });
});

module.exports = app;