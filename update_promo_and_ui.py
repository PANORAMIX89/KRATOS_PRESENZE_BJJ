import re
import os

# --- 1. CODICE.JS UPDATES ---
with open('Codice.js', 'r', encoding='utf-8') as f:
    codice = f.read()

nuova_funzione_promo = """
function getDatiPromozione() {
  const ss = SpreadsheetApp.openById(ID_FOGLIO);
  const atletiDati = ss.getSheetByName("ATLETI").getDataRange().getValues();
  const storicoDati = ss.getSheetByName("STORICO CINTURE").getDataRange().getValues();
  const registroDati = ss.getSheetByName("REGISTRO GREZZO").getDataRange().getValues();
  
  const mapStorico = {}; // nome -> data ultima cintura
  for (let i = 3; i < storicoDati.length; i++) {
    const nome = storicoDati[i][0] ? storicoDati[i][0].toString().toUpperCase().trim() : "";
    if (!nome) continue;
    let dataVal = storicoDati[i][1];
    if (dataVal) {
      // Le righe in basso sono le più recenti, quindi teniamo l'ultima sovrascrivendo
      if (dataVal instanceof Date) {
         mapStorico[nome] = dataVal;
      } else {
         let p = dataVal.toString().split("/");
         if (p.length === 3) mapStorico[nome] = new Date(p[2], p[1]-1, p[0]);
      }
    }
  }

  const mapPresenze = {}; // nome -> presenze da data ultima cintura
  for (let i = 1; i < registroDati.length; i++) {
    const esito = registroDati[i][4] ? registroDati[i][4].toString() : "";
    if (!esito.startsWith("OK REGISTRAZIONE")) continue;
    
    const nome = registroDati[i][3] ? registroDati[i][3].toString().toUpperCase().trim() : "";
    if (!nome) continue;
    
    let dataReg = registroDati[i][0];
    let dateObj;
    if (dataReg instanceof Date) dateObj = dataReg;
    else {
       let strDate = dataReg.toString().trim();
       let matchStr = strDate.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/);
       if (matchStr) {
          let p = matchStr[0].split(/[/-]/);
          dateObj = new Date(p[2], p[1]-1, p[0]);
       }
    }
    
    if (dateObj) {
      if (!mapPresenze[nome]) mapPresenze[nome] = 0;
      let dataInizio = mapStorico[nome] || new Date(0);
      if (dateObj >= dataInizio) {
        mapPresenze[nome]++;
      }
    }
  }
  
  const risultati = [];
  const oggi = new Date();
  for (let i = 3; i < atletiDati.length; i++) {
    const nome = atletiDati[i][0] ? atletiDati[i][0].toString().toUpperCase().trim() : "";
    if (!nome) continue;
    
    let foto = "";
    if (atletiDati[i][1]) {
      const match = atletiDati[i][1].toString().match(/\/d\/([-\w]{25,})/);
      foto = match ? "https://drive.google.com/thumbnail?id=" + match[1] + "&sz=w400" : atletiDati[i][1];
    }
    
    let cintura = atletiDati[i][3] ? atletiDati[i][3].toString().toUpperCase().trim() : "BIANCA";
    let dataUltima = mapStorico[nome];
    
    let strDataUltima = "--/--/----";
    let mesiPassati = 0;
    if (dataUltima) {
       strDataUltima = Utilities.formatDate(dataUltima, Session.getScriptTimeZone(), "dd/MM/yyyy");
       let diffTime = Math.abs(oggi - dataUltima);
       mesiPassati = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.416)); 
    }
    
    risultati.push({
       nome: nome,
       fotoUrl: foto,
       cintura: cintura,
       dataUltimaCintura: strDataUltima,
       mesiTrascorsi: mesiPassati,
       presenzeDalGrado: mapPresenze[nome] || 0
    });
  }
  
  // Ordina per presenze (chi ha frequentato di più prima)
  risultati.sort((a,b) => b.presenzeDalGrado - a.presenzeDalGrado);
  return risultati;
}
"""

if "function getDatiPromozione" not in codice:
    with open('Codice.js', 'a', encoding='utf-8') as f:
        f.write("\n" + nuova_funzione_promo)

# --- 2. MAESTRO.HTML UPDATES ---
with open('Maestro.html', 'r', encoding='utf-8') as f:
    maestro = f.read()

# 2a. Fix input and date picker CSS
# Add modern date picker CSS and dark input backgrounds
date_picker_css = """
      input[type="date"], input[type="text"], input[type="password"], select { 
         background-color: #374151; color: #ffffff; border: 1px solid #4b5563; 
         border-radius: 8px; padding: 12px; font-family: inherit; font-size: 14px;
      }
      input::placeholder { color: #9ca3af; }
      input[type="date"]::-webkit-calendar-picker-indicator {
         filter: invert(1); cursor: pointer;
      }
"""
maestro = maestro.replace('/* PULSANTI E INPUT */', date_picker_css + '\n      /* PULSANTI E INPUT */')
maestro = maestro.replace('border-bottom: 2px solid #f97316;', 'border-bottom: 2px solid #f97316; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5);')

# 2b. Avatars to Round (TONDO), Belts to Rectangle (RETTANGOLINO)
maestro = maestro.replace('border-radius: 3px;', 'border-radius: 2px; width: 22px; height: 10px;')
maestro = maestro.replace('avatar-rect', 'avatar') # Remove avatar-rect usage
maestro = maestro.replace('width:30px; height:30px;', 'width:40px; height:40px; border-radius:50%;') # Make all avatars round

# Fix in CSS for .avatar
avatar_css_target = ".avatar { width: 40px; height: 40px; border-radius: 50%;"
if ".avatar {" in maestro:
   maestro = re.sub(r'\.avatar \{.*?\}', '.avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; background: #f97316; color: white; display: flex; justify-content: center; align-items: center; font-weight: bold; font-size: 14px; margin-right: 15px; border: 2px solid #374151; }', maestro, flags=re.DOTALL)

# 2c. Update renderizzaListaPromo to use the new logic
render_promo_old = "function renderizzaListaPromo(lista) {"
render_promo_new = """
      function caricaDatiPromozione() {
         document.getElementById('loadingPromo').classList.remove('hidden');
         document.getElementById('contenutoPromo').classList.add('hidden');
         google.script.run.withSuccessHandler(res => {
            databasePromoGlobale = res;
            renderizzaListaPromo(res);
         }).getDatiPromozione();
      }

      let databasePromoGlobale = [];
      
      function renderizzaListaPromo(lista) {
"""
maestro = maestro.replace(render_promo_old, render_promo_new)

# In cambiaTab
cambia_tab_vecchio = """        else if(tabId === 'vistaPromozioni') {
           document.getElementById('btnTab3').classList.add('active');
           renderizzaListaPromo(databaseAtletiGlobale);
        }"""
cambia_tab_nuovo = """        else if(tabId === 'vistaPromozioni') {
           document.getElementById('btnTab3').classList.add('active');
           caricaDatiPromozione();
        }"""
maestro = maestro.replace(cambia_tab_vecchio, cambia_tab_nuovo)

# In filtraPromoLista
filtra_promo_vecchio = """const filtrati = databaseAtletiGlobale.filter(a => {"""
filtra_promo_nuovo = """const filtrati = databasePromoGlobale.filter(a => {"""
maestro = maestro.replace(filtra_promo_vecchio, filtra_promo_nuovo)

# Update HTML of promo list item
promo_li_old = """                         <strong>${atleta.nome} ${getBeltHtml(atleta.cintura)}</strong>"""
promo_li_new = """                         <strong style="display:block; margin-bottom:5px;">${atleta.nome} ${getBeltHtml(atleta.cintura)}</strong>
                         <div style="font-size:12px; color:#9ca3af;">Da: ${atleta.dataUltimaCintura} (${atleta.mesiTrascorsi} mesi) - <span style="color:#f97316; font-weight:bold;">${atleta.presenzeDalGrado} lezioni</span></div>"""
maestro = maestro.replace(promo_li_old, promo_li_new)

# In apriModalPromo
apri_modal_old = """let atleta = databaseAtletiGlobale.find(a => a.nome === nomeAtleta);"""
apri_modal_new = """let atleta = databasePromoGlobale.find(a => a.nome === nomeAtleta);"""
maestro = maestro.replace(apri_modal_old, apri_modal_new)

# Refresh after promotion confirmation
conferma_old = """               inizializzaDatiAtleti();
            }"""
conferma_new = """               inizializzaDatiAtleti();
               caricaDatiPromozione();
            }"""
maestro = maestro.replace(conferma_old, conferma_new)

with open('Maestro.html', 'w', encoding='utf-8') as f:
    f.write(maestro)

# --- 3. ATLETI.HTML UPDATES ---
with open('Atleti.html', 'r', encoding='utf-8') as f:
    atleti = f.read()

# 3a. Custom visual belt selector HTML
custom_belt_select_html = """
        <div id="cinturaSelectorContainer" style="position:relative; margin:10px 0;">
            <div id="selectedBeltVisual" onclick="toggleBeltDropdown()" style="width:100%; padding:15px; border:1px solid #4b5563; border-radius:8px; background-color:#374151; color:white; cursor:pointer; display:flex; justify-content:space-between; align-items:center;">
               <div style="display:flex; align-items:center;">
                  <span style="display:inline-block; width:30px; height:12px; border-radius:2px; background-color:#ffffff; margin-right:10px; border:1px solid #000;"></span>
                  <span>BIANCA</span>
               </div>
               <span style="font-size:12px;">▼</span>
            </div>
            <input type="hidden" id="cinturaInput" value="BIANCA">
            
            <div id="beltDropdown" style="display:none; position:absolute; top:100%; left:0; width:100%; background-color:#1f2937; border:1px solid #4b5563; border-radius:8px; z-index:10; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.5); margin-top:5px;">
               <div class="belt-option" onclick="selectBelt('BIANCA', '#ffffff')" style="padding:15px; display:flex; align-items:center; cursor:pointer; border-bottom:1px solid #374151;">
                  <span style="display:inline-block; width:30px; height:12px; border-radius:2px; background-color:#ffffff; margin-right:10px; border:1px solid #000;"></span> BIANCA
               </div>
               <div class="belt-option" onclick="selectBelt('BLU', '#2563eb')" style="padding:15px; display:flex; align-items:center; cursor:pointer; border-bottom:1px solid #374151;">
                  <span style="display:inline-block; width:30px; height:12px; border-radius:2px; background-color:#2563eb; margin-right:10px; border:1px solid #000;"></span> BLU
               </div>
               <div class="belt-option" onclick="selectBelt('VIOLA', '#7c3aed')" style="padding:15px; display:flex; align-items:center; cursor:pointer; border-bottom:1px solid #374151;">
                  <span style="display:inline-block; width:30px; height:12px; border-radius:2px; background-color:#7c3aed; margin-right:10px; border:1px solid #000;"></span> VIOLA
               </div>
               <div class="belt-option" onclick="selectBelt('MARRONE', '#78350f')" style="padding:15px; display:flex; align-items:center; cursor:pointer; border-bottom:1px solid #374151;">
                  <span style="display:inline-block; width:30px; height:12px; border-radius:2px; background-color:#78350f; margin-right:10px; border:1px solid #000;"></span> MARRONE
               </div>
               <div class="belt-option" onclick="selectBelt('NERA', '#000000')" style="padding:15px; display:flex; align-items:center; cursor:pointer;">
                  <span style="display:inline-block; width:30px; height:12px; border-radius:2px; background-color:#000000; margin-right:10px; border:1px solid #555;"></span> NERA
               </div>
            </div>
        </div>
"""
# Replace standard select
atleti = re.sub(r'<select id="cinturaInput".*?</select>', custom_belt_select_html, atleti, flags=re.DOTALL)

# Add custom belt JS
custom_belt_js = """
      function toggleBeltDropdown() {
         const drop = document.getElementById('beltDropdown');
         drop.style.display = drop.style.display === 'none' ? 'block' : 'none';
      }
      
      function selectBelt(nome, colore) {
         document.getElementById('cinturaInput').value = nome;
         let borderColor = nome === 'NERA' ? '#555' : '#000';
         document.getElementById('selectedBeltVisual').innerHTML = `
            <div style="display:flex; align-items:center;">
               <span style="display:inline-block; width:30px; height:12px; border-radius:2px; background-color:${colore}; margin-right:10px; border:1px solid ${borderColor};"></span>
               <span>${nome}</span>
            </div>
            <span style="font-size:12px;">▼</span>
         `;
         toggleBeltDropdown();
      }
      
      // Chiude il dropdown se clicchi fuori
      document.addEventListener('click', function(event) {
         const container = document.getElementById('cinturaSelectorContainer');
         if (container && !container.contains(event.target)) {
            document.getElementById('beltDropdown').style.display = 'none';
         }
      });
"""
atleti = atleti.replace('function startCamera() {', custom_belt_js + '\n      function startCamera() {')

# Make the camera feed (selfie) tondo
atleti = atleti.replace('border-radius: 8px;', 'border-radius: 50%; aspect-ratio: 1/1; object-fit: cover;')

with open('Atleti.html', 'w', encoding='utf-8') as f:
    f.write(atleti)
