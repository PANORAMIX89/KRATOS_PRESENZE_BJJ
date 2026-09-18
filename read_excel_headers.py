import pandas as pd

df_storico = pd.read_excel('KRATOS_PRESENZE_BJJ.xlsx', sheet_name='STORICO CINTURE')
print("STORICO CINTURE:")
print(df_storico.head(5))
