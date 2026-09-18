
      let databaseAtletiGlobale = []; 

      document.addEventListener("DOMContentLoaded", function() {
        const tzOffset = (new Date()).getTimezoneOffset() * 60000; 
        const dataLocal = (new Date(Date.now() - tzOffset)).toISOString().split("T")[0];
        document.getElementById('dataFiltro').value = dataLocal;
        
        const isAuth = localStorage.getItem('kratos_maestro_auth');
        if (isAuth === "OK") {
          document.getElementById('loginView').classList.add('hidden');
          document.getElementById('dashboardView').classList.remove('hidden');
          cambiaTab('vistaGiornaliera');
          inizializzaDatiAtleti(); 
          caricaDatiGiorno(); 
          avviaPolling();
        }
        
        google.script.run.withSuccessHandler(popolaTendinaAnni).getAnniTendina();
      });

      function inizializzaDatiAtleti() {
         document.getElementById('loadingAtleti').classList.remove('hidden');
         document.getElementById('contenutoAtleti').classList.add('hidden');
         
         google.script.run.withSuccessHandler(res => {
            databaseAtletiGlobale = res; 
            
            const dataList = document.getElementById('listaAtletiMaestro');
            if (dataList) {
                dataList.innerHTML = "";
                res.forEach(a => {
                    let opt = document.createElement('option');
                    opt.value = a.nome;
                    dataList.appendChild(opt);
                });
            }

            renderizzaListaAtleti(res);
            
         }).getAtleti();
      }

      function renderizzaListaAtleti(lista) {
          const ul = document.getElementById('listaTuttiGliAtleti');
          ul.innerHTML = "";
          document.getElementById('countTotaleAtleti').innerText = lista.length;
          
          lista.forEach(atleta => {
             ul.appendChild(creaRigaAtletaGenerico(atleta));
          });

          document.getElementById('loadingAtleti').classList.add('hidden');
          document.getElementById('contenutoAtleti').classList.remove('hidden');
      }

      function filtraAtletiLista() {
          const query = document.getElementById('ricercaAtletiLibera').value.toUpperCase();
          const filtrati = databaseAtletiGlobale.filter(a => a.nome.includes(query));
          renderizzaListaAtleti(filtrati);
      }

      function popolaTendinaAnni(anni) {
        const select = document.getElementById('annoFiltro');
        if (!select) return;
        select.innerHTML = "";
        anni.forEach(anno => {
          let opt = document.createElement('option');
          opt.value = anno;
          opt.innerHTML = anno;
          select.appendChild(opt);
        });
        
        const tzOffset = (new Date()).getTimezoneOffset() * 60000; 
        const dataLocal = (new Date(Date.now() - tzOffset)).toISOString().split("T")[0];
        const annoCorrente = dataLocal.substring(0,4);
        if(document.querySelector(`#annoFiltro option[value="${annoCorrente}"]`)) {
          select.value = annoCorrente;
        }
      }

      function cambiaTab(tabId) {
        document.querySelectorAll('.vista-tab').forEach(div => div.classList.add('hidden'));
        document.getElementById(tabId).classList.remove('hidden');
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        
        if(tabId === 'vistaAtleti') document.getElementById('btnTab0').classList.add('active');
        else if(tabId === 'vistaGiornaliera') document.getElementById('btnTab1').classList.add('active');
        else if(tabId === 'vistaAnnuale') document.getElementById('btnTab2').classList.add('active');
        else if(tabId === 'vistaPromozioni') {
           document.getElementById('btnTab3').classList.add('active');
           caricaDatiPromozione();
        }
      }

      
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
            if (res.error) {
                alert("ERRORE SUL SERVER: " + res.error);
                document.getElementById('modalAnagrafica').style.display = 'none';
                return;
            }

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
            
         }).getAnagraficaAvanzata(nome);
      }
      
      function chiudiAnagrafica() {
         document.getElementById('modalAnagrafica').style.display = 'none';
      }

      function apriModal(url, nome) {
        document.getElementById('zoomImg').src = url;
        document.getElementById('zoomNome').innerText = nome;
        document.getElementById('modalZoom').style.display = 'flex';
      }

      function chiudiModal() {
        document.getElementById('modalZoom').style.display = 'none';
      }

      function resetFiltri() {
        const tzOffset = (new Date()).getTimezoneOffset() * 60000; 
        const dataLocal = (new Date(Date.now() - tzOffset)).toISOString().split("T")[0];
        const annoCorrente = dataLocal.substring(0,4);
        
        if(document.querySelector(`#annoFiltro option[value="${annoCorrente}"]`)) {
          document.getElementById('annoFiltro').value = annoCorrente;
        } else if (document.getElementById('annoFiltro').options.length > 0) {
          document.getElementById('annoFiltro').selectedIndex = 0;
        }

        document.querySelectorAll('.mese-cb').forEach(cb => cb.checked = false);
        document.getElementById('atletaFiltro').value = "";
        document.getElementById('risultatiAnnuali').innerHTML = "<div style='text-align:center; padding:20px; color:#666;'>Usa i filtri per cercare nel registro.</div>";
        document.getElementById('totaleRisultati').classList.add('hidden');
      }

      function effettuaLogin() {
        const pin = document.getElementById('pinInput').value;
        const btn = document.getElementById('btnLogin');
        btn.innerText = "Verifica...";
        
        google.script.run.withSuccessHandler(esito => {
          if (esito) {
            localStorage.setItem('kratos_maestro_auth', 'OK');
            document.getElementById('loginView').classList.add('hidden');
            document.getElementById('dashboardView').classList.remove('hidden');
            cambiaTab('vistaGiornaliera');
            inizializzaDatiAtleti(); 
            caricaDatiGiorno(); 
            avviaPolling();
          } else {
            document.getElementById('loginError').innerText = "PIN errato. Riprova.";
            btn.innerText = "Accedi";
            document.getElementById('pinInput').value = "";
          }
        }).verificaPin(pin);
      }

      function esci() {
        localStorage.removeItem('kratos_maestro_auth');
        document.getElementById('pinInput').value = "";
        document.getElementById('dashboardView').classList.add('hidden');
        document.getElementById('loginView').classList.remove('hidden');
      }

      function caricaDatiGiorno() {
        const dataSelezionata = document.getElementById('dataFiltro').value;
        document.getElementById('loadingDash').classList.remove('hidden');
        document.getElementById('contenutoDash').classList.add('hidden');
        
        google.script.run.withSuccessHandler(mostraDati).getDatiGiorno(dataSelezionata);
      }

      function mostraDati(dati) {
        document.getElementById('loadingDash').classList.add('hidden');
        document.getElementById('contenutoDash').classList.remove('hidden');
        
        const ulInAttesa = document.getElementById('listaInAttesa');
        const ulPartecipanti = document.getElementById('listaPartecipanti');
        const ulFurbetti = document.getElementById('listaFurbetti');
        ulInAttesa.innerHTML = ""; ulPartecipanti.innerHTML = ""; ulFurbetti.innerHTML = "";
        
        document.getElementById('countInAttesa').innerText = dati.inAttesa ? dati.inAttesa.length : 0;
        document.getElementById('countPartecipanti').innerText = dati.partecipanti.length;
        document.getElementById('countFurbetti').innerText = dati.furbetti.length;
        
        if (dati.inAttesa && dati.inAttesa.length > 0) {
          document.getElementById('sezioneAppello').classList.remove('hidden');
          dati.inAttesa.forEach(a => ulInAttesa.appendChild(creaRigaAppello(a)));
        } else {
          document.getElementById('sezioneAppello').classList.add('hidden');
        }

        if (dati.partecipanti.length > 0 || dati.furbetti.length > 0) {
          document.getElementById('sezioneModifica').classList.remove('hidden');
        } else {
          document.getElementById('sezioneModifica').classList.add('hidden');
        }

        dati.partecipanti.forEach(a => ulPartecipanti.appendChild(creaRigaCheckin(a, true, false)));
        dati.furbetti.forEach(a => ulFurbetti.appendChild(creaRigaCheckin(a, false, false)));
      }

      
      function getBeltHtml(cintura) {
         if(!cintura) return '<span class="belt-icon belt-BIANCA"></span>';
         return '<span class="belt-icon belt-' + cintura + '" title="' + cintura + '"></span>';
      }

      function creaRigaAtletaGenerico(atleta) {
          const li = document.createElement('li');
          li.className = 'atleta-item';
          
          let iniziali = (atleta.nome.split(' ').map(n=>n[0]).join('')).substring(0,2);
          let avatarHtml = atleta.fotoUrl ? `<img src="${atleta.fotoUrl}" class="avatar" onclick="apriAnagrafica('${atleta.fotoUrl}', '${atleta.nome}', '${atleta.cintura}')">` : `<div class="avatar">${iniziali}</div>`;
          
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
      
      

      function caricaDatiPromozione() {
         document.getElementById('loadingPromo').classList.remove('hidden');
         document.getElementById('contenutoPromo').classList.add('hidden');
         google.script.run.withSuccessHandler(res => {
            if (res.error) {
                alert("ERRORE SUL SERVER: " + res.error);
                document.getElementById('loadingPromo').classList.add('hidden');
                document.getElementById('contenutoPromo').classList.remove('hidden');
                return;
            }
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
      }
      
      function togglePromoSelection(cb) {
         if (cb.checked) atletiSelezionatiPromo.add(cb.value);
         else atletiSelezionatiPromo.delete(cb.value);
      }
      
      function filtraPromoLista() {
          const query = document.getElementById('ricercaPromoLibera').value.toUpperCase();
          const cinturaFiltro = document.getElementById('filtroCinturaPromo').value.toUpperCase();
          const filtrati = databasePromoGlobale.filter(a => {
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
            let atleta = databasePromoGlobale.find(a => a.nome === nomeAtleta);
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
               caricaDatiPromozione();
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
            html += "</table><script>window.print();<\\/script></body></html>";
            
            let printWindow = window.open('', '_blank');
            printWindow.document.write(html);
            printWindow.document.close();
         }).getStoricoCinture();
      }

      function creaRigaAtletaGenerico_old(atleta) {
        const li = document.createElement('li');
        li.className = 'atleta-item';
        
        let avatarHtml = `<div class="avatar">${atleta.nome.charAt(0)}</div>`;
        if(atleta.fotoUrl && atleta.fotoUrl !== "") {
          avatarHtml = `<img src="${atleta.fotoUrl}" class="avatar" onclick="event.stopPropagation(); apriModal('${atleta.fotoUrl}', '${atleta.nome}')">`;
        }

        const stringaData = atleta.dataIscrizione ? atleta.dataIscrizione : "--/--/----";

        li.innerHTML = `
          <div class="atleta-info-wrapper">
             ${avatarHtml}
             <div class="atleta-nome">
               <strong>${atleta.nome}</strong>
             </div>
          </div>
          <div class="data-iscrizione">${stringaData}</div>
        `;
        return li;
      }

      function creaRigaCheckin(atleta, isOk, isRettangolo) {
        const li = document.createElement('li');
        li.className = 'atleta-item';
        
        const classeFoto = isRettangolo ? 'avatar' : 'avatar';
        let avatarHtml = `<div class="${classeFoto}">${atleta.nome.charAt(0)}</div>`;
        
        if(atleta.foto && atleta.foto !== "") {
          avatarHtml = `<img src="${atleta.foto}" class="${classeFoto}" onclick="event.stopPropagation(); apriModal('${atleta.foto}', '${atleta.nome}')">`;
        }

        const infoExtra = atleta.data ? `<small style="color:#666;">${atleta.giorno} ${atleta.data} - Ore: ${atleta.ora}</small>` : `<small style="color:#666;">Ore: ${atleta.orario}</small>`;

        li.innerHTML = `
          <div class="atleta-info-wrapper">
             ${avatarHtml}
             <div class="atleta-nome">
               <strong>${atleta.nome} ${getBeltHtml(atleta.cintura)}</strong>
               ${infoExtra}
             </div>
          </div>
          <div class="status-icon ${isOk ? 'icon-ok' : 'icon-ko'}">${isOk ? '<svg class="check-svg" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' : 'X'}</div>
        `;
        return li;
      }

      function creaRigaAppello(atleta) {
        const li = document.createElement('li');
        li.className = 'atleta-item';
        
        let avatarHtml = `<div class="avatar">${atleta.nome.charAt(0)}</div>`;
        if(atleta.foto && atleta.foto !== "") {
          avatarHtml = `<img src="${atleta.foto}" class="avatar" onclick="event.stopPropagation(); apriModal('${atleta.foto}', '${atleta.nome}')">`;
        }

        const infoExtra = `<small style="color:#666;">Ore: ${atleta.orario}</small>`;

        li.innerHTML = `
          <div class="atleta-info-wrapper">
             ${avatarHtml}
             <div class="atleta-nome">
               <strong>${atleta.nome} ${getBeltHtml(atleta.cintura)}</strong>
               ${infoExtra}
             </div>
          </div>
          <input type="checkbox" class="checkbox-appello" value="${atleta.riga}" checked>
        `;
        return li;
      }

      function ufficializzaClasse() {
        const checkboxes = document.querySelectorAll('.checkbox-appello');
        if (checkboxes.length === 0) return;
        
        const righeConfermati = [];
        const righeFurbetti = [];
        
        checkboxes.forEach(cb => {
          if (cb.checked) righeConfermati.push(parseInt(cb.value));
          else righeFurbetti.push(parseInt(cb.value));
        });
        
        const btn = document.getElementById('btnUfficializza');
        btn.innerText = "Salvataggio in corso...";
        btn.disabled = true;
        
        google.script.run.withSuccessHandler(() => {
          btn.innerText = "✅ UFFICIALIZZA CLASSE";
          btn.disabled = false;
          caricaDatiGiorno();
        }).ufficializzaPresenze(righeConfermati, righeFurbetti);
      }

      function mostraModalRiapertura() {
        document.getElementById('modalConfermaRiapertura').classList.remove('hidden');
      }

      function chiudiModalRiapertura() {
        document.getElementById('modalConfermaRiapertura').classList.add('hidden');
      }

      function confermaRiapertura() {
        chiudiModalRiapertura();
        
        const dataSelezionata = document.getElementById('dataFiltro').value;
        const btn = document.getElementById('btnModifica');
        btn.innerText = "Attendere...";
        btn.disabled = true;
        
        google.script.run.withSuccessHandler(() => {
          btn.innerText = "🔄 MODIFICA APPELLO DI OGGI";
          btn.disabled = false;
          caricaDatiGiorno();
        }).riapriClasse(dataSelezionata);
      }

      function cercaStatistiche() {
        const anno = document.getElementById('annoFiltro').value;
        const mesiSelezionati = Array.from(document.querySelectorAll('.mese-cb:checked')).map(cb => parseInt(cb.value));
        const nome = document.getElementById('atletaFiltro').value.trim().toUpperCase(); 
        const container = document.getElementById('risultatiAnnuali');
        const totaleBox = document.getElementById('totaleRisultati');
        
        totaleBox.classList.add('hidden');
        container.innerHTML = `<div class="loader-container"><div class="loader"></div></div>`;
        
        google.script.run.withSuccessHandler(res => {
          container.innerHTML = "";
          
          if(res.length === 0) { 
            container.innerHTML = "<div style='text-align:center; padding:20px; color:#dc3545; font-weight:bold;'>Nessun check-in trovato con questi filtri.</div>"; 
            return; 
          }
          
          totaleBox.innerText = `Totale Ingressi Trovati: ${res.length}`;
          totaleBox.classList.remove('hidden');
          
          const ul = document.createElement('ul');
          ul.className = 'lista';
          res.forEach(item => {
            item.orario = item.ora; 
            ul.appendChild(creaRigaCheckin(item, true, true));
          });
          container.appendChild(ul);
          
        }).getStatisticheAnnuali(anno, mesiSelezionati, nome);
      }

      function avviaPolling() {
        setInterval(() => {
          if (document.getElementById('dashboardView').classList.contains('hidden')) return;

          // Polling Vista Giornaliera
          if (!document.getElementById('vistaGiornaliera').classList.contains('hidden')) {
             let isDirty = false;
             document.querySelectorAll('.checkbox-appello').forEach(cb => {
               if (!cb.checked) isDirty = true;
             });

             if (!isDirty && !document.getElementById('btnUfficializza').disabled) {
               const dataSelezionata = document.getElementById('dataFiltro').value;
               google.script.run.withSuccessHandler(dati => {
                 mostraDati(dati);
               }).getDatiGiorno(dataSelezionata);
             }
          }
          
          // Polling Vista Atleti
          else if (!document.getElementById('vistaAtleti').classList.contains('hidden')) {
             const ricerca = document.getElementById('ricercaAtletiLibera').value;
             // Non aggiorniamo se il maestro sta cercando qualcuno in quel momento
             if (ricerca === "") {
               google.script.run.withSuccessHandler(res => {
                  // Aggiorna l'interfaccia solo se ci sono nuovi iscritti (per non perdere lo scroll)
                  if (res.length !== databaseAtletiGlobale.length) {
                      databaseAtletiGlobale = res; 
                      
                      const dataList = document.getElementById('listaAtletiMaestro');
                      if (dataList) {
                          dataList.innerHTML = "";
                          res.forEach(a => {
                              let opt = document.createElement('option');
                              opt.value = a.nome;
                              dataList.appendChild(opt);
                          });
                      }
                      
                      renderizzaListaAtleti(res);
                  }
               }).getAtleti();
             }
          }

        }, 2000); // Aggiorna ogni 2 secondi in background
      }
    