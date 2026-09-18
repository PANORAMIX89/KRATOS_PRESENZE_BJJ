import re

# Append function to Codice.js
codice_js_append = """
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
"""

with open('Codice.js', 'a', encoding='utf-8') as f:
    f.write(codice_js_append)


# Modify Maestro.html
with open('Maestro.html', 'r', encoding='utf-8') as f:
    maestro = f.read()

# Change the apriModal behavior for the general lists
# In the previous python script I did: onclick=\"apriModal('${atleta.fotoUrl}', '${atleta.nome}')\"
maestro = maestro.replace("onclick=\"apriModal('${atleta.fotoUrl}', '${atleta.nome}')\"", "onclick=\"apriAnagrafica('${atleta.fotoUrl}', '${atleta.nome}', '${atleta.cintura}')\"")
maestro = maestro.replace("onclick=\"apriModal('${p.foto}', '${p.nome}')\"", "onclick=\"apriAnagrafica('${p.foto}', '${p.nome}', '${p.cintura}')\"")

# Add the new modal HTML
anagrafica_modal_html = """
    <div id="modalAnagrafica" class="modal" style="display:none; justify-content:center; align-items:center; overflow-y:auto;">
      <div class="modal-content" style="background:#1f2937; padding:20px; width:90%; max-width:400px; border: 2px solid #f97316; border-radius:12px; position:relative;">
         <span onclick="chiudiAnagrafica()" style="position:absolute; top:10px; right:15px; color:#fff; font-size:24px; cursor:pointer;">&times;</span>
         <div style="text-align:center; margin-bottom:15px;">
            <img id="anagraficaImg" src="" style="width:100px; height:100px; border-radius:50%; object-fit:cover; border:3px solid #f97316; margin-bottom:10px; display:none;">
            <h2 id="anagraficaNome" style="color:white; margin:0; font-size:20px;"></h2>
            <div id="anagraficaCinturaContainer" style="margin-top:5px;"></div>
         </div>
         
         <div style="background:#374151; padding:15px; border-radius:8px; margin-bottom:15px; text-align:center;">
            <div style="font-size:14px; color:#9ca3af;">PRESENZE TOTALI SUL TATAMI</div>
            <div id="anagraficaPresenze" style="font-size:32px; font-weight:bold; color:#f97316; margin-top:5px;">...</div>
         </div>
         
         <h3 style="color:white; font-size:16px; border-bottom:1px solid #4b5563; padding-bottom:5px;">Timeline Cinture</h3>
         <div id="anagraficaTimeline" style="color:#d1d5db; font-size:14px; margin-top:10px;">
            <div class="loader-container"><div class="loader"></div></div>
         </div>
      </div>
    </div>
"""
maestro = maestro.replace('<div id="modalZoom"', anagrafica_modal_html + '\n    <div id="modalZoom"')

# Add JS functions for Anagrafica
anagrafica_js = """
      function apriAnagrafica(fotoUrl, nome, cintura) {
         document.getElementById('anagraficaNome').innerText = nome;
         
         if(fotoUrl) {
            document.getElementById('anagraficaImg').src = fotoUrl;
            document.getElementById('anagraficaImg').style.display = 'inline-block';
         } else {
            document.getElementById('anagraficaImg').style.display = 'none';
         }
         
         document.getElementById('anagraficaCinturaContainer').innerHTML = "CINTURA ATTUALE: " + getBeltHtml(cintura);
         document.getElementById('anagraficaPresenze').innerText = "...";
         document.getElementById('anagraficaTimeline').innerHTML = '<div class="loader-container"><div class="loader"></div></div>';
         
         document.getElementById('modalAnagrafica').style.display = 'flex';
         
         google.script.run.withSuccessHandler(res => {
            document.getElementById('anagraficaPresenze').innerText = res.presenzeTotali;
            
            let timelineHtml = "";
            if(res.storico && res.storico.length > 0) {
               res.storico.reverse().forEach(ev => {
                  timelineHtml += `
                     <div style="display:flex; margin-bottom:10px; align-items:center; background:#4b5563; padding:8px; border-radius:6px;">
                        <div style="margin-right:10px;">${getBeltHtml(ev.cintura)}</div>
                        <div style="flex-grow:1;">
                           <div style="font-weight:bold; color:white;">${ev.cintura} <span style="font-size:11px; font-weight:normal; color:#f97316;">(${ev.evento})</span></div>
                           <div style="font-size:12px;">${ev.data} ${ev.note ? ' - <i>'+ev.note+'</i>' : ''}</div>
                        </div>
                     </div>
                  `;
               });
            } else {
               timelineHtml = "<div>Nessuno storico presente per questo atleta.</div>";
            }
            document.getElementById('anagraficaTimeline').innerHTML = timelineHtml;
            
         }).getAnagraficaAtleta(nome);
      }
      
      function chiudiAnagrafica() {
         document.getElementById('modalAnagrafica').style.display = 'none';
      }
"""
maestro = maestro.replace('function apriModal(', anagrafica_js + '\n      function apriModal(')

with open('Maestro.html', 'w', encoding='utf-8') as f:
    f.write(maestro)

