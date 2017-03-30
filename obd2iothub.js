// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';


// IoT Hub resources
var Protocol = require('azure-iot-device-mqtt').Mqtt;
var IoTHubClient = require('azure-iot-device').Client;
var Message = require('azure-iot-device').Message;

// Bluetooth OBD resources
var OBDReader = require('bluetooth-obd');
var btOBDReader = new OBDReader();
var carData = { vss:"",
                rpm:"",
                temp:"",
                aat:""
              };
var dataReceivedMarker = {};

// String containing Hostname, Device Id & Device Key in the following formats:
//  "HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>"
var connectionString = 'HostName=ConnectedCarHack.azure-devices.net;DeviceId=olivierpi;SharedAccessKey=L6h0ooIt2mjxwOFl01Jkh+iWqtsST/V4FW8IO9hWmqg=';

// fromConnectionString must specify a transport constructor, coming from any transport package.
var ioTHubClient = IoTHubClient.fromConnectionString(connectionString, Protocol);

var ioTHubConnectionCallback = function (err) {
  if (err) {
    console.error('Could not connect: ' + err.message);
  } else {
    console.log('IoT Hub Client connected');

    ioTHubClient.on('message', function (msg) {
      console.log('Id: ' + msg.messageId + ' Body: ' + msg.data);
      // When using MQTT the following line is a no-op.
      ioTHubClient.complete(msg, printResultFor('completed'));
    });

    ioTHubClient.on('error', function (err) {
      console.error(err.message);
    });

    // Connect OBDReader using first device with 'obd' in the name 
    btOBDReader.autoconnect('obd');

    // Send car data up to Azure IoT Hub every 3 seconds
    setInterval( function(){
      var data = JSON.stringify(carData);
      var message = new Message(data);
      console.log('Sending message: ' + message.getData());

      ioTHubClient.sendEvent(message, printResultFor('send'));
    }, 3000);

  }
};

btOBDReader.on('connected', function () {
  //this.requestValueByName("vss"); //vss = vehicle speed sensor 
 
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
    console.log(data);
    dataReceivedMarker = data;
    // Update buffer
    carData[data.name] = data.value;
    // Update UI
    document.getElementById(data.name).innerHTML = data.value;
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