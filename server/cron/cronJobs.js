const CronJob = require('cron').CronJob;
const moment = require('moment');
const Docker = require('dockerode');
const docker = new Docker({ host: 'localhost', port: 2375 });
const LocalContainer = require('../models/wekaDB/localContainer');
const wekaDB = require('../connectionsDB').wekaDB;
const {
    mainManagerJobLauncher
} = require('../impl/jobLauncher');

// `0 */${process.env.TIME_TO_RUN_CRONJOB} * * * *` // Cada x minutos
// `*/30 * * * * *`
const jobRemoveContainers = new CronJob(`0 */${process.env.TIME_TO_RUN_CRONJOB} * * * *`, () => {
    LocalContainer.find({ "User_id": "", "Job_id": "", "Working": false }, (err, listContainers) => {
        if (err) {}
        if (listContainers) {
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
        // console.log(wekaDB)
        // console.log(wekaDB.base.modelSchemas);
        // if (listContainers.length === 0) {
        //     // console.log('entra');
        //     // if (wekaDB.collections.models) {
        //     //     console.log('models');
        //     //     wekaDB.dropCollection("model", function(err, result) {});
        //     // }
        //     // if (wekaDB.collections.tasks) {
        //     //     console.log('tasks');
        //     //     wekaDB.dropCollection("task", function(err, result) {});
        //     // }

        //     wekaDB.collection('model', function(err, collection) {
        //         // Locate all the entries using find
        //         collection.deleteMany({});
        //         // .toArray(function(err, results) {
        //         //     /* whatever you want to do with the results in node such as the following
        //         //          res.render('home', {
        //         //              'title': 'MyTitle',
        //         //              'data': results
        //         //          });
        //         //     */
        //         // });
        //     });

        //     wekaDB.collection('task', function(err, collection) {
        //         // Locate all the entries using find
        //         collection.deleteMany({});
        //         // .toArray(function(err, results) {
        //         //     /* whatever you want to do with the results in node such as the following
        //         //          res.render('home', {
        //         //              'title': 'MyTitle',
        //         //              'data': results
        //         //          });
        //         //     */
        //         // });
        //     });
        // }
    });

    // mainManagerJobLauncher();
});

module.exports = {
    jobRemoveContainers
}