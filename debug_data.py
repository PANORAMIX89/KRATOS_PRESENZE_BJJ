import pandas as pd
import math

df_atleti = pd.read_excel('KRATOS_PRESENZE_BJJ.xlsx', sheet_name='ATLETI')
df_storico = pd.read_excel('KRATOS_PRESENZE_BJJ.xlsx', sheet_name='STORICO CINTURE')
df_registro = pd.read_excel('KRATOS_PRESENZE_BJJ.xlsx', sheet_name='REGISTRO GREZZO')

# Print lengths
print("Atleti length:", len(df_atleti))
print("Storico length:", len(df_storico))
print("Registro length:", len(df_registro))

print("Atleti rows:")
for i, row in df_atleti.iterrows():
    print(i, row.tolist())

print("\nStorico rows:")
for i, row in df_storico.iterrows():
    print(i, row.tolist())
    if i > 10: break
