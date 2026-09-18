import pandas as pd

df = pd.read_excel('KRATOS_PRESENZE_BJJ.xlsx', sheet_name='ATLETI')
print("ATLETI:")
print(df.head(5))
