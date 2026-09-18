import re

# ==========================================
# 1. AGGIORNAMENTO CODICE.JS
# ==========================================
with open('Codice.js', 'r', encoding='utf-8') as f:
    codice = f.read()

# Aggiorniamo promuoviAtleti per gestire correttamente la colonna E e F (LEZIONI EXTRA e NOTE)
vecchio_promuovi = """      foglioStorico.appendRow([
         p.nome,
         oggi,
         p.cintura,
         "PROMOZIONE",
         p.note
      ]);"""
nuovo_promuovi = """      foglioStorico.appendRow([
         p.nome,
         oggi,
         p.cintura,
         "PROMOZIONE",
         "",      // LEZIONI EXTRA vuoto
         p.note   // NOTE in colonna F
      ]);"""
codice = codice.replace(vecchio_promuovi, nuovo_promuovi)

nuovo_codice_backend = """
// -------------------------------------------------------------
// GESTIONE CONFIGURAZIONI CINTURE (TARGET)
// -------------------------------------------------------------
function getConfigurazioniCinture() {
  const ss = SpreadsheetApp.openById(ID_FOGLIO);
  const foglio = ss.getSheetByName("CONFIGURAZIONI");
  const dati = foglio.getDataRange().getValues();
  
  let config = { BIANCA: 80, BLU: 120, VIOLA: 150, MARRONE: 200, NERA: 200 }; // default
  
  for (let i = 0; i < dati.length; i++) {
     const chiave = dati[i][0] ? dati[i][0].toString().toUpperCase().trim() : "";
     if (config.hasOwnProperty(chiave)) {
        config[chiave] = parseInt(dati[i][1]) || config[chiave];
     }
  }
  return config;
}

function salvaConfigurazioniCinture(nuovaConfig) {
  const ss = SpreadsheetApp.openById(ID_FOGLIO);
  const foglio = ss.getSheetByName("CONFIGURAZIONI");
  const dati = foglio.getDataRange().getValues();
  
  for (let i = 0; i < dati.length; i++) {
     const chiave = dati[i][0] ? dati[i][0].toString().toUpperCase().trim() : "";
     if (nuovaConfig.hasOwnProperty(chiave)) {
        foglio.getRange(i + 1, 2).setValue(nuovaConfig[chiave]);
     }
  }
  return { success: true };
}

function rimandaAtleta(nome, lezioniExtra) {
  const ss = SpreadsheetApp.openById(ID_FOGLIO);
  const foglioStorico = ss.getSheetByName("STORICO CINTURE");
  
  const tzOffset = (new Date()).getTimezoneOffset() * 60000; 
  const oggiLocal = new Date(Date.now() - tzOffset);
  const dataFormattata = Utilities.formatDate(oggiLocal, Session.getScriptTimeZone(), "dd/MM/yyyy");
  
  // Trova la cintura attuale per registrarla assieme
  const foglioAtleti = ss.getSheetByName("ATLETI");
  const datiAtleti = foglioAtleti.getDataRange().getValues();
  let cinturaAttuale = "BIANCA";
  for(let i=3; i<datiAtleti.length; i++) {
     if(datiAtleti[i][0] && datiAtleti[i][0].toString().toUpperCase().trim() === nome.toUpperCase().trim()) {
         cinturaAttuale = datiAtleti[i][3] || "BIANCA";
         break;
     }
  }

  foglioStorico.appendRow([
     nome,
     oggiLocal,
     cinturaAttuale,
     "RIMANDATO",
     parseInt(lezioniExtra) || 0,
     "Rimandato dal Maestro"
  ]);
  
  return { success: true, message: "Atleta rimandato. Aggiunte " + lezioniExtra + " lezioni al target." };
}

// Sostituiamo la logica in getDatiPromozione per includere i target e gli idonei
function getDatiPromozioneAvanzati() {
  const ss = SpreadsheetApp.openById(ID_FOGLIO);
  const atletiDati = ss.getSheetByName("ATLETI").getDataRange().getValues();
  const storicoDati = ss.getSheetByName("STORICO CINTURE").getDataRange().getValues();
  const registroDati = ss.getSheetByName("REGISTRO GREZZO").getDataRange().getValues();
  
  const targetCinture = getConfigurazioniCinture();
  
  // 1. Mappiamo lo storico per ogni atleta per trovare la data dell'ULTIMA promozione
  //    e per sommare le lezioni extra dei RIMANDATI avvenuti DOPO quell'ultima promozione.
  const mapUltimaPromozione = {}; // nome -> data ultima promozione
  const mapLezioniExtra = {};     // nome -> somma lezioni extra
  
  for (let i = 3; i < storicoDati.length; i++) {
    const nome = storicoDati[i][0] ? storicoDati[i][0].toString().toUpperCase().trim() : "";
    if (!nome) continue;
    
    let dataVal = storicoDati[i][1];
    let dateObj = null;
    if (dataVal) {
      if (dataVal instanceof Date) { dateObj = dataVal; } 
      else {
         let p = dataVal.toString().split("/");
         if (p.length === 3) dateObj = new Date(p[2], p[1]-1, p[0]);
      }
    }
    if(!dateObj) dateObj = new Date(0);
    
    let tipoEvento = storicoDati[i][3] ? storicoDati[i][3].toString().toUpperCase().trim() : "";
    let lezioniExtra = parseInt(storicoDati[i][4]) || 0; // Colonna E
    
    if (tipoEvento === "PROMOZIONE" || tipoEvento === "ISCRIZIONE") {
       // Reset se è una nuova promozione!
       if (!mapUltimaPromozione[nome] || dateObj >= mapUltimaPromozione[nome]) {
           mapUltimaPromozione[nome] = dateObj;
           mapLezioniExtra[nome] = 0; // Azzera i malus precedenti!
       }
    } else if (tipoEvento === "RIMANDATO") {
       if (!mapUltimaPromozione[nome]) mapUltimaPromozione[nome] = new Date(0);
       if (!mapLezioniExtra[nome]) mapLezioniExtra[nome] = 0;
       if (dateObj >= mapUltimaPromozione[nome]) {
           mapLezioniExtra[nome] += lezioniExtra;
       }
    }
  }

  // 2. Calcoliamo le presenze di ogni atleta DALLA data della sua ultima promozione
  const mapPresenze = {}; // nome -> { tot: 0, ultimoAllenamento: data }
  for (let i = 1; i < registroDati.length; i++) {
    const esito = registroDati[i][4] ? registroDati[i][4].toString() : "";
    if (!esito.startsWith("OK REGISTRAZIONE")) continue;
    
    const nome = registroDati[i][3] ? registroDati[i][3].toString().toUpperCase().trim() : "";
    if (!nome) continue;
    
    let dataReg = registroDati[i][0];
    let dateObj = null;
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
      if (!mapPresenze[nome]) mapPresenze[nome] = { tot: 0, ultimoAllenamento: null };
      let dataInizio = mapUltimaPromozione[nome] || new Date(0);
      if (dateObj >= dataInizio) {
        mapPresenze[nome].tot++;
        if (!mapPresenze[nome].ultimoAllenamento || dateObj > mapPresenze[nome].ultimoAllenamento) {
            mapPresenze[nome].ultimoAllenamento = dateObj;
        }
      }
    }
  }
  
  // 3. Prepariamo i risultati
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
    let dataUltima = mapUltimaPromozione[nome];
    
    let strDataUltima = "--/--/----";
    let mesiPassati = 0;
    if (dataUltima && dataUltima.getTime() > 0) {
       strDataUltima = Utilities.formatDate(dataUltima, Session.getScriptTimeZone(), "dd/MM/yyyy");
       let diffTime = Math.abs(oggi - dataUltima);
       mesiPassati = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.416)); 
    }
    
    let datiPres = mapPresenze[nome] || { tot: 0, ultimoAllenamento: null };
    let lezioniFatte = datiPres.tot;
    let targetBase = targetCinture[cintura] || 100;
    let malus = mapLezioniExtra[nome] || 0;
    let targetTotale = targetBase + malus;
    
    let strUltimoAllenamento = "--/--/----";
    if (datiPres.ultimoAllenamento) {
       strUltimoAllenamento = Utilities.formatDate(datiPres.ultimoAllenamento, Session.getScriptTimeZone(), "dd/MM/yyyy");
    }

    risultati.push({
       nome: nome,
       fotoUrl: foto,
       cintura: cintura,
       dataUltimaCintura: strDataUltima,
       mesiTrascorsi: mesiPassati,
       presenzeDalGrado: lezioniFatte,
       targetBase: targetBase,
       malus: malus,
       targetTotale: targetTotale,
       idoneo: lezioniFatte >= targetTotale,
       ultimoAllenamento: strUltimoAllenamento
    });
  }
  
  // Ordiniamo: Idonei in alto (ordinati per surplus di lezioni), poi gli altri ordinati per percentuale di completamento
  risultati.sort((a,b) => {
     if (a.idoneo && !b.idoneo) return -1;
     if (!a.idoneo && b.idoneo) return 1;
     if (a.idoneo && b.idoneo) {
         return (b.presenzeDalGrado - b.targetTotale) - (a.presenzeDalGrado - a.targetTotale);
     }
     let percA = a.targetTotale > 0 ? (a.presenzeDalGrado / a.targetTotale) : 0;
     let percB = b.targetTotale > 0 ? (b.presenzeDalGrado / b.targetTotale) : 0;
     return percB - percA;
  });
  
  return { atleti: risultati, config: targetCinture };
}

// Sostituisco la vecchia getAnagraficaAtleta per sfruttare i nuovi calcoli
function getAnagraficaAvanzata(nome) {
   let dati = getDatiPromozioneAvanzati();
   let atleta = dati.atleti.find(a => a.nome.toUpperCase() === nome.toUpperCase());
   
   // Prendo lo storico
   const ss = SpreadsheetApp.openById(ID_FOGLIO);
   const foglioStorico = ss.getSheetByName("STORICO CINTURE");
   const storico = [];
   if (foglioStorico) {
     const datiStorico = foglioStorico.getDataRange().getValues();
     for (let i = 3; i < datiStorico.length; i++) {
       if (datiStorico[i][0] && datiStorico[i][0].toString().toUpperCase() === nome.toUpperCase()) {
         let dataPulita = datiStorico[i][1];
         if (dataPulita instanceof Date) {
           dataPulita = Utilities.formatDate(dataPulita, Session.getScriptTimeZone(), "dd/MM/yyyy");
         } else {
           dataPulita = dataPulita.toString();
         }
         let tipoEvento = datiStorico[i][3] ? datiStorico[i][3].toString() : "";
         let noteColF = datiStorico[i][5] ? datiStorico[i][5].toString() : ""; // F è index 5
         if(datiStorico[i].length < 6) noteColF = datiStorico[i][4] ? datiStorico[i][4].toString() : ""; // Fallback se index 4 era note
         
         let lezioniExtra = datiStorico[i][4] ? datiStorico[i][4].toString() : ""; // Col E
         let testoNote = noteColF;
         if (tipoEvento === "RIMANDATO" && lezioniExtra) {
             testoNote = "+ " + lezioniExtra + " lezioni. " + noteColF;
         }
         
         storico.push({
           data: dataPulita,
           cintura: datiStorico[i][2].toString(),
           evento: tipoEvento,
           note: testoNote
         });
       }
     }
   }
   
   if (!atleta) {
       return { presenzeTotali: 0, storico: storico, statsAvanzate: null };
   }
   
   return {
       presenzeTotali: atleta.presenzeDalGrado, // Non è il totale di sempre ma dal grado
       storico: storico,
       statsAvanzate: atleta
   };
}
"""

if "getDatiPromozioneAvanzati" not in codice:
    codice = codice + "\n" + nuovo_codice_backend
    with open('Codice.js', 'w', encoding='utf-8') as f:
        f.write(codice)


# ==========================================
# 2. AGGIORNAMENTO MAESTRO.HTML
# ==========================================
with open('Maestro.html', 'r', encoding='utf-8') as f:
    maestro = f.read()

# Sostituiamo la vecchia logica della Promozione
vecchio_promo_js = """      function caricaDatiPromozione() {
         document.getElementById('loadingPromo').classList.remove('hidden');
         document.getElementById('contenutoPromo').classList.add('hidden');
         google.script.run.withSuccessHandler(res => {
            databasePromoGlobale = res;
            renderizzaListaPromo(res);
         }).getDatiPromozione();
      }

      let databasePromoGlobale = [];
      
      function renderizzaListaPromo(lista) {"""

nuovo_promo_js = """
      function caricaDatiPromozione() {
         document.getElementById('loadingPromo').classList.remove('hidden');
         document.getElementById('contenutoPromo').classList.add('hidden');
         google.script.run.withSuccessHandler(res => {
            databasePromoGlobale = res.atleti;
            
            // Popola gli input di configurazione
            document.getElementById('targetBIANCA').value = res.config.BIANCA;
            document.getElementById('targetBLU').value = res.config.BLU;
            document.getElementById('targetVIOLA').value = res.config.VIOLA;
            document.getElementById('targetMARRONE').value = res.config.MARRONE;
            document.getElementById('targetNERA').value = res.config.NERA;
            
            renderizzaListaPromo(res.atleti);
         }).getDatiPromozioneAvanzati();
      }
      
      function salvaTarget() {
         let btn = document.getElementById('btnSalvaTarget');
         btn.innerText = "Salvataggio...";
         let config = {
             BIANCA: parseInt(document.getElementById('targetBIANCA').value) || 80,
             BLU: parseInt(document.getElementById('targetBLU').value) || 120,
             VIOLA: parseInt(document.getElementById('targetVIOLA').value) || 150,
             MARRONE: parseInt(document.getElementById('targetMARRONE').value) || 200,
             NERA: parseInt(document.getElementById('targetNERA').value) || 200
         };
         google.script.run.withSuccessHandler(() => {
             btn.innerText = "SALVA TARGET CINTURE";
             alert("Target aggiornati con successo!");
             caricaDatiPromozione(); // Ricarica tutto
         }).salvaConfigurazioniCinture(config);
      }
      
      function chiediRimanda(nome) {
         let extra = prompt("Di quante lezioni vuoi rimandare " + nome + "?", "20");
         if(extra && !isNaN(extra)) {
            let container = document.getElementById('listaIdoneiPromo');
            container.innerHTML = "<div class='loader-container'><div class='loader'></div></div>";
            google.script.run.withSuccessHandler(res => {
               alert(res.message);
               caricaDatiPromozione();
            }).rimandaAtleta(nome, parseInt(extra));
         }
      }

      let databasePromoGlobale = [];
      
      function renderizzaListaPromo(lista) {
"""
maestro = maestro.replace(vecchio_promo_js, nuovo_promo_js)

# Sostituire l'innerHTML della lista promo (ora divisa in due)
vecchio_render_promo = """      function renderizzaListaPromo(lista) {
          const ul = document.getElementById('listaPromoAtleti');
          ul.innerHTML = "";
          document.getElementById('countPromoAtleti').innerText = lista.length;
          
          lista.forEach(atleta => {
             const li = document.createElement('li');
             li.className = 'atleta-item';
             
             let iniziali = (atleta.nome.split(' ').map(n=>n[0]).join('')).substring(0,2);
             let avatarHtml = atleta.fotoUrl ? `<img src="${atleta.fotoUrl}" class="avatar" style="width:30px; height:30px;">` : `<div class="avatar" style="width:30px; height:30px; font-size:12px;">${iniziali}</div>`;
             
             let checked = atletiSelezionatiPromo.has(atleta.nome) ? 'checked' : '';
             
             li.innerHTML = `
                 <div class="atleta-info-wrapper">
                     <input type="checkbox" class="promo-checkbox" style="width:20px; height:20px; margin-right:15px;" value="${atleta.nome}" onchange="togglePromoSelection(this)" ${checked}>
                     ${avatarHtml}
                     <div class="atleta-nome">
                         <strong style="display:block; margin-bottom:5px;">${atleta.nome} ${getBeltHtml(atleta.cintura)}</strong>
                         <div style="font-size:12px; color:#9ca3af;">Da: ${atleta.dataUltimaCintura} (${atleta.mesiTrascorsi} mesi) - <span style="color:#f97316; font-weight:bold;">${atleta.presenzeDalGrado} lezioni</span></div>
                     </div>
                 </div>
             `;
             ul.appendChild(li);
          });
      }"""

nuovo_render_promo = """      function renderizzaListaPromo(lista) {
          const containerIdonei = document.getElementById('listaIdoneiPromo');
          const containerInPercorso = document.getElementById('listaInPercorsoPromo');
          containerIdonei.innerHTML = "";
          containerInPercorso.innerHTML = "";
          
          let countIdonei = 0;
          let countInPercorso = 0;
          
          lista.forEach(atleta => {
             const li = document.createElement('div');
             li.className = 'atleta-item';
             li.style.display = 'flex';
             li.style.flexDirection = 'column';
             li.style.alignItems = 'flex-start';
             
             let iniziali = (atleta.nome.split(' ').map(n=>n[0]).join('')).substring(0,2);
             let avatarHtml = atleta.fotoUrl ? `<img src="${atleta.fotoUrl}" class="avatar">` : `<div class="avatar">${iniziali}</div>`;
             
             let perc = Math.min(100, (atleta.presenzeDalGrado / atleta.targetTotale) * 100);
             let barColor = perc >= 100 ? '#4ade80' : '#f97316';
             
             let inner = `
                 <div class="atleta-info-wrapper" style="width:100%;">
                     ${avatarHtml}
                     <div class="atleta-nome" style="width:100%;">
                         <strong style="display:block; margin-bottom:5px;">${atleta.nome} ${getBeltHtml(atleta.cintura)}</strong>
                         <div style="font-size:12px; color:#9ca3af; margin-bottom:5px;">Da: ${atleta.dataUltimaCintura} (${atleta.mesiTrascorsi} mesi) - Ultima: ${atleta.ultimoAllenamento}</div>
                         
                         <div style="width:100%; background-color:#4b5563; border-radius:4px; height:12px; overflow:hidden; position:relative; margin-bottom:5px;">
                            <div style="background-color:${barColor}; height:100%; width:${perc}%; transition: width 0.5s;"></div>
                         </div>
                         <div style="font-size:12px; text-align:right; color:white; font-weight:bold;">
                            ${atleta.presenzeDalGrado} / ${atleta.targetTotale} lezioni
                            ${atleta.malus > 0 ? `<span style="color:#f87171;">(Malus +${atleta.malus})</span>` : ''}
                         </div>
                     </div>
                 </div>
             `;
             
             if (atleta.idoneo) {
                 countIdonei++;
                 let checked = atletiSelezionatiPromo.has(atleta.nome) ? 'checked' : '';
                 inner += `
                    <div style="display:flex; width:100%; margin-top:15px; gap:10px;">
                       <button onclick="chiediRimanda('${atleta.nome}')" style="flex:1; padding:8px; background-color:#ef4444; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">RIMANDA</button>
                       <label style="flex:2; display:flex; align-items:center; justify-content:center; background-color:#374151; border:1px solid #4ade80; border-radius:6px; padding:8px; cursor:pointer;">
                          <input type="checkbox" class="promo-checkbox" style="margin-right:10px; width:18px; height:18px;" value="${atleta.nome}" onchange="togglePromoSelection(this)" ${checked}> 
                          SELEZIONA PER PROMOZIONE
                       </label>
                    </div>
                 `;
                 li.innerHTML = inner;
                 li.style.borderLeft = "4px solid #4ade80";
                 containerIdonei.appendChild(li);
             } else {
                 countInPercorso++;
                 li.innerHTML = inner;
                 containerInPercorso.appendChild(li);
             }
          });
          
          document.getElementById('countIdonei').innerText = countIdonei;
          document.getElementById('countInPercorso').innerText = countInPercorso;
      }"""
maestro = maestro.replace(vecchio_render_promo, nuovo_render_promo)

# Modificare HTML della vista Promozioni
vecchio_html_promo = """      <div id="vistaPromozioni" class="vista-tab hidden">
        <div class="header-sezione">
          <h3>SELEZIONE PROMOZIONI</h3>
        </div>
        
        <input type="text" id="ricercaPromoLibera" placeholder="Cerca atleta per nome..." onkeyup="filtraPromoLista()">
        
        <select id="filtroCinturaPromo" onchange="filtraPromoLista()" style="margin-bottom:15px;">
           <option value="">TUTTE LE CINTURE</option>
           <option value="BIANCA">BIANCA</option>
           <option value="BLU">BLU</option>
           <option value="VIOLA">VIOLA</option>
           <option value="MARRONE">MARRONE</option>
           <option value="NERA">NERA</option>
        </select>
        
        <div style="background-color:#1f2937; padding:15px; border-radius:12px; border:1px solid #374151;">
           <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
              <span style="font-weight:bold; color:#f97316;">ATLETI TROVATI: <span id="countPromoAtleti">0</span></span>
              <button class="btn-login" style="width:auto; padding:8px 15px; margin:0;" onclick="apriModalPromo()">AVANTI ➡️</button>
           </div>
           <ul class="lista" id="listaPromoAtleti"></ul>
        </div>
      </div>"""

nuovo_html_promo = """      <div id="vistaPromozioni" class="vista-tab hidden">
        <div class="header-sezione">
          <h3>AUTO-PROMOZIONI</h3>
        </div>
        
        <div style="background-color:#1f2937; padding:15px; border-radius:12px; border:1px solid #374151; margin-bottom:20px; text-align:left;">
           <h4 style="color:#f97316; margin-top:0;">⚙️ IMPOSTA TARGET LEZIONI CINTURE</h4>
           <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:15px;">
              <div style="flex:1; min-width:80px;"><label style="font-size:10px; color:#9ca3af;">BIANCA</label><input type="number" id="targetBIANCA" style="margin:0;"></div>
              <div style="flex:1; min-width:80px;"><label style="font-size:10px; color:#9ca3af;">BLU</label><input type="number" id="targetBLU" style="margin:0;"></div>
              <div style="flex:1; min-width:80px;"><label style="font-size:10px; color:#9ca3af;">VIOLA</label><input type="number" id="targetVIOLA" style="margin:0;"></div>
              <div style="flex:1; min-width:80px;"><label style="font-size:10px; color:#9ca3af;">MARRONE</label><input type="number" id="targetMARRONE" style="margin:0;"></div>
              <div style="flex:1; min-width:80px;"><label style="font-size:10px; color:#9ca3af;">NERA</label><input type="number" id="targetNERA" style="margin:0;"></div>
           </div>
           <button class="btn-login" id="btnSalvaTarget" onclick="salvaTarget()">SALVA TARGET CINTURE</button>
        </div>
        
        <input type="text" id="ricercaPromoLibera" placeholder="Cerca atleta per nome..." onkeyup="filtraPromoLista()">
        
        <select id="filtroCinturaPromo" onchange="filtraPromoLista()" style="margin-bottom:15px;">
           <option value="">TUTTE LE CINTURE</option>
           <option value="BIANCA">BIANCA</option>
           <option value="BLU">BLU</option>
           <option value="VIOLA">VIOLA</option>
           <option value="MARRONE">MARRONE</option>
           <option value="NERA">NERA</option>
        </select>
        
        <!-- IDONEI -->
        <div style="background-color:#1f2937; padding:15px; border-radius:12px; border:2px solid #4ade80; margin-bottom:20px;">
           <div style="display:flex; justify-content:space-between; margin-bottom:15px; align-items:center;">
              <span style="font-weight:bold; color:#4ade80; font-size:18px;">🏆 IDONEI AL PASSAGGIO (<span id="countIdonei">0</span>)</span>
              <button class="btn-login" style="width:auto; padding:8px 15px; margin:0;" onclick="apriModalPromo()">PROMUOVI SELEZIONATI ➡️</button>
           </div>
           <div id="listaIdoneiPromo" style="display:flex; flex-direction:column; gap:10px;"></div>
        </div>
        
        <!-- IN PERCORSO -->
        <div style="background-color:#1f2937; padding:15px; border-radius:12px; border:1px solid #374151;">
           <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
              <span style="font-weight:bold; color:#f97316;">⏳ IN ALLENAMENTO (<span id="countInPercorso">0</span>)</span>
           </div>
           <div id="listaInPercorsoPromo" style="display:flex; flex-direction:column; gap:10px;"></div>
        </div>
      </div>"""
maestro = maestro.replace(vecchio_html_promo, nuovo_html_promo)

# Sostituzione Anagrafica Avanzata
# Nel JS:
maestro = maestro.replace("}).getAnagraficaAtleta(nome);", "}).getAnagraficaAvanzata(nome);")

vecchio_anagrafica_js = """            document.getElementById('anagraficaPresenze').innerText = res.presenzeTotali;
            
            let timelineHtml = "";"""

nuovo_anagrafica_js = """
            if (res.statsAvanzate) {
               let a = res.statsAvanzate;
               let perc = Math.min(100, (a.presenzeDalGrado / a.targetTotale) * 100);
               let color = perc >= 100 ? '#4ade80' : '#f97316';
               
               let statsHtml = `
                  <div style="margin: 15px 0; background:#374151; padding:15px; border-radius:8px;">
                     <h4 style="margin-top:0; color:white; font-size:14px; margin-bottom:15px;">STATISTICHE CINTURA ATTUALE</h4>
                     <div style="display:flex; align-items:center; justify-content:center; gap:20px;">
                        
                        <!-- Grafico Circolare (CSS puro) -->
                        <div style="position:relative; width:80px; height:80px; border-radius:50%; background: conic-gradient(${color} ${perc * 3.6}deg, #1f2937 0deg); display:flex; align-items:center; justify-content:center;">
                           <div style="position:absolute; width:64px; height:64px; background:#374151; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-direction:column;">
                              <span style="font-weight:bold; font-size:16px; color:white;">${Math.floor(perc)}%</span>
                           </div>
                        </div>
                        
                        <div style="text-align:left; font-size:13px; color:#d1d5db; line-height:1.6;">
                           <div>Presenze: <strong style="color:white; font-size:15px;">${a.presenzeDalGrado} / ${a.targetTotale}</strong></div>
                           ${a.malus > 0 ? `<div style="color:#f87171;">Malus rimandato: +${a.malus} lezioni</div>` : ''}
                           <div>Ultima Presenza: <strong>${a.ultimoAllenamento}</strong></div>
                           <div>Data Rilascio: <strong>${a.dataUltimaCintura}</strong></div>
                        </div>
                     </div>
                  </div>
               `;
               document.getElementById('anagraficaStatsAvanzate').innerHTML = statsHtml;
            } else {
               document.getElementById('anagraficaStatsAvanzate').innerHTML = "";
            }
            
            document.getElementById('anagraficaPresenze').innerText = res.presenzeTotali;
            
            let timelineHtml = "";"""
maestro = maestro.replace(vecchio_anagrafica_js, nuovo_anagrafica_js)

# Aggiungere il div anagraficaStatsAvanzate nell'HTML della modal anagrafica
maestro = maestro.replace('<div id="anagraficaTimeline" style="text-align:left; max-height:200px; overflow-y:auto; padding-right:10px;">', '<div id="anagraficaStatsAvanzate"></div>\n           <div id="anagraficaTimeline" style="text-align:left; max-height:200px; overflow-y:auto; padding-right:10px;">')


with open('Maestro.html', 'w', encoding='utf-8') as f:
    f.write(maestro)

