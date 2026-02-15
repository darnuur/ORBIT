#include <WiFi.h>
#include <WebServer.h>
#include "BluetoothSerial.h"
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI";
const char* password = "YOUR_PASSWORD";

WebServer server(80);
BluetoothSerial SerialBT;

// SENSOR PINS
#define HEART_PIN 34
#define TEMP_PIN 35
#define WEIGHT_PIN 32
#define HEIGHT_PIN 33

void sendCORS() { server.sendHeader("Access-Control-Allow-Origin", "*"); }

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid,password);
  while(WiFi.status()!=WL_CONNECTED){delay(500);Serial.print(".");}
  Serial.println("\nConnected WiFi!");
  if(MDNS.begin("orbit")) Serial.println("O.R.B.I.T Ready at http://orbit.local");

  SerialBT.begin("ORBIT_PT210"); // paired phone app name

  // START
  server.on("/start", [](){
    sendCORS();
    Serial.println("Robot Started");
    server.send(200,"text/plain","Started");
  });

  // VITALS
  server.on("/vitals", [](){
    sendCORS();
    int heartRate = analogRead(HEART_PIN)/20;
    float temperature = analogRead(TEMP_PIN)*0.1;
    float weight = analogRead(WEIGHT_PIN)*0.1;
    float height = analogRead(HEIGHT_PIN)*0.1;

    String json="{\"heartRate\":"+String(heartRate)+",\"temperature\":"+String(temperature)+",\"weight\":"+String(weight)+",\"height\":"+String(height)+"}";
    server.send(200,"application/json",json);
  });

  // PRINT
  server.on("/print", HTTP_POST, [](){
    sendCORS();
    String body = server.arg("plain");
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, body);

    String report = "O.R.B.I.T Patient Report\n----------------------\n";
    report += "Name: " + String((const char*)doc["name"]) + "\n";
    report += "Age: " + String((int)doc["age"]) + "\n";
    report += "Patient Code: " + String((const char*)doc["patientCode"]) + "\n";
    report += "HR: " + String((int)doc["vitals"]["heartRate"]) + " bpm\n";
    report += "Temp: " + String((float)doc["vitals"]["temperature"]) + " °C\n";
    report += "Weight: " + String((float)doc["vitals"]["weight"]) + " kg\n";
    report += "Height: " + String((float)doc["vitals"]["height"]) + " cm\n";
    report += "Symptoms: " + String((const char*)doc["symptoms"]) + "\n";
    report += "----------------------\nStay Healthy!\n\n\n";

    SerialBT.print(report); // send to PT-210 via paired phone app
    server.send(200,"text/plain","Printed");
  });

  server.begin();
}

void loop(){ server.handleClient(); }
