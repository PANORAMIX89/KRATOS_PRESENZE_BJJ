# Procedura di Sviluppo e Deploy (KRATOS_PRESENZE_BJJ)

Ogni volta che si effettuano modifiche a questo progetto (codice Apps Script o interfacce HTML), l'Agente DEVE seguire rigorosamente il seguente ordine di operazioni:

1. **Modifica e Salvataggio in Locale:** Svolgi il lavoro sui file locali del workspace.
2. **Push su Apps Script:** Al termine delle modifiche e con il permesso di procedere al deploy di test, esegui sempre il comando `clasp push` per caricare le modifiche su Google Apps Script.
3. **Commit Dettagliato:** Esegui un commit sul branch dedicato `SVILUPPO_AP_BJJ`. Il messaggio di commit deve contenere una **descrizione dettagliata** di ogni singola modifica apportata durante la sessione.
4. **Push su GitHub:** Esegui `git push origin SVILUPPO_AP_BJJ` per caricare il lavoro sulla repository remota (mantenendola sul ramo di sviluppo privato, come richiesto).
5. **Notifica per il Deploy Finale:** Dopo aver completato tutti gli step precedenti, notifica l'Utente (il Maestro) indicando che i file sono aggiornati su Apps Script, in modo che lui possa procedere manualmente a generare un "Nuovo Deploy" ufficiale e testare le funzionalità.

*Nota:* Non unire i rami (merge su main/master) a meno che l'Utente non lo richieda esplicitamente al termine del periodo di test sul ramo di sviluppo.
