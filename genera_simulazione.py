import os
import base64
import json
import random
from datetime import datetime, timedelta

def get_random_date(start_year, end_year):
    start = datetime(start_year, 1, 1)
    end = datetime(end_year, 12, 31)
    delta = end - start
    random_days = random.randrange(delta.days)
    return (start + timedelta(days=random_days)).strftime("%d/%m/%Y")

nomi_maschi = ["Luca Rossi", "Marco Bianchi", "Andrea Ferrari", "Matteo Esposito", "Giovanni Romano", "Alessandro Colombo", "Davide Ricci", "Riccardo Marino", "Tommaso Greco", "Simone Bruno", "Gabriele Gallo"]
nomi_femmine = ["Giulia Conti", "Sofia De Luca", "Martina Costa", "Chiara Giordano", "Anna Rizzo", "Sara Lombardi", "Francesca Moretti", "Elena Barbieri", "Silvia Fontana", "Laura Santoro"]

cinture = ["BIANCA", "BLU", "VIOLA", "MARRONE", "NERA"]

folder_path = "foto selfie"
files = [f for f in os.listdir(folder_path) if f.endswith(".png")]
files.sort()

# Prendi i primi 20 file (se ce ne sono)
files = files[:20]

simulazioni = []

for i, filename in enumerate(files):
    filepath = os.path.join(folder_path, filename)
    with open(filepath, "rb") as image_file:
        b64 = base64.b64encode(image_file.read()).decode('utf-8')
    
    # Randomly pick male or female
    if i % 2 == 0:
        nome = nomi_maschi.pop(0) if nomi_maschi else f"Uomo {i}"
    else:
        nome = nomi_femmine.pop(0) if nomi_femmine else f"Donna {i}"
        
    cintura = random.choice(cinture)
    data_nascita = get_random_date(1980, 2005)
    
    # We will pass the base64 string directly
    simulazioni.append({
        "nome": nome,
        "cintura": cintura,
        "dataNascita": data_nascita,
        "b64": b64
    })

# Write the Javascript file for Apps Script
js_content = """// FILE GENERATO AUTOMATICAMENTE PER SIMULAZIONE
const SIMULAZIONE_DATI = """ + json.dumps(simulazioni, indent=2) + """;

function CREA_SIMULAZIONE_DATI() {
  const ss = SpreadsheetApp.openById(ID_FOGLIO);
  const foglioAtleti = ss.getSheetByName("ATLETI");
  const foglioRegistro = ss.getSheetByName("REGISTRO GREZZO");
  const folder = DriveApp.getFolderById("1DoBG3xKvEFnO31Oxw9zCbwhiecdhH0w-");
  
  let oggi = new Date();
  
  SIMULAZIONE_DATI.forEach(atleta => {
    // 1. Carica foto su Drive
    let blob = Utilities.newBlob(Utilities.base64Decode(atleta.b64), MimeType.PNG, "foto_" + atleta.nome + ".png");
    let file = folder.createFile(blob);
    let urlFoto = file.getUrl();
    
    // 2. Crea Atleta in ATLETI
    // Data Iscrizione = oggi meno un po' di mesi
    let dataIscrizione = Utilities.formatDate(new Date(oggi.getFullYear(), oggi.getMonth() - Math.floor(Math.random() * 10), 1), Session.getScriptTimeZone(), "dd/MM/yyyy");
    
    foglioAtleti.appendRow([atleta.nome, urlFoto, dataIscrizione, atleta.cintura, atleta.dataNascita]);
    
    // 3. Simula Presenze (da 1 a 3 presenze per testare le promozioni a "2")
    let numPresenze = Math.floor(Math.random() * 3) + 1; 
    
    for(let i = 0; i < numPresenze; i++) {
        let dataPresenza = Utilities.formatDate(new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() - i), Session.getScriptTimeZone(), "dd/MM/yyyy");
        foglioRegistro.appendRow([atleta.nome, dataPresenza, "18:00", "CONFERMATO", ""]);
    }
  });
  
  return "SIMULAZIONE COMPLETATA: 20 atleti inseriti con foto e presenze!";
}
"""

with open("Simulazione.js", "w", encoding="utf-8") as out_js:
    out_js.write(js_content)

print(f"Generated Simulazione.js with {len(simulazioni)} users.")
