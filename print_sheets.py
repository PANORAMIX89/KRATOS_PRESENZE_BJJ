import pandas as pd

try:
    xl = pd.ExcelFile('KRATOS_PRESENZE_BJJ.xlsx')
    print("Sheets in Excel:")
    for name in xl.sheet_names:
        print(f"'{name}'")
except Exception as e:
    print("Error:", e)
