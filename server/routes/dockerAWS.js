const AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});
const express = require('express');
const delay = require('delay');
const AwsContainer = require('../models/wekaDB/awsContainer');
const { verifyToken } = require('../middlewares/authentication');
// const { getNumContMaxGlobal, getCountContainers, getLastPort } = require('../impl/dockerImpl');

const app = express();

const elasticbeanstalk = new AWS.ElasticBeanstalk();

app.post('/createWorker', verifyToken, (req, res) => {
   
  let user_id = req.user._id;

  let date = new Date();
  let appName = `jguwekar${ date.getMonth()}-${ date.getDay()}-${ date.getMilliseconds() }`;

  let paramsApplication = {
    ApplicationName: appName
   };
   elasticbeanstalk.createApplication(paramsApplication, function(err, dataApplication) {
     if (err) { // an error occurred
      return res.status(500).json({
        ok: false,
        err
      });
     } 
     else {  // successful response

        let paramsApplicationVersion = {
          ApplicationName: appName, 
          AutoCreateApplication: true, 
          Description: `${appName}-app-v1`, 
          Process: true, 
          SourceBundle: {
           S3Bucket: "elasticbeanstalk-us-east-1-389195895864", 
           S3Key: "20201617R2-Dockerrun.zip"
          },
          VersionLabel: "v1"
         };
           elasticbeanstalk.createApplicationVersion(paramsApplicationVersion, async(err, dataApplicationVersion) => {
             if (err) {  // an error occurred
              return res.status(500).json({
                ok: false,
                err
              });
             }  else {     // successful response

              await delay(1000);

              let paramsEnvironment = {
                ApplicationName: appName, 
                EnvironmentName: `${appName}-env`, 
                SolutionStackName: "64bit Amazon Linux 2 v3.0.2 running Docker",
                Tier: {
                  Name: 'WebServer',
                  Type: 'Standard'
                },
                VersionLabel: "v1"
              };
              elasticbeanstalk.createEnvironment(paramsEnvironment, function(err, dataEnvironment) {
                if (err) { // an error occurred
                  return res.status(500).json({
                    ok: false,
                    err
                  });
                } else {    // successful response
 
                  let params = {
                    EnvironmentNames: [
                      `${appName}-env`
                    ]
                   };
                   elasticbeanstalk.describeEnvironments(params, function(err, dataGetEnvironment) {
                     if (err) {  // an error occurred
                      return res.status(500).json({
                        ok: false,
                        err
                      });
                     } else {  // successful response
  
                      let dataEnv = dataGetEnvironment.Environments[0];
                      
                      let awsContainer = new AwsContainer({
                        Application_name: dataEnv.ApplicationName,
                        Environment_name: dataEnv.EnvironmentName,
                        Health: dataEnv.Health,
                        Health_status: dataEnv.HealthStatus,
                        Status: dataEnv.Status,
                        Endpoint_URL: dataEnv.EndpointURL,
                        User_id: user_id
                      });
              
                      awsContainer.save(async(err, awsContainerDB) => {
                          if (err) {
                              return res.status(500).json({
                                  ok: false,
                                  err
                              });
                          }
                  
                          return res.json({
                              ok: true,
                              awsContainer: awsContainerDB
                          });
                  
                      });

                     }         
                   });

                }
              });

             }
           });
     }               
     
   });

});


app.get('/env', verifyToken, (req, res) => {

  // [`${appName}-env`]

  let environmentNames = req.environmentNames;

  let params = {};

  if (environmentNames) {
    params.EnvironmentNames = environmentNames;
  }

   elasticbeanstalk.describeEnvironments(params, function(err, data) {
     if (err) { // an error occurred
      return res.status(500).json({
        ok: false,
        err
      });
     } else {  // successful response      
      res.json({
        ok: true,
        environments: data.Environments
      });
     }         
   });
});


app.delete('/app', verifyToken, (req, res) => {

  let applicationName = req.query.applicationName;

  let params = {
    ApplicationName: applicationName,
    TerminateEnvByForce: true
  };

  elasticbeanstalk.deleteApplication(params, function(err, data) {
    if (err) {
      return res.status(500).json({
        ok: false,
        err
      });
    } else {     // successful response
      res.json({
        ok: true,
        data
      });
    }    
  });
});

module.exports = app;