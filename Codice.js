const ID_FOGLIO = "1_ly9zylDtnUb1HU5s9ZdJY7swkhBL_Lqae-V4bN3UMQ"; 
const ID_CARTELLA_FOTO = "1DoBG3xKvEFnO31Oxw9zCbwhiecdhH0w-";
const LAT_PALESTRA = 44.5716446;//CASA MIA COORDINATE:44.5986929//KRATOS COORDINATE:44.5716446
const LON_PALESTRA = 10.7945698;//CASA MIA COORDINATE:10.8144647//KRATOS COORDINATE:10.7945698
const RAGGIO_MAX_METRI = 500;

function doGet(e) {
  const vista = e.parameter.vista;
  if (vista === 'maestro') {
    return HtmlService.createHtmlOutputFromFile('Maestro').setTitle('DASHBOARD MAESTRO').addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } else {
    const template = HtmlService.createTemplateFromFile('Atleti');
    template.vistaIniziale = vista || 'home';
    template.appUrl = ScriptApp.getService().getUrl();
    return template.evaluate().setTitle('PRESENZE KRATOS').addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
}

function getAtleti() {
  const ss = SpreadsheetApp.openById(ID_FOGLIO);
  const foglio = ss.getSheetByName("ATLETI");
  const datiRaw = foglio.getDataRange().getValues();
  
  const atletiFormattati = [];
  let dataStart = 3;
  for(let i=0; i<datiRaw.length; i++) {
     if(datiRaw[i][0] && datiRaw[i][0].toString().trim().toUpperCase() === "NOME E COGNOME") {
         dataStart = i + 1;
         break;
     }
  }

  for(let i=dataStart; i<datiRaw.length; i++) {
     let r = datiRaw[i];
     if(!r[0]) continue;
     
     let foto = "";
     if (r[1]) {
       const match = r[1].toString().match(/\/d\/([-\w]{25,})/);
       foto = match ? "https://drive.google.com/thumbnail?id=" + match[1] + "&sz=w400" : r[1];
     }
     
     let dataPulita = "";
     if (r[2] instanceof Date) {
       dataPulita = Utilities.formatDate(r[2], Session.getScriptTimeZone(), "dd/MM/yyyy");
     } else if (r[2]) {
       dataPulita = r[2].toString().trim();
     }
     
     let cintura = r[3] ? r[3].toString().toUpperCase().trim() : "BIANCA";
 
     atletiFormattati.push({
       nome: r[0].toString().toUpperCase().trim(),
       fotoUrl: foto,
       dataIscrizione: dataPulita,
       cintura: cintura
     });
  }
  
  atletiFormattati.sort((a, b) => a.nome.localeCompare(b.nome));
  return atletiFormattati;
}

function getNomiAtleti() {
  const atleti = getAtleti();
  return atleti.map(a => a.nome).sort();
}

function getAnniTendina() {
  try {
    const ss = SpreadsheetApp.openById(ID_FOGLIO);
    const foglioDash = ss.getSheetByName("DASHBOARD ANNUALE");
    if (!foglioDash) return [(new Date().getFullYear()).toString()];
    
    const cella = foglioDash.getRange("B2");
    const regola = cella.getDataValidation();
    
    if (regola) {
      const tipoCriterio = regola.getCriteriaType();
      if (tipoCriterio === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) {
        return regola.getCriteriaValues()[0];
      } else if (tipoCriterio === SpreadsheetApp.DataValidationCriteria.VALUE_IN_RANGE) {
        const rangeDati = regola.getCriteriaValues()[0].getValues();
        return rangeDati.flat().filter(String);
      }
    }
    return [(new Date().getFullYear()).toString()];
  } catch (e) {
    return [(new Date().getFullYear()).toString()];
  }
}

function getAppUrl() {
  return ScriptApp.getService().getUrl();
}

function registraPresenza(nome) {
  try {
    const nomiValidi = getNomiAtleti();
    if (!nomiValidi.includes(nome)) {
      return { isOk: false, notFound: true, message: "ATLETA NON TROVATO" };
    }

    const ss = SpreadsheetApp.openById(ID_FOGLIO);
    const foglioRegistro = ss.getSheetByName("REGISTRO GREZZO");
    
    if (!foglioRegistro) {
      return { isOk: false, message: "Errore: Il foglio 'REGISTRO GREZZO' non esiste!" };
    }
    
    const dataOdierna = new Date();
    const dataScritta = Utilities.formatDate(dataOdierna, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
    
    const orario = Utilities.formatDate(dataOdierna, Session.getScriptTimeZone(), "HH:mm");
    const dati = foglioRegistro.getDataRange().getValues();
    for (let i = dati.length - 1; i >= 1; i--) {
      let dataRiga = dati[i][0];
      if (dataRiga instanceof Date) {
        dataRiga = Utilities.formatDate(dataRiga, Session.getScriptTimeZone(), "dd/MM/yyyy");
      } else if (dataRiga) {
        let strDate = dataRiga.toString().trim();
        let matchStr = strDate.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/);
        dataRiga = matchStr ? matchStr[0] : strDate.split(" ")[0];
      }
      
      if (dataRiga === dataScritta && dati[i][3] === nome) {
        let orarioTrovato = dati[i][1];
        if (orarioTrovato instanceof Date) {
          orarioTrovato = Utilities.formatDate(orarioTrovato, Session.getScriptTimeZone(), "HH:mm");
        }
        return { isOk: false, message: `Ti sei già registrato oggi alle ore ${orarioTrovato}!` };
      }
    }
    
    const stato = "IN ATTESA";
    
    const giornoInglese = Utilities.formatDate(dataOdierna, Session.getScriptTimeZone(), "EEEE").toUpperCase();
    const traduzioneGiorni = {
      "MONDAY": "LUNEDÌ", "TUESDAY": "MARTEDÌ", "WEDNESDAY": "MERCOLEDÌ",
      "THURSDAY": "GIOVEDÌ", "FRIDAY": "VENERDÌ", "SATURDAY": "SABATO", "SUNDAY": "DOMENICA"
    };
    const giornoSettimana = traduzioneGiorni[giornoInglese] || giornoInglese;
    
    const atletiSalvati = getAtleti();
    const atletaTrovato = atletiSalvati.find(a => a.nome === nome.toUpperCase());
    const cinturaAttuale = atletaTrovato ? atletaTrovato.cintura : "BIANCA";
    
    foglioRegistro.appendRow([dataScritta, orario, giornoSettimana, nome, stato, cinturaAttuale]);
    
    return { isOk: true, message: stato };
  } catch (errore) {
    return { isOk: false, message: "Errore Server: " + errore.message };
  }
}

function registraNuovoAtleta(nome, dataUriImmagine, cintura) {
  try {
    // FIX: CONTROLLO ANTI-DUPLICATI
    const nomeDaVerificare = nome.toUpperCase().trim();
    const atletiEsistenti = getNomiAtleti();
    
    // Separa il nome e il cognome per creare la variante invertita
    const partiNome = nomeDaVerificare.split(" ");
    let nomeInvertito = nomeDaVerificare; // Default uguale
    
    if (partiNome.length >= 2) {
      // Prende l'ultima parola come nome/cognome e il resto prima, e li inverte.
      // Funziona bene per "Mario Rossi" -> "Rossi Mario"
      const ultimo = partiNome.pop();
      const resto = partiNome.join(" ");
      nomeInvertito = ultimo + " " + resto;
    }

    // Se il nome normale o la sua versione invertita esistono già nel database...
    if (atletiEsistenti.includes(nomeDaVerificare) || atletiEsistenti.includes(nomeInvertito)) {
      return { success: false, message: "ATTENZIONE: UTENTE GIÀ REGISTRATO!" };
    }
    // FINE BLOCCO ANTI-DUPLICATI

    const tipoMime = dataUriImmagine.substring(dataUriImmagine.indexOf(":") + 1, dataUriImmagine.indexOf(";"));
    const datiBase64 = dataUriImmagine.substring(dataUriImmagine.indexOf(",") + 1);
    const blob = Utilities.newBlob(Utilities.base64Decode(datiBase64), tipoMime, nome);
    const cartella = DriveApp.getFolderById(ID_CARTELLA_FOTO);
    const file = cartella.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    const ss = SpreadsheetApp.openById(ID_FOGLIO);
    
    const dataOdierna = new Date();
    const dataScritta = Utilities.formatDate(dataOdierna, Session.getScriptTimeZone(), "dd/MM/yyyy");
    const cinturaScritta = cintura ? cintura.toUpperCase() : "BIANCA";
    
    ss.getSheetByName("ATLETI").appendRow([nome, file.getUrl(), dataScritta, cinturaScritta]);
    
    // Salva nello storico
    const foglioStorico = ss.getSheetByName("STORICO CINTURE");
    if (foglioStorico) {
      foglioStorico.appendRow([nome, dataScritta, cinturaScritta, "ISCRIZIONE", ""]);
    }
    
    return { success: true, message: "ISCRIZIONE COMPLETATA. OSS!" };
  } catch (e) { 
    return { success: false, message: "Errore: " + e.message };
  }
}

function verificaPin(pinInserito) {
  const ss = SpreadsheetApp.openById(ID_FOGLIO);
  return pinInserito.toString().trim() === ss.getSheetByName("CONFIGURAZIONI").getRange("B4").getValue().toString().trim();
}

function getDatiGiorno(dataSelezionataTesto) {
  const ss = SpreadsheetApp.openById(ID_FOGLIO);
  const datiRegistro = ss.getSheetByName("REGISTRO GREZZO").getDataRange().getValues();
  const atletiSalvati = getAtleti(); 
  let partecipanti = [], furbetti = [], inAttesa = [];
  
  for (let i = 1; i < datiRegistro.length; i++) {
    if (!datiRegistro[i][0]) continue; 
    
    const dataCompleta = new Date(datiRegistro[i][0]);
    const dataRiga = Utilities.formatDate(dataCompleta, Session.getScriptTimeZone(), "yyyy-MM-dd");
    
    if (dataRiga === dataSelezionataTesto) {
      let orarioCheckin = datiRegistro[i][1];
      if (orarioCheckin instanceof Date) {
        orarioCheckin = Utilities.formatDate(orarioCheckin, Session.getScriptTimeZone(), "HH:mm");
      } else if (!orarioCheckin) {
        orarioCheckin = Utilities.formatDate(dataCompleta, Session.getScriptTimeZone(), "HH:mm");
      }
      
      const nomeAtleta = datiRegistro[i][3]; 
      const esito = datiRegistro[i][4];      
      
      let atletaTrovato = atletiSalvati.find(a => a.nome === nomeAtleta.toUpperCase());
      let foto = atletaTrovato ? atletaTrovato.fotoUrl : "";
      let cintura = atletaTrovato ? atletaTrovato.cintura : "BIANCA";
      
      if (esito === "IN ATTESA") {
        inAttesa.push({nome: nomeAtleta, foto: foto, cintura: cintura, orario: orarioCheckin, riga: i + 1});
      } else if (esito.startsWith("OK REGISTRAZIONE")) {
        partecipanti.push({nome: nomeAtleta, foto: foto, cintura: cintura, orario: orarioCheckin});
      } else {
        furbetti.push({nome: nomeAtleta, foto: foto, cintura: cintura, orario: orarioCheckin});
      }
    }
  }
  return { inAttesa, partecipanti, furbetti };
}

function ufficializzaPresenze(righeConfermati, righeFurbetti) {
  const ss = SpreadsheetApp.openById(ID_FOGLIO);
  const foglioRegistro = ss.getSheetByName("REGISTRO GREZZO");
  
  if (righeConfermati && righeConfermati.length > 0) {
    righeConfermati.forEach(r => foglioRegistro.getRange(r, 5).setValue("OK REGISTRAZIONE"));
  }
  
  if (righeFurbetti && righeFurbetti.length > 0) {
    righeFurbetti.forEach(r => foglioRegistro.getRange(r, 5).setValue("FURBETTO"));
  }
  
  return true;
}

function riapriClasse(dataSelezionataTesto) {
  const ss = SpreadsheetApp.openById(ID_FOGLIO);
  const foglioRegistro = ss.getSheetByName("REGISTRO GREZZO");
  const datiRegistro = foglioRegistro.getDataRange().getValues();
  
  for (let i = 1; i < datiRegistro.length; i++) {
    if (!datiRegistro[i][0]) continue; 
    
    const dataCompleta = new Date(datiRegistro[i][0]);
    const dataRiga = Utilities.formatDate(dataCompleta, Session.getScriptTimeZone(), "yyyy-MM-dd");
    
    if (dataRiga === dataSelezionataTesto) {
      let esito = datiRegistro[i][4];
      if (esito && (esito.startsWith("OK REGISTRAZIONE") || esito === "FURBETTO")) {
        foglioRegistro.getRange(i + 1, 5).setValue("IN ATTESA");
      }
    }
  }
  return true;
}

function creaSimulazioneAtleti() {
  const ss = SpreadsheetApp.openById(ID_FOGLIO);
  let foglioAtleti = ss.getSheetByName("ATLETI");
  if (!foglioAtleti) return "Foglio ATLETI non trovato.";
  
  // Pulisce i vecchi iscritti (i dati partono dalla riga 4)
  if (foglioAtleti.getLastRow() > 3) {
    foglioAtleti.getRange(4, 1, foglioAtleti.getLastRow() - 3, foglioAtleti.getLastColumn()).clearContent();
  }
  
  const cartella = DriveApp.getFolderById(ID_CARTELLA_FOTO);
  
  const atleti = [
    { nome: "MARIO ROSSI", urlImg: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=150" }, // Banana
    { nome: "GIULIA VERDI", urlImg: "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=150" }, // Ananas
    { nome: "FRANCESCA NERI", urlImg: "https://images.unsplash.com/photo-1528825871115-3581a5387919?w=150" }, // Fragola
    { nome: "ALESSANDRO GIALLETTI", urlImg: "https://images.unsplash.com/photo-1582979512210-99b6a53386f9?w=150" }, // Arancia
    { nome: "MARTINA ESPOSITO", urlImg: "https://images.unsplash.com/photo-1528821128474-27f963b062bf?w=150" }, // Ciliegie
    { nome: "LORENZO RICCI", urlImg: "https://images.unsplash.com/photo-1423483641154-5411ec9c0ddf?w=150" }, // Limone vec
    { nome: "ANTONIO RUSSO", urlImg: "https://images.unsplash.com/photo-1558298064-28a1eb2f01eb?w=150" }, // Arancia 2
    { nome: "ELENA ROMANO", urlImg: "https://images.unsplash.com/photo-1588600878108-578307a3cc9d?w=150" }, // Kiwi
    { nome: "MATTEO FERRARI", urlImg: "https://images.unsplash.com/photo-1553279768-865429fa0078?w=150" }, // Mango
    { nome: "CHIARA BIANCO", urlImg: "https://images.unsplash.com/photo-1595475207225-428b62bda831?w=150" }, // Anguria
    { nome: "DAVIDE GALLO", urlImg: "https://images.unsplash.com/photo-1590502593747-422e118991b5?w=150" } // Limone 2
  ];
  
  const dataOdierna = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
  
  atleti.forEach(a => {
    let linkDrive = "";
    try {
       const res = UrlFetchApp.fetch(a.urlImg);
       const blob = res.getBlob().setName(a.nome + "_frutta.jpg");
       const file = cartella.createFile(blob);
       file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
       linkDrive = file.getUrl();
    } catch(e) {
       linkDrive = a.urlImg; // Fallback
    }
    
    foglioAtleti.appendRow([a.nome, linkDrive, dataOdierna]);
  });
  
  return "Simulazione completata. Vecchi atleti eliminati e 11 nuovi atleti con foto creati.";
}

function simulaPresenzeOggi() {
  const ss = SpreadsheetApp.openById(ID_FOGLIO);
  const foglioRegistro = ss.getSheetByName("REGISTRO GREZZO");
  
  // Pulisce il registro per avere un test pulito (i dati partono dalla riga 2)
  if (foglioRegistro.getLastRow() > 1) {
    foglioRegistro.getRange(2, 1, foglioRegistro.getLastRow() - 1, foglioRegistro.getLastColumn()).clearContent();
  }
  
  const nomi = [
    "MARIO ROSSI", "GIULIA VERDI", "FRANCESCA NERI", 
    "ALESSANDRO GIALLETTI", "MARTINA ESPOSITO", "LORENZO RICCI", 
    "ANTONIO RUSSO", "ELENA ROMANO", "MATTEO FERRARI", 
    "CHIARA BIANCO", "DAVIDE GALLO"
  ];
  
  const dataOdierna = new Date();
  const dataScritta = Utilities.formatDate(dataOdierna, Session.getScriptTimeZone(), "dd/MM/yyyy");
  
  const giornoInglese = Utilities.formatDate(dataOdierna, Session.getScriptTimeZone(), "EEEE").toUpperCase();
  const traduzioneGiorni = {
    "MONDAY": "LUNEDÌ", "TUESDAY": "MARTEDÌ", "WEDNESDAY": "MERCOLEDÌ",
    "THURSDAY": "GIOVEDÌ", "FRIDAY": "VENERDÌ", "SATURDAY": "SABATO", "SUNDAY": "DOMENICA"
  };
  const giornoSettimana = traduzioneGiorni[giornoInglese] || giornoInglese;

  nomi.forEach((nome, index) => {
    let oraCheckin = new Date(dataOdierna.getTime() - (index * 60000));
    const dataScritta = Utilities.formatDate(oraCheckin, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
    let orario = Utilities.formatDate(oraCheckin, Session.getScriptTimeZone(), "HH:mm");
    foglioRegistro.appendRow([dataScritta, orario, giornoSettimana, nome, "IN ATTESA"]);
  });
  
  return "Registro pulito. 10 presenze simulate per oggi.";
}

function calcolaDistanza(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const rad = Math.PI / 180;
  const a = Math.sin((lat2 - lat1) * rad / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin((lon2 - lon1) * rad / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function getStatisticheAnnuali(anno, mesi, nome) {
  const ss = SpreadsheetApp.openById(ID_FOGLIO); 
  const foglioRegistro = ss.getSheetByName('REGISTRO GREZZO');
  
  const datiRegistro = foglioRegistro.getDataRange().getValues();
  const atletiSalvati = getAtleti();
  
  const dizionarioFoto = {};
  atletiSalvati.forEach(a => dizionarioFoto[a.nome] = a.fotoUrl);
  
  const risultati = [];
  for (let i = 1; i < datiRegistro.length; i++) {
    if (!datiRegistro[i][0]) continue;
    
    const dataObj = new Date(datiRegistro[i][0]); 
    let ora = datiRegistro[i][1];
    if (ora instanceof Date) ora = Utilities.formatDate(ora, Session.getScriptTimeZone(), "HH:mm");
    
    const giorno = datiRegistro[i][2];
    const nomeAtleta = datiRegistro[i][3] ? datiRegistro[i][3].toString().toUpperCase() : "";
    const esito = datiRegistro[i][4];
    
    const matchAnno = (!anno || dataObj.getFullYear() == anno);
    const matchMese = (!mesi || mesi.length === 0 || mesi.includes(dataObj.getMonth() + 1));
    const matchNome = (!nome || nomeAtleta.includes(nome));
    
    if (matchAnno && matchMese && matchNome && esito && esito.startsWith("OK REGISTRAZIONE")) {
      let valoreDataRaw = datiRegistro[i][0];
      let dataPulita = "";
      
      if (valoreDataRaw instanceof Date) {
        dataPulita = Utilities.formatDate(valoreDataRaw, Session.getScriptTimeZone(), "dd/MM/yyyy");
      } else {
        let stringaData = valoreDataRaw.toString().trim();
        let matchStr = stringaData.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/);
        dataPulita = matchStr ? matchStr[0] : stringaData.split(" ")[0];
      }

      risultati.push({
        data: dataPulita,
        ora: ora,
        giorno: giorno,
        nome: nomeAtleta,
        foto: dizionarioFoto[nomeAtleta] || ""
      });
    }
  }
  
  // Ordina per data (dal più recente)
  risultati.sort((a, b) => {
    const d1 = a.data.split('/');
    const d2 = b.data.split('/');
    return new Date(d2[2], d2[1]-1, d2[0]) - new Date(d1[2], d1[1]-1, d1[0]);
  });
  
  return risultati;
}

function azzeraDatabase() {
  const ss = SpreadsheetApp.openById(ID_FOGLIO);
  
  // Funzione di supporto per cancellare i dati mantenendo le formule
  function clearKeepFormulas(sheet, startRow, startCol, numRows, numCols) {
    if (!sheet || numRows <= 0 || numCols <= 0) return;
    const range = sheet.getRange(startRow, startCol, numRows, numCols);
    const formulas = range.getFormulas();
    range.clearContent();
    range.setFormulas(formulas);
  }
  
  const foglioAtleti = ss.getSheetByName("ATLETI");
  if (foglioAtleti && foglioAtleti.getLastRow() > 3) {
    clearKeepFormulas(foglioAtleti, 4, 1, foglioAtleti.getLastRow() - 3, 3);
  }
  
  const foglioRegistro = ss.getSheetByName("REGISTRO GREZZO");
  if (foglioRegistro && foglioRegistro.getLastRow() > 1) {
    clearKeepFormulas(foglioRegistro, 2, 1, foglioRegistro.getLastRow() - 1, 5);
  }
  
  const foglioDash = ss.getSheetByName("DASHBOARD ANNUALE");
  if (foglioDash && foglioDash.getLastRow() > 5) {
    clearKeepFormulas(foglioDash, 6, 3, foglioDash.getLastRow() - 5, 6);
  }
  
  return "DATABASE AZZERATO CON SUCCESSO. IL SISTEMA È VERGINE (Formule mantenute).";
}

function promuoviAtleti(promozioni) {
  try {
    const ss = SpreadsheetApp.openById(ID_FOGLIO);
    const foglioStorico = ss.getSheetByName("STORICO CINTURE");
    const foglioAtleti = ss.getSheetByName("ATLETI");
    
    if (!foglioStorico || !foglioAtleti) {
      return { success: false, message: "Fogli STORICO CINTURE o ATLETI non trovati!" };
    }
    
    const dataOdierna = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");
    
    const atletiDati = foglioAtleti.getDataRange().getValues();
    
    promozioni.forEach(promo => {
      const nomeAtleta = promo.nome.toUpperCase();
      const nuovaCintura = promo.cintura.toUpperCase();
      const note = promo.note ? promo.note.toUpperCase() : "";
      
      // 1. Salva nello Storico
      foglioStorico.appendRow([nomeAtleta, dataOdierna, nuovaCintura, "PROMOZIONE", note]);
      
      // 2. Aggiorna cintura in ATLETI (colonna D, indice 3)
      for (let i = 3; i < atletiDati.length; i++) {
        if (atletiDati[i][0] && atletiDati[i][0].toString().toUpperCase().trim() === nomeAtleta) {
          foglioAtleti.getRange(i + 1, 4).setValue(nuovaCintura);
          break;
        }
      }
    });
    
    return { success: true, message: "PROMOZIONI REGISTRATE CON SUCCESSO!" };
  } catch (e) {
    return { success: false, message: "Errore: " + e.message };
  }
}

function getStoricoCinture() {
  const ss = SpreadsheetApp.openById(ID_FOGLIO);
  const foglioStorico = ss.getSheetByName("STORICO CINTURE");
  if (!foglioStorico) return [];
  
  const dati = foglioStorico.getDataRange().getValues();
  if (dati.length <= 3) return []; // Intestazioni
  
  const storico = [];
  for (let i = 3; i < dati.length; i++) {
    if (!dati[i][0]) continue;
    let dataPulita = "";
    if (dati[i][1] instanceof Date) {
      dataPulita = Utilities.formatDate(dati[i][1], Session.getScriptTimeZone(), "dd/MM/yyyy");
    } else {
      dataPulita = dati[i][1].toString();
    }
    
    storico.push({
      nome: dati[i][0].toString(),
      data: dataPulita,
      cintura: dati[i][2].toString(),
      evento: dati[i][3].toString(),
      note: dati[i][4] ? dati[i][4].toString() : ""
    });
  }
  return storico;
}
function getAnagraficaAtleta(nome) {
  const ss = SpreadsheetApp.openById(ID_FOGLIO);
  
  // 1. Statistiche Presenze (dal REGISTRO GREZZO)
  const foglioRegistro = ss.getSheetByName("REGISTRO GREZZO");
  const datiRegistro = foglioRegistro.getDataRange().getValues();
  let totPresenze = 0;
  for (let i = 1; i < datiRegistro.length; i++) {
    if (datiRegistro[i][3] && datiRegistro[i][3].toString().toUpperCase() === nome.toUpperCase()) {
      if (datiRegistro[i][4] && datiRegistro[i][4].toString().startsWith("OK REGISTRAZIONE")) {
        totPresenze++;
      }
    }
  }
  
  // 2. Timeline Storico (da STORICO CINTURE)
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
        storico.push({
          data: dataPulita,
          cintura: datiStorico[i][2].toString(),
          evento: datiStorico[i][3].toString(),
          note: datiStorico[i][4] ? datiStorico[i][4].toString() : ""
        });
      }
    }
  }
  
  return {
    presenzeTotali: totPresenze,
    storico: storico
  };
}


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

function getDatiPromozioneAvanzati() {
  try {
    const ss = SpreadsheetApp.openById(ID_FOGLIO);
    const atletiDati = ss.getSheetByName("ATLETI").getDataRange().getValues();
    const storicoDati = ss.getSheetByName("STORICO CINTURE").getDataRange().getValues();
    const registroDati = ss.getSheetByName("REGISTRO GREZZO").getDataRange().getValues();
    
    const targetCinture = getConfigurazioniCinture();
    
    const mapUltimaPromozione = {}; 
    const mapLezioniExtra = {};     
    
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
      let lezioniExtra = parseInt(storicoDati[i][4]) || 0; 
      
      if (tipoEvento === "PROMOZIONE" || tipoEvento === "ISCRIZIONE") {
         if (!mapUltimaPromozione[nome] || dateObj >= mapUltimaPromozione[nome]) {
             mapUltimaPromozione[nome] = dateObj;
             mapLezioniExtra[nome] = 0; 
         }
      } else if (tipoEvento === "RIMANDATO") {
         if (!mapUltimaPromozione[nome]) mapUltimaPromozione[nome] = new Date(0);
         if (!mapLezioniExtra[nome]) mapLezioniExtra[nome] = 0;
         if (dateObj >= mapUltimaPromozione[nome]) {
             mapLezioniExtra[nome] += lezioniExtra;
         }
      }
    }

    const mapPresenze = {}; 
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
    
    const risultati = [];
    const oggi = new Date();
    
    let dataStart = 3;
    for(let i=0; i<atletiDati.length; i++) {
       if(atletiDati[i][0] && atletiDati[i][0].toString().trim().toUpperCase() === "NOME E COGNOME") {
           dataStart = i + 1;
           break;
       }
    }

    for (let i = dataStart; i < atletiDati.length; i++) {
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
  } catch(e) {
    return { error: e.toString(), atleti: [], config: {} };
  }
}

// Sostituisco la vecchia getAnagraficaAtleta per sfruttare i nuovi calcoli
function getAnagraficaAvanzata(nome) {
   try {
       let dati = getDatiPromozioneAvanzati();
       if (dati.error) {
           return { error: dati.error, presenzeTotali: 0, storico: [], statsAvanzate: null };
       }
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
           presenzeTotali: atleta.presenzeDalGrado, 
           storico: storico,
           statsAvanzate: atleta
       };
   } catch (e) {
       return { error: e.toString(), presenzeTotali: 0, storico: [], statsAvanzate: null };
   }
}
