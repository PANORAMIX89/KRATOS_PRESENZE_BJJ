import re

with open('Maestro.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update CSS Theme
content = content.replace('background-color: #ffffff; color: #000000;', 'background-color: #111827; color: #ffffff;')
content = content.replace('background: #fff;', 'background: #1f2937;')
content = content.replace('background-color: #f4f4f9;', 'background-color: #111827;')
content = content.replace('background: white;', 'background: #1f2937; color: white;')
content = content.replace('background-color: #000;', 'background-color: #f97316;')
content = content.replace('border-bottom: 2px solid #000;', 'border-bottom: 2px solid #f97316;')
content = content.replace('border: 4px solid #000;', 'border: 4px solid #f97316;')
content = content.replace('background: #eee;', 'background: #374151; color: white;')
content = content.replace('background: #000; color: #fff;', 'background: #f97316; color: #fff;')
content = content.replace('background-color: #f8f9fa;', 'background-color: #374151; color: white; border-color: #4b5563;')
content = content.replace('border-bottom: 1px solid #f0f0f0;', 'border-bottom: 1px solid #374151;')
content = content.replace('background-color: #eee;', 'background-color: #4b5563; color: white;')
content = content.replace('background-color: #e0e0e0;', 'background-color: #4b5563; color: white;')
content = content.replace('color: #666;', 'color: #9ca3af;')
content = content.replace('border: 1px solid #ccc;', 'border: 1px solid #4b5563; background-color: #374151; color: white;')

# 2. Add PROMO tab
promo_tab_html = '<button class="tab-btn" id="btnTab3" onclick="cambiaTab(\'vistaPromozioni\')">PROMO</button>\n      </div>'
content = content.replace('</button>\n      </div>', '</button>\n        ' + promo_tab_html)

# 3. Add PROMO view div
promo_view_html = """
      <div id="vistaPromozioni" class="vista-tab hidden">
        <div class="header-dash">
          <h2>Gestione Promozioni</h2>
        </div>
        <div style="margin-bottom: 20px;">
          <input type="text" id="ricercaPromoLibera" class="date-picker" placeholder="CERCA ATLETA..." onkeyup="filtraPromoLista()">
          <select id="filtroCinturaPromo" class="date-picker" onchange="filtraPromoLista()" style="margin-top:10px;">
             <option value="">TUTTE LE CINTURE</option>
             <option value="BIANCA">BIANCA</option>
             <option value="BLU">BLU</option>
             <option value="VIOLA">VIOLA</option>
             <option value="MARRONE">MARRONE</option>
             <option value="NERA">NERA</option>
          </select>
        </div>
        
        <div id="loadingPromo" class="loader-container hidden"><div class="loader"></div></div>
        
        <div id="contenutoPromo">
           <div class="section-title"><span>Atleti Selezionabili</span><span class="count-badge" id="countPromoAtleti">0</span></div>
           <ul class="lista" id="listaPromoAtleti"></ul>
           <button class="btn-login" style="margin-top:20px;" onclick="apriModalPromo()">ASSEGNA NUOVA CINTURA</button>
           <button class="btn-reset" style="margin-top:10px;" onclick="stampaReportPromo()">SCARICA REPORT STORICO</button>
        </div>
      </div>
"""
content = content.replace('<div id="modalZoom"', promo_view_html + '\n    <div id="modalZoom"')

# 4. Add Promo Modal
promo_modal_html = """
    <div id="modalPromo" class="modal" style="display:none; justify-content:flex-start; overflow-y:auto; padding-top:40px;">
      <div class="modal-content" style="background:#1f2937; padding:20px; width:90%; max-width:500px; border: 2px solid #f97316;">
         <h2 style="color:white; text-align:center; margin-top:0;">CONFERMA PROMOZIONI</h2>
         <div id="listaSelezionatiPromo" style="margin-bottom:20px;"></div>
         <button class="btn-login" onclick="confermaPromozioni()">CONFERMA E SALVA</button>
         <button class="btn-reset" style="margin-top:10px;" onclick="chiudiModalPromo()">ANNULLA</button>
      </div>
    </div>
"""
content = content.replace('<div id="modalZoom"', promo_modal_html + '\n    <div id="modalZoom"')

# 5. Fix cambiaTab logic
js_cambia_tab_target = """        if(tabId === 'vistaAtleti') document.getElementById('btnTab0').classList.add('active');
        else if(tabId === 'vistaGiornaliera') document.getElementById('btnTab1').classList.add('active');
        else document.getElementById('btnTab2').classList.add('active');"""
js_cambia_tab_repl = """        if(tabId === 'vistaAtleti') document.getElementById('btnTab0').classList.add('active');
        else if(tabId === 'vistaGiornaliera') document.getElementById('btnTab1').classList.add('active');
        else if(tabId === 'vistaAnnuale') document.getElementById('btnTab2').classList.add('active');
        else if(tabId === 'vistaPromozioni') {
           document.getElementById('btnTab3').classList.add('active');
           renderizzaListaPromo(databaseAtletiGlobale);
        }"""
content = content.replace(js_cambia_tab_target, js_cambia_tab_repl)

# 6. Add Belt Icon CSS
belt_css = """
      .belt-icon { display: inline-block; width: 14px; height: 14px; border-radius: 3px; margin-left: 8px; vertical-align: middle; border: 1px solid #000; box-shadow: 0 1px 3px rgba(0,0,0,0.5); }
      .belt-BIANCA { background-color: #ffffff; }
      .belt-BLU { background-color: #2563eb; }
      .belt-VIOLA { background-color: #7c3aed; }
      .belt-MARRONE { background-color: #78350f; }
      .belt-NERA { background-color: #000000; border: 1px solid #555; }
"""
content = content.replace('/* DASHBOARD */', belt_css + '\n      /* DASHBOARD */')

# 7. Update JS for Belt Icons and Promo Logic
promo_js = """
      function getBeltHtml(cintura) {
         if(!cintura) return '<span class="belt-icon belt-BIANCA"></span>';
         return '<span class="belt-icon belt-' + cintura + '" title="' + cintura + '"></span>';
      }

      function creaRigaAtletaGenerico(atleta) {
          const li = document.createElement('li');
          li.className = 'atleta-item';
          
          let iniziali = (atleta.nome.split(' ').map(n=>n[0]).join('')).substring(0,2);
          let avatarHtml = atleta.fotoUrl ? `<img src="${atleta.fotoUrl}" class="avatar-rect" onclick="apriModal('${atleta.fotoUrl}', '${atleta.nome}')">` : `<div class="avatar">${iniziali}</div>`;
          
          li.innerHTML = `
              <div class="atleta-info-wrapper">
                  ${avatarHtml}
                  <div class="atleta-nome">
                      <strong>${atleta.nome} ${getBeltHtml(atleta.cintura)}</strong>
                      <span class="data-iscrizione" style="margin-left:0; font-size:12px; color:#9ca3af;">Iscritto: ${atleta.dataIscrizione}</span>
                  </div>
              </div>
          `;
          return li;
      }
      
      let atletiSelezionatiPromo = new Set();
      
      function renderizzaListaPromo(lista) {
          const ul = document.getElementById('listaPromoAtleti');
          ul.innerHTML = "";
          document.getElementById('countPromoAtleti').innerText = lista.length;
          
          lista.forEach(atleta => {
             const li = document.createElement('li');
             li.className = 'atleta-item';
             
             let iniziali = (atleta.nome.split(' ').map(n=>n[0]).join('')).substring(0,2);
             let avatarHtml = atleta.fotoUrl ? `<img src="${atleta.fotoUrl}" class="avatar-rect" style="width:30px; height:30px;">` : `<div class="avatar" style="width:30px; height:30px; font-size:12px;">${iniziali}</div>`;
             
             let checked = atletiSelezionatiPromo.has(atleta.nome) ? 'checked' : '';
             
             li.innerHTML = `
                 <div class="atleta-info-wrapper">
                     <input type="checkbox" class="promo-checkbox" style="width:20px; height:20px; margin-right:15px;" value="${atleta.nome}" onchange="togglePromoSelection(this)" ${checked}>
                     ${avatarHtml}
                     <div class="atleta-nome">
                         <strong>${atleta.nome} ${getBeltHtml(atleta.cintura)}</strong>
                     </div>
                 </div>
             `;
             ul.appendChild(li);
          });
      }
      
      function togglePromoSelection(cb) {
         if (cb.checked) atletiSelezionatiPromo.add(cb.value);
         else atletiSelezionatiPromo.delete(cb.value);
      }
      
      function filtraPromoLista() {
          const query = document.getElementById('ricercaPromoLibera').value.toUpperCase();
          const cinturaFiltro = document.getElementById('filtroCinturaPromo').value.toUpperCase();
          const filtrati = databaseAtletiGlobale.filter(a => {
             let matchNome = a.nome.includes(query);
             let matchCintura = (!cinturaFiltro || a.cintura === cinturaFiltro);
             return matchNome && matchCintura;
          });
          renderizzaListaPromo(filtrati);
      }
      
      function apriModalPromo() {
         if(atletiSelezionatiPromo.size === 0) {
            alert("Seleziona almeno un atleta.");
            return;
         }
         
         const contenitore = document.getElementById('listaSelezionatiPromo');
         contenitore.innerHTML = "";
         
         atletiSelezionatiPromo.forEach(nomeAtleta => {
            let atleta = databaseAtletiGlobale.find(a => a.nome === nomeAtleta);
            if(!atleta) return;
            
            let html = `
               <div style="background:#374151; padding:10px; border-radius:8px; margin-bottom:10px;">
                  <strong style="color:white; display:block; margin-bottom:5px;">${atleta.nome} ${getBeltHtml(atleta.cintura)}</strong>
                  <select id="promoCintura_${atleta.nome.replace(/\s+/g, '_')}" class="date-picker" style="margin-bottom:5px;">
                     <option value="" disabled selected>SCEGLI NUOVA CINTURA</option>
                     <option value="BIANCA">BIANCA</option>
                     <option value="BLU">BLU</option>
                     <option value="VIOLA">VIOLA</option>
                     <option value="MARRONE">MARRONE</option>
                     <option value="NERA">NERA</option>
                  </select>
                  <input type="text" id="promoNote_${atleta.nome.replace(/\s+/g, '_')}" class="date-picker" placeholder="NOTE (OPZIONALE)">
               </div>
            `;
            contenitore.innerHTML += html;
         });
         
         document.getElementById('modalPromo').style.display = 'flex';
      }
      
      function chiudiModalPromo() {
         document.getElementById('modalPromo').style.display = 'none';
      }
      
      function confermaPromozioni() {
         let promozioni = [];
         let valida = true;
         
         atletiSelezionatiPromo.forEach(nomeAtleta => {
            let safeName = nomeAtleta.replace(/\s+/g, '_');
            let sel = document.getElementById('promoCintura_' + safeName);
            let note = document.getElementById('promoNote_' + safeName).value;
            
            if(!sel.value) {
               valida = false;
               sel.style.border = "2px solid red";
            } else {
               sel.style.border = "1px solid #4b5563";
               promozioni.push({nome: nomeAtleta, cintura: sel.value, note: note});
            }
         });
         
         if(!valida) {
            alert("Seleziona la nuova cintura per tutti gli atleti!");
            return;
         }
         
         let btn = document.querySelector('#modalPromo .btn-login');
         btn.innerText = "SALVATAGGIO...";
         btn.disabled = true;
         
         google.script.run.withSuccessHandler(res => {
            alert(res.message);
            btn.innerText = "CONFERMA E SALVA";
            btn.disabled = false;
            chiudiModalPromo();
            if(res.success) {
               atletiSelezionatiPromo.clear();
               inizializzaDatiAtleti();
            }
         }).promuoviAtleti(promozioni);
      }
      
      function stampaReportPromo() {
         // Genera un semplice foglio stampabile
         google.script.run.withSuccessHandler(storico => {
            let html = "<html><head><title>Report Promozioni</title><style>body{font-family:sans-serif;} table{width:100%; border-collapse:collapse;} th,td{border:1px solid #ccc; padding:8px; text-align:left;}</style></head><body>";
            html += "<h2>STORICO PASSAGGI DI CINTURA E ISCRIZIONI</h2><table><tr><th>DATA</th><th>NOME</th><th>EVENTO</th><th>CINTURA</th><th>NOTE</th></tr>";
            storico.forEach(r => {
               html += `<tr><td>${r.data}</td><td>${r.nome}</td><td>${r.evento}</td><td>${r.cintura}</td><td>${r.note}</td></tr>`;
            });
            html += "</table><script>window.print();</script></body></html>";
            
            let printWindow = window.open('', '_blank');
            printWindow.document.write(html);
            printWindow.document.close();
         }).getStoricoCinture();
      }
"""

content = content.replace('function creaRigaAtletaGenerico(atleta) {', promo_js + '\n      function creaRigaAtletaGenerico_old(atleta) {')

# 8. Update listaPartecipanti creation in caricaDatiGiorno to show belts
list_part_target = """          res.partecipanti.forEach(p => {
            const li = document.createElement('li');
            li.className = 'atleta-item';
            let iniziali = (p.nome.split(' ').map(n=>n[0]).join('')).substring(0,2);
            let avatarHtml = p.foto ? `<img src="${p.foto}" class="avatar-rect" onclick="apriModal('${p.foto}', '${p.nome}')">` : `<div class="avatar">${iniziali}</div>`;
            
            li.innerHTML = `
              <div class="atleta-info-wrapper">
                  ${avatarHtml}
                  <div class="atleta-nome">
                      <strong>${p.nome}</strong>"""

list_part_repl = """          res.partecipanti.forEach(p => {
            const li = document.createElement('li');
            li.className = 'atleta-item';
            let iniziali = (p.nome.split(' ').map(n=>n[0]).join('')).substring(0,2);
            let avatarHtml = p.foto ? `<img src="${p.foto}" class="avatar-rect" onclick="apriModal('${p.foto}', '${p.nome}')">` : `<div class="avatar">${iniziali}</div>`;
            
            li.innerHTML = `
              <div class="atleta-info-wrapper">
                  ${avatarHtml}
                  <div class="atleta-nome">
                      <strong>${p.nome} ${getBeltHtml(p.cintura)}</strong>"""
content = content.replace(list_part_target, list_part_repl)

# Same for furbetti
list_furbetti_target = """          res.furbetti.forEach(p => {
            const li = document.createElement('li');
            li.className = 'atleta-item';
            let iniziali = (p.nome.split(' ').map(n=>n[0]).join('')).substring(0,2);
            let avatarHtml = p.foto ? `<img src="${p.foto}" class="avatar-rect" onclick="apriModal('${p.foto}', '${p.nome}')">` : `<div class="avatar">${iniziali}</div>`;
            
            li.innerHTML = `
              <div class="atleta-info-wrapper">
                  ${avatarHtml}
                  <div class="atleta-nome">
                      <strong>${p.nome}</strong>"""
list_furbetti_repl = list_part_repl.replace('res.partecipanti', 'res.furbetti')
content = content.replace(list_furbetti_target, list_furbetti_repl)


with open('Maestro.html', 'w', encoding='utf-8') as f:
    f.write(content)
