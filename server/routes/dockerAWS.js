const AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});
const express = require('express');
const delay = require('delay');
const AwsContainer = require('../models/wekaDB/awsContainer');
const { verifyToken } = require('../middlewares/authentication');
// const { getNumContMaxGlobal, getCountContainers, getLastPort } = require('../impl/dockerImpl');

const app = express();

const elasticbeanstalk = new AWS.ElasticBeanstalk();

const appName = "jguwekar"; // TODO: Generar name aleatorio


app.post('/createWorker', verifyToken, (req, res) => {
   
  let user_id = req.user._id;

  let paramsApplication = {
    ApplicationName: appName
   };
   elasticbeanstalk.createApplication(paramsApplication, function(err, dataApplication) {
     if (err) console.log(err, err.stack); // an error occurred
     else {  // successful response
        // console.log(dataApplication); 


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
             if (err) console.log('dataApplicationVersionErr', err, err.stack); // an error occurred
             else {     // successful response
              // console.log('dataApplicationVersion', dataApplicationVersion); 

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
                if (err) console.log('dataEnvironmentErr', err, err.stack); // an error occurred
                else {    // successful response
                  // console.log('dataEnvironment', dataEnvironment);


                  let params = {
                    EnvironmentNames: [
                      `${appName}-env`
                    ]
                   };
                   elasticbeanstalk.describeEnvironments(params, function(err, dataGetEnvironment) {
                     if (err) console.log(err, err.stack); // an error occurred
                     else {  // successful response
                      // console.log(dataGetEnvironment);  
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

  // TODO: Recibir EnvironmentNames[] por req y sustituir abajo

  let params = {
    EnvironmentNames: [
      `${appName}-env`
    ]
   };
   elasticbeanstalk.describeEnvironments(params, function(err, data) {
     if (err) console.log(err, err.stack); // an error occurred
     else {  // successful response
      console.log(data);  
      
      res.json({
        ok: true,
        data: data.Environments[0]
      });
     }         
   });
});


app.delete('/app', verifyToken, (req, res) => {

  // TODO: Recibir ApplicationName por req y sustituir abajo

  let params = {
    ApplicationName: appName,
    TerminateEnvByForce: true
  };
  elasticbeanstalk.deleteApplication(params, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else {     // successful response
      console.log(data);      

      res.json({
        ok: true,
        data
      });
    }    
  });
});

module.exports = app;