const express = require('express');
// const fileUpload = require('express-fileupload');
const Job = require('../models/appDB/job');
const { verifyToken } = require('../middlewares/authentication');
// const _ = require('underscore');
// const fs = require('fs');
// const path = require('path');
const app = express();

app.get('/job', verifyToken, (req, res) => {

    let page = req.query.page || 1;
    let limit = req.query.limit || 1;
    let nameSearch = req.query.nameSearch || '';
    let descriptionSearch = req.query.descriptionSearch || '';

    if (limit > 20) limit = 20
    if (limit < 1) limit = 1

    const options = {
        page,
        limit
    };

    Job.paginate({ name: { $regex: nameSearch, $options: 'ix' }, description: { $regex: descriptionSearch, $options: 'ix' } }, options, (err, jobsDB) => {

        if (err) {
            return res.status(500).json({
                ok: false,
                err
            });
        }

        res.json({
            ok: true,
            jobs: jobsDB
        });

    });

});

app.get('/job/:id', verifyToken, (req, res) => {
    let id = req.params.id;

    Job.findById(id, (err, jobDB) => {

        if (err) {
            return res.status(500).json({
                ok: false,
                err
            });
        }

        res.json({
            ok: true,
            job: jobDB
        });
    });


});

// app.post('/job', verifyToken, (req, res) => {

//     if (!req.files || Object.keys(req.files).length === 0) {
//         return res.status(400).json({
//             ok: false,
//             err: {
//                 message: 'No files were uploaded.'
//             }
//         });
//     }

//     let file = req.files.file;
//     let fileNameSplit = file.name.split('.');
//     let name = '';
//     for (let i = 0; i < fileNameSplit.length - 1; i++) {
//         name += fileNameSplit[i];
//     }
//     let extension = fileNameSplit[fileNameSplit.length - 1];
//     let size = file.size;

//     let extensionsAllowed = process.env.EXTENSION_ALLOWED;

//     if (extensionsAllowed.indexOf(extension) < 0) {
//         return res.status(400).json({
//             ok: false,
//             err: {
//                 message: 'Extensions allowed are ' + extensionsAllowed.join(', '),
//                 ext: extension
//             }
//         });
//     }

//     let body = req.body;

//     let dataset = new Dataset({
//         description: body.description,
//         file: ''
//     });

//     let date = new Date();
//     let fileNameCustom = `${ fileNameSplit[0] }-${ date.getMonth()}-${ date.getDay()}-${ date.getMilliseconds() }.${ extension }`;

//     file.mv(`${ process.env.PATH_FILES_DATASET }/${ fileNameCustom }`, (err) => {
//         if (err)
//             return res.status(500).json({
//                 ok: false,
//                 err
//             });

//         dataset.file = fileNameCustom;
//         dataset.extension = extensionsAllowed;
//         dataset.date_creation = date;
//         dataset.name = name;
//         dataset.full_name = file.name;
//         dataset.size = size;

//         dataset.save((err, datasetDB) => {
//             if (err) {
//                 return res.status(400).json({
//                     ok: false,
//                     err
//                 });
//             }

//             res.json({
//                 ok: true,
//                 dataset: datasetDB,
//                 file_name: fileNameCustom,
//                 message: `File ${ fileNameCustom } uploaded!`
//             });
//         });
//     });
// });

// app.put('/job/:id', verifyToken, (req, res) => {

//     let id = req.params.id;
//     let body = _.pick(req.body, 'description'); // Undercore library

//     Dataset.findByIdAndUpdate(id, body, { new: true }, (err, datasetDB) => {

//         if (err) {
//             return res.status(500).json({
//                 ok: false,
//                 err
//             });
//         }

//         res.json({
//             ok: true,
//             dataset: datasetDB
//         });
//     });


// });

app.delete('/job/:id', verifyToken, (req, res) => {
    let id = req.params.id;

    Job.findByIdAndRemove(id, (err, jobRemoved) => {

        if (err) {
            return res.status(500).json({
                ok: false,
                err
            });
        }

        if (jobRemoved === null) {
            return res.status(500).json({
                ok: false,
                err: {
                    message: 'Job not found.'
                }
            });
        }

        res.json({
            ok: true,
            job: jobRemoved
        });
    });
});

module.exports = app;