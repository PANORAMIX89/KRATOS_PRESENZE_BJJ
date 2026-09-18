import pandas as pd
import json
import datetime
import math

df_atleti = pd.read_excel('KRATOS_PRESENZE_BJJ.xlsx', sheet_name='ATLETI')
df_storico = pd.read_excel('KRATOS_PRESENZE_BJJ.xlsx', sheet_name='STORICO CINTURE')
df_registro = pd.read_excel('KRATOS_PRESENZE_BJJ.xlsx', sheet_name='REGISTRO GREZZO')
df_config = pd.read_excel('KRATOS_PRESENZE_BJJ.xlsx', sheet_name='CONFIGURAZIONI')

# Replicate getConfigurazioniCinture
targetCinture = { 'BIANCA': 80, 'BLU': 120, 'VIOLA': 150, 'MARRONE': 200, 'NERA': 200 }
for i, row in df_config.iterrows():
    if pd.isna(row.iloc[0]): continue
    chiave = str(row.iloc[0]).upper().strip()
    if chiave in targetCinture:
        try:
            targetCinture[chiave] = int(row.iloc[1])
        except:
            pass

# 1. Map storico
mapUltimaPromozione = {}
mapLezioniExtra = {}

for i, row in df_storico.iterrows():
    if i < 2: continue # skip empty
    nome = str(row.iloc[0]).upper().strip() if not pd.isna(row.iloc[0]) else ""
    if not nome or nome == 'NOME_ATLETA': continue
    
    dataVal = row.iloc[1]
    if pd.isna(dataVal):
        dateObj = datetime.datetime.fromtimestamp(0)
    elif isinstance(dataVal, datetime.datetime):
        dateObj = dataVal
    else:
        dateObj = datetime.datetime.fromtimestamp(0) # simplified
        
    tipoEvento = str(row.iloc[3]).upper().strip() if not pd.isna(row.iloc[3]) else ""
    lezioniExtra = int(row.iloc[4]) if not pd.isna(row.iloc[4]) else 0
    
    if tipoEvento in ["PROMOZIONE", "ISCRIZIONE"]:
        if nome not in mapUltimaPromozione or dateObj >= mapUltimaPromozione[nome]:
            mapUltimaPromozione[nome] = dateObj
            mapLezioniExtra[nome] = 0
    elif tipoEvento == "RIMANDATO":
        if nome not in mapUltimaPromozione: mapUltimaPromozione[nome] = datetime.datetime.fromtimestamp(0)
        if nome not in mapLezioniExtra: mapLezioniExtra[nome] = 0
        if dateObj >= mapUltimaPromozione[nome]:
            mapLezioniExtra[nome] += lezioniExtra

# 2. Map presenze
mapPresenze = {}
for i, row in df_registro.iterrows():
    esito = str(row.iloc[4]) if not pd.isna(row.iloc[4]) else ""
    if not esito.startswith("OK REGISTRAZIONE"): continue
    
    nome = str(row.iloc[3]).upper().strip() if not pd.isna(row.iloc[3]) else ""
    if not nome: continue
    
    dataReg = row.iloc[0]
    dateObj = dataReg if isinstance(dataReg, datetime.datetime) else None
    
    if dateObj:
        if nome not in mapPresenze: mapPresenze[nome] = { 'tot': 0, 'ultimoAllenamento': None }
        dataInizio = mapUltimaPromozione.get(nome, datetime.datetime.fromtimestamp(0))
        if dateObj >= dataInizio:
            mapPresenze[nome]['tot'] += 1
            if not mapPresenze[nome]['ultimoAllenamento'] or dateObj > mapPresenze[nome]['ultimoAllenamento']:
                mapPresenze[nome]['ultimoAllenamento'] = dateObj

# 3. Risultati
risultati = []
oggi = datetime.datetime.now()

for i, row in df_atleti.iterrows():
    if i < 1: continue
    nome = str(row.iloc[0]).upper().strip() if not pd.isna(row.iloc[0]) else ""
    if not nome or nome == 'NOME E COGNOME': continue
    
    foto = str(row.iloc[1]) if not pd.isna(row.iloc[1]) else ""
    cintura = str(row.iloc[3]).upper().strip() if not pd.isna(row.iloc[3]) else "BIANCA"
    dataUltima = mapUltimaPromozione.get(nome)
    
    strDataUltima = "--/--/----"
    mesiPassati = 0
    if dataUltima and dataUltima.timestamp() > 0:
        strDataUltima = dataUltima.strftime("%d/%m/%Y")
        diffTime = (oggi - dataUltima).days
        mesiPassati = math.floor(diffTime / 30.416)
        
    datiPres = mapPresenze.get(nome, {'tot': 0, 'ultimoAllenamento': None})
    lezioniFatte = datiPres['tot']
    targetBase = targetCinture.get(cintura, 100)
    malus = mapLezioniExtra.get(nome, 0)
    targetTotale = targetBase + malus
    
    strUltimoAllenamento = "--/--/----"
    if datiPres['ultimoAllenamento']:
        strUltimoAllenamento = datiPres['ultimoAllenamento'].strftime("%d/%m/%Y")

    risultati.push({
        'nome': nome,
        'fotoUrl': foto,
        'cintura': cintura,
        'dataUltimaCintura': strDataUltima,
        'mesiTrascorsi': mesiPassati,
        'presenzeDalGrado': lezioniFatte,
        'targetBase': targetBase,
        'malus': malus,
        'targetTotale': targetTotale,
        'idoneo': lezioniFatte >= targetTotale,
        'ultimoAllenamento': strUltimoAllenamento
    })

print(len(risultati))
