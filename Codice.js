const ID_FOGLIO = "1_ly9zylDtnUb1HU5s9ZdJY7swkhBL_Lqae-V4bN3UMQ"; 
const ID_CARTELLA_FOTO = "1DoBG3xKvEFnO31Oxw9zCbwhiecdhH0w-";
const LAT_PALESTRA = 44.5716446;//CASA MIA COORDINATE:44.5986929//KRATOS COORDINATE:44.5716446
const LON_PALESTRA = 10.7945698;//CASA MIA COORDINATE:10.8144647//KRATOS COORDINATE:10.7945698
const RAGGIO_MAX_METRI = 500;

function doGet(e) {
  if (e.parameter.vista === 'maestro') {
    return HtmlService.createHtmlOutputFromFile('Maestro').setTitle('DASHBOARD MAESTRO').addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } else {
    return HtmlService.createHtmlOutputFromFile('Atleti').setTitle('PRESENZE KRATOS').addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
}

function getAtleti() {
  const ss = SpreadsheetApp.openById(ID_FOGLIO);
  const foglio = ss.getSheetByName("ATLETI");
  const ultimaRiga = foglio.getLastRow();
  
  if (ultimaRiga < 4) return [];
  
  const datiRaw = foglio.getRange(4, 1, ultimaRiga - 3, 3).getValues();
  
  const atletiFormattati = datiRaw.filter(r => r[0] !== "").map(r => {
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

    return {
      nome: r[0].toString().toUpperCase().trim(),
      fotoUrl: foto,
      dataIscrizione: dataPulita
    };
  });
  
  atletiFormattati.sort((a, b) => a.nome.localeCompare(b.nome));
  
  return atletiFormattati;
}

function getNomiAtleti() {
  const ss = SpreadsheetApp.openById(ID_FOGLIO);
  const foglio = ss.getSheetByName("ATLETI");
  const ultimaRiga = foglio.getLastRow();
  
  if (ultimaRiga < 4) return [];
  
  const dati = foglio.getRange(4, 1, ultimaRiga - 3, 1).getValues();
  let nomi = dati.map(r => r[0].toString().trim()).filter(nome => nome !== "");
  return nomi.sort(); 
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

function registraPresenza(nome, latUtente, lonUtente) {
  try {
    const nomiValidi = getNomiAtleti();
    if (!nomiValidi.includes(nome)) {
      return { isOk: false, notFound: true, message: "ATLETA NON TROVATO" };
    }

    const distanza = calcolaDistanza(LAT_PALESTRA, LON_PALESTRA, latUtente, lonUtente);
    const ss = SpreadsheetApp.openById(ID_FOGLIO);
    const foglioRegistro = ss.getSheetByName("REGISTRO GREZZO");
    
    if (!foglioRegistro) {
      return { isOk: false, message: "Errore: Il foglio 'REGISTRO GREZZO' non esiste!" };
    }
    
    const dataOdierna = new Date();
    const dataScritta = Utilities.formatDate(dataOdierna, Session.getScriptTimeZone(), "dd/MM/yyyy");
    const orario = Utilities.formatDate(dataOdierna, Session.getScriptTimeZone(), "HH:mm");
    
    const stato = (distanza <= RAGGIO_MAX_METRI) ? "OK REGISTRAZIONE" : "FURBETTO";
    
    const giornoInglese = Utilities.formatDate(dataOdierna, Session.getScriptTimeZone(), "EEEE").toUpperCase();
    const traduzioneGiorni = {
      "MONDAY": "LUNEDÌ", "TUESDAY": "MARTEDÌ", "WEDNESDAY": "MERCOLEDÌ",
      "THURSDAY": "GIOVEDÌ", "FRIDAY": "VENERDÌ", "SATURDAY": "SABATO", "SUNDAY": "DOMENICA"
    };
    const giornoSettimana = traduzioneGiorni[giornoInglese] || giornoInglese;
    
    foglioRegistro.appendRow([dataScritta, orario, giornoSettimana, nome, stato]);
    
    return { isOk: (stato === "OK REGISTRAZIONE"), message: stato };
  } catch (errore) {
    return { isOk: false, message: "Errore Server: " + errore.message };
  }
}

function registraNuovoAtleta(nome, dataUriImmagine) {
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
    
    ss.getSheetByName("ATLETI").appendRow([nome, file.getUrl(), dataScritta]);
    
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
  let partecipanti = [], furbetti = [];
  
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
      
      esito === "OK REGISTRAZIONE" 
        ? partecipanti.push({nome: nomeAtleta, foto: foto, orario: orarioCheckin}) 
        : furbetti.push({nome: nomeAtleta, foto: foto, orario: orarioCheckin});
    }
  }
  return { partecipanti, furbetti };
}

function calcolaDistanza(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const rad = Math.PI / 180;
  const a = Math.sin((lat2 - lat1) * rad / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin((lon2 - lon1) * rad / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function getStatisticheAnnuali(anno, mese, nome) {
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
    const matchMese = (!mese || (dataObj.getMonth() + 1) == mese);
    const matchNome = (!nome || nomeAtleta === nome.toUpperCase());
    const matchOk = (esito === "OK REGISTRAZIONE");
    
    if (matchAnno && matchMese && matchNome && matchOk) {
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
        nome: datiRegistro[i][3],
        foto: dizionarioFoto[nomeAtleta] || ""
      });
    }
  }
  return risultati;
}

function azzeraDatabase() {
  const ss = SpreadsheetApp.openById(ID_FOGLIO);
  
  const foglioAtleti = ss.getSheetByName("ATLETI");
  if (foglioAtleti.getLastRow() > 3) {
    foglioAtleti.getRange(4, 1, foglioAtleti.getLastRow() - 3, 3).clearContent();
  }
  
  const foglioRegistro = ss.getSheetByName("REGISTRO GREZZO");
  if (foglioRegistro.getLastRow() > 1) {
    foglioRegistro.getRange(2, 1, foglioRegistro.getLastRow() - 1, 5).clearContent();
  }
  
  const foglioDash = ss.getSheetByName("DASHBOARD ANNUALE");
  if (foglioDash.getLastRow() > 5) {
    foglioDash.getRange(6, 3, foglioDash.getLastRow() - 5, 6).clearContent();
  }
  
  return "DATABASE AZZERATO CON SUCCESSO. IL SISTEMA È VERGINE.";
}