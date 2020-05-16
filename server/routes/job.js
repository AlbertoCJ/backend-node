const express = require('express');
// const fileUpload = require('express-fileupload');
const Job = require('../models/appDB/job');
const { verifyToken } = require('../middlewares/authentication');
const _ = require('underscore');
const fs = require('fs');
const path = require('path');
const app = express();
const {
    isAnyAlgorithms,
    updateContainerWithJobId
} = require('../impl/jobImpl');
const {
    mainManagerJobLauncher
} = require('../impl/jobLauncher');
const {
    liberateContainer
} = require('../impl/jobLauncherImpl');

const { cronJobTask } = require('../cron/cronJobs');


app.get('/job', verifyToken, (req, res) => {

    let page = req.query.page || 1;
    let limit = req.query.limit || 1;
    let nameSearch = req.query.nameSearch || '';
    let descriptionSearch = req.query.descriptionSearch || '';

    if (limit > 20) limit = 20
    if (limit < 1) limit = 1

    const options = {
        page,
        limit,
        sort: { dateCreation: 'desc' }
    };

    Job.paginate({ name: { $regex: nameSearch, $options: 'ix' }, description: { $regex: descriptionSearch, $options: 'ix' }, user: req.user._id }, options, (err, jobsDB) => {

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

app.get('/job/running', verifyToken, (req, res) => {

    let page = req.query.page || 1;
    let limit = req.query.limit || 1;

    if (limit > 20) limit = 20
    if (limit < 1) limit = 1

    const options = {
        page,
        limit,
        sort: { dateCreation: 'desc' }
    };

    Job.paginate({ hasStatus: 'RUNNING', user: req.user._id }, options, (err, jobsDB) => {

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

app.get('/job/latests', verifyToken, (req, res) => {

    // let page = req.query.page || 1;
    // let limit = req.query.limit || 1;
    let limit = req.query.limit;

    if (!limit) {
        return res.status(400).json({
            ok: false,
            message: 'You must pass a limit.'
        });
    }
    let page = 1;

    const options = {
        page,
        limit,
        sort: { dateCreation: 'desc' }
    };

    Job.paginate({ hasStatus: { $ne: 'RUNNING' }, user: req.user._id }, options, (err, jobsDB) => {

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

app.post('/job', verifyToken, async(req, res) => {

    let user_id = req.user._id;
    let fileName = req.body.fileName;
    let containers = JSON.parse(req.body.containers) || [];

    // Inicia cronJob
    cronJobTask.start();

    if (!fileName) {
        return res.status(400).json({
            ok: false,
            message: 'You must pass a fileName.'
        });
    }
    let pathFile = path.resolve(__dirname, `../../${process.env.PATH_FILES_DATASET}/${ fileName }`);
    if (!fs.existsSync(pathFile)) {
        while (containers.length > 0) {
            let containerLiberate = containers.shift();
            await liberateContainer(containerLiberate);
        }
        return res.status(404).json({
            ok: false,
            message: 'File does not exist.'
        });
    }

    let jobName = req.body.jobName;
    if (!jobName) {
        res.message = 'You must pass a jobName.';
        return res.status(400).json({
            ok: false,
            message: 'You must pass a jobName.'
        });
    }
    let jobDescription = req.body.jobDescription || '';

    let algorithms = JSON.parse(req.body.algorithms);
    if (!algorithms) {
        return res.status(400).json({
            ok: false,
            message: 'You must pass a list algorithms.'
        });
    }

    if (!isAnyAlgorithms(algorithms)) {
        return res.status(400).json({
            ok: false,
            message: 'You must pass one or more algorithms.'
        });
    }


    let job = new Job({
        name: jobName,
        description: jobDescription,
        dataAlgorithms: algorithms,
        user: user_id,
        fileName
    });

    job.save(async(err, jobDB) => {
        if (err) {
            return res.status(500).json({
                ok: false,
                err
            });
        }

        containers = await updateContainerWithJobId(containers, jobDB._id);

        mainManagerJobLauncher();

        console.log('Guardado job');

        return res.json({
            ok: true,
            job: jobDB,
            containers
        });

    });
});

app.put('/job/:id', verifyToken, (req, res) => {

    let id = req.params.id;
    let body = _.pick(req.body, 'description'); // Undercore library

    Job.findByIdAndUpdate(id, body, { new: true }, (err, jobDB) => {

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
                message: 'Job not found.'
            });
        }

        res.json({
            ok: true,
            job: jobRemoved
        });
    });
});

module.exports = app;