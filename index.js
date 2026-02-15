let lang = "en";
let patientCode = "";
let selectedSymptoms = [];
let currentVitals = {};

// LANGUAGE TEXT
const text = {
  en: { collecting: "Collecting vital signs...", normal: "Vital signs normal.", emergency: "🚨 EMERGENCY DETECTED!", goodbye: "Session complete. Stay healthy!" },
  ph: { collecting: "Kinokolekta ang vital signs...", normal: "Normal ang vital signs.", emergency: "🚨 MAY EMERHENSIYA!", goodbye: "Tapos na ang session." }
};

document.getElementById("language").addEventListener("change", e => { lang = e.target.value; });

// SAVE PATIENT INFO → SHOW SYMPTOMS
function savePatient() {
  const name = document.getElementById("name").value;
  const age = document.getElementById("age").value;
  if(!name || !age) { updateStatus("Please enter Name & Age."); return; }
  document.getElementById("symptomCard").classList.remove("hidden");
  updateStatus("Select your symptoms.");
}

// CONFIRM SYMPTOMS → GENERATE PATIENT CODE + SHOW CONTROLS
function confirmSymptoms() {
  const checkboxes = document.querySelectorAll('#symptomCard input[type="checkbox"]');
  selectedSymptoms = [];
  checkboxes.forEach(box => { if(box.checked) selectedSymptoms.push(box.value); });

  patientCode = "ORB-" + Math.floor(100000 + Math.random() * 900000);
  document.getElementById("patientCode").innerText = patientCode;

  document.getElementById("controls").classList.remove("hidden");
  updateStatus("Symptoms recorded. Patient Code generated.");
}

// START ROBOT
function startOrbit() {
  fetch(`http://orbit.local/start`)
    .then(()=>updateStatus("O.R.B.I.T started."))
    .catch(()=>updateStatus("Cannot connect to robot."));
}

// COLLECT VITAL SIGNS
function collectVitals() {
  updateStatus(text[lang].collecting);
  fetch(`http://orbit.local/vitals`)
    .then(res => res.json())
    .then(data => { currentVitals = data; evaluateVitals(data); })
    .catch(()=>updateStatus("Cannot connect to robot."));
}

// EVALUATE EMERGENCY
function evaluateVitals(v) {
  const emergency = v.heartRate < 50 || v.heartRate > 120 || v.temperature > 38 || selectedSymptoms.includes("Chest Pain") || selectedSymptoms.includes("Difficulty Breathing");

  let report = `
Code: ${patientCode}
HR: ${v.heartRate} bpm
Temp: ${v.temperature} °C
Weight: ${v.weight} kg
Height: ${v.height} cm
Symptoms: ${selectedSymptoms.join(", ")}
`;

  if(emergency) updateStatus(text[lang].emergency + "\n" + report);
  else updateStatus(text[lang].normal + "\n" + report);

  saveToHistory(report);
}

// SAVE TO LOCAL HISTORY
function saveToHistory(data) {
  let history = JSON.parse(localStorage.getItem("orbitHistory")) || {};
  if(!history[patientCode]) history[patientCode] = [];
  history[patientCode].push(data);
  localStorage.setItem("orbitHistory", JSON.stringify(history));
}

// SEARCH HISTORY
function searchPatient() {
  const code = document.getElementById("searchCode").value;
  let history = JSON.parse(localStorage.getItem("orbitHistory")) || {};
  document.getElementById("searchResult").innerText = history[code] ? history[code].join("\n\n") : "No record found.";
}

// PRINT REPORT → sends to ESP32 → PT-210 via paired phone app
function printReport() {
  const name = document.getElementById("name").value;
  const age = document.getElementById("age").value;

  fetch('http://orbit.local/print', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      name: name,
      age: age,
      patientCode: patientCode,
      vitals: currentVitals,
      symptoms: selectedSymptoms
    })
  })
  .then(()=>updateStatus("Report sent to printer via mobile app."))
  .catch(()=>updateStatus("Cannot connect to printer."));
}

// UPDATE STATUS
function updateStatus(msg) { document.getElementById("status").innerText = msg; }
