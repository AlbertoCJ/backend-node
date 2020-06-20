const CronJob = require('cron').CronJob;
const moment = require('moment');
const Docker = require('dockerode');
const docker = new Docker({ host: 'localhost', port: 2375 });
const LocalContainer = require('../models/wekaDB/localContainer');
const AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});
const AwsContainer = require('../models/wekaDB/awsContainer');
const delay = require('delay');

const elasticbeanstalk = new AWS.ElasticBeanstalk();

const {
    mainManagerJobLauncher
} = require('../impl/jobLauncher');

// `0 */${process.env.TIME_TO_RUN_CRONJOB} * * * *` // Cada x minutos
// `*/30 * * * * *`
const cronJobTask = new CronJob(`0 */${process.env.TIME_TO_RUN_CRONJOB} * * * *`, async() => {
    let thereAreLocalContainers = true;
    let thereAreAwsContainers = true;
    // { "User_id": "", "Job_id": "", "Working": false }
    await LocalContainer.find({}, (err, listContainers) => {
        if (err) {}
        if (listContainers) {
            if (listContainers.length <= 0) {
                thereAreLocalContainers = false;
            } else {
                thereAreLocalContainers = true;
                listContainers.forEach((container) => {
                    const date_work_end = moment(container.Date_work_end, "YYYY-MM-DD HH:mm:ss");
                    const date_now = moment(new Date(), "YYYY-MM-DD HH:mm:ss");
                    const diff = date_now.diff(date_work_end, 'm'); // Diff in minutes
                    if (diff >= process.env.TIME_TO_REMOVE_CONTAINERS) { // Mas de 5 mín
                        LocalContainer.deleteMany({ Id: container.Id }, function(err) {});
                        let containerToRemove = docker.getContainer(container.Id);
                        containerToRemove.remove({ force: true }, (err) => {})
                    }
                });
            }
        }
        return;
    });

    await AwsContainer.find({}, async(err, listContainers) => {
        if (err) {}
        if (listContainers) {
            if (listContainers.length <= 0) {
                thereAreAwsContainers = false;
            } else {
                thereAreAwsContainers = true;
                listContainers.forEach( async(container) => {
                    const date_work_end = moment(container.Date_work_end, "YYYY-MM-DD HH:mm:ss");
                    const date_now = moment(new Date(), "YYYY-MM-DD HH:mm:ss");
                    const diff = date_now.diff(date_work_end, 'm'); // Diff in minutes
                    if (diff >= process.env.TIME_TO_REMOVE_CONTAINERS) { // Mas de 5 mín
                        // AwsContainer.deleteMany({ Id: container.Id }, function(err) {});
                        AwsContainer.deleteOne({ Id: container.Id }, function(err) {});
                        let params = {
                            ApplicationName: container.Application_name,
                            TerminateEnvByForce: true
                        };
                        elasticbeanstalk.deleteApplication(params, function(err, data) {});
                        await delay(100);
                    }
                });
            }
        }
        return;
    });

    // Lanzar rutina para generar jobs
    let jobsRunning = await mainManagerJobLauncher();
    let thereAreJobsRunning = true;
    if (jobsRunning && jobsRunning.length <= 0) {
        thereAreJobsRunning = false;
    } else {
        thereAreJobsRunning = true;
    }

    // Parar cronJob
    if (!thereAreLocalContainers && !thereAreAwsContainers && !thereAreJobsRunning) {
        cronJobTask.stop()
    }
});

module.exports = {
    cronJobTask
}