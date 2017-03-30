// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';


// IoT Hub resources
var Protocol = require('azure-iot-device-mqtt').Mqtt;
var IoTHubClient = require('azure-iot-device').Client;
var Message = require('azure-iot-device').Message;
var gps = require('wifi-location');

// Bluetooth OBD resources
var OBDReader = require('bluetooth-obd');
var btOBDReader = new OBDReader();
var carData = { vin:"",
                location:"0,0", 
                longitude:0, 
                latitude:0, 
                vss:"",
                rpm:"",
                temp:"",
                aat:""
              };
var dataReceivedMarker = {};

// String containing Hostname, Device Id & Device Key in the following formats:
var connectionString = "HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>";
 

// fromConnectionString must specify a transport constructor, coming from any transport package.
var ioTHubClient = IoTHubClient.fromConnectionString(connectionString, Protocol);

var ioTHubConnectionCallback = function (err) {
  if (err) {
    printLog('ERROR: Could not connect: ' + err.message);
  } else {
    printLog('IoT Hub Client connected');

    ioTHubClient.on('message', function (msg) {
      printLog('Id: ' + msg.messageId + ' Body: ' + msg.data);
      // When using MQTT the following line is a no-op.
      ioTHubClient.complete(msg, printResultFor('completed'));
    });

    ioTHubClient.on('error', function (err) {
      printLog("ERROR: "+ err.message);
    });

    // Connect OBDReader using first device with 'obd' in the name 
    btOBDReader.autoconnect('obd');

    // Send car data up to Azure IoT Hub every 3 seconds
    setInterval( function(){
      // Get Current Location
      getCurrentLocation();
      // Create message to send to IoT Hub
      var data = JSON.stringify(carData);
      var message = new Message(data);
      message.properties.add('TelemetryName', 'telemetry-carhealth');
      printLog('Sending message: ' + message.getData());
      // Send message
      ioTHubClient.sendEvent(message, printResultFor('send'));
    }, 3000);
  }
};

btOBDReader.on('connected', function () {
  //this.requestValueByName("vss"); //vss = vehicle speed sensor 
  printLog("OBD II Adpater connected");

  // Get VIN
//  carData["vin"] = this.requestValueByName("vin");
  carData["vin"] = "VINDEADBEEFVIN";

  // Add pollers
  for (var pid in carData)
  {
      this.addPoller(pid);
  }

//     this.addPoller("vss");
//     this.addPoller("rpm");
//     this.addPoller("temp");
//     this.addPoller("aat");
 
    this.startPolling(1000); //Request all values each second. 
});

btOBDReader.on('dataReceived', function (data) {
//    printLog("Received data from OBD Adpater: " + data);
    dataReceivedMarker = data;
    // Update buffer
    carData[data.name] = data.value;

    // Update UI
    for (var dataField in carData)
    {
      var element = document.getElementById(dataField);
      if (element) {
        element.innerHTML = carData[dataField];
      }
    }
});

// Start IoT Hub Client
ioTHubClient.open(ioTHubConnectionCallback);

// Helper function to print results in the console
function printResultFor(op) {
  return function printResult(err, res) {
    if (err) console.log(op + ' error: ' + err.toString());
    if (res) console.log(op + ' status: ' + res.constructor.name);
  };
}

function printLog(text) {
  console.log(text);
  var textToLog = text + "<br/>";
  document.getElementById("logs").innerHTML+=textToLog;
}

function getCurrentLocation()
{
  printLog("Getting current location");
  gps.getTowers(function(err, towers){
    if (err) {
      printLog("Error getting location:" + err);
    } else {
      gps.getLocation(towers, function (err, loc) {
        if (err){
          printLog("Error getting location:" + err);
        } else {
          carData.location = loc.longitude + ", " +  loc.latitude;
          carData.longitude = loc.longitude;
          carData.latitude =  loc.latitude;
        }
      })

    }
  });  
}