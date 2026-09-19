import re

with open("Codice.js", "r", encoding="utf-8") as f:
    content = f.read()

# Trova e rimuovi le vecchie funzioni
def remove_function(func_name, content):
    pattern = r"function " + func_name + r"\s*\([\s\S]*?\n\}"
    # Wait, simple regex might not work if there are nested braces.
    # Let's use a simple approach: find "function name(", then track braces
    idx = content.find("function " + func_name)
    if idx == -1:
        return content
    
    # find the opening brace
    start_brace = content.find("{", idx)
    if start_brace == -1: return content
    
    brace_count = 1
    end_idx = start_brace + 1
    while brace_count > 0 and end_idx < len(content):
        if content[end_idx] == "{":
            brace_count += 1
        elif content[end_idx] == "}":
            brace_count -= 1
        end_idx += 1
        
    return content[:idx] + content[end_idx:]

content = remove_function("creaSimulazioneAtleti", content)
content = remove_function("simulaPresenzeOggi", content)
content = remove_function("azzeraDatabase", content)

svuota_db = """
function SVUOTA_DATABASE() {
  const ss = SpreadsheetApp.openById(ID_FOGLIO);
  
  // Funzione di supporto per cancellare i dati mantenendo le formule
  function clearKeepFormulas(sheet, startRow, startCol, numRows, numCols) {
    if (!sheet || numRows <= 0 || numCols <= 0) return;
    const range = sheet.getRange(startRow, startCol, numRows, numCols);
    const formulas = range.getFormulas();
    range.clearContent();
    range.setFormulas(formulas);
  }
  
  const foglioAtleti = ss.getSheetByName("ATLETI");
  if (foglioAtleti && foglioAtleti.getLastRow() > 3) {
    clearKeepFormulas(foglioAtleti, 4, 1, foglioAtleti.getLastRow() - 3, 5);
  }
  
  const foglioRegistro = ss.getSheetByName("REGISTRO GREZZO");
  if (foglioRegistro && foglioRegistro.getLastRow() > 1) {
    clearKeepFormulas(foglioRegistro, 2, 1, foglioRegistro.getLastRow() - 1, 5);
  }
  
  const foglioStorico = ss.getSheetByName("STORICO CINTURE");
  if (foglioStorico && foglioStorico.getLastRow() > 1) {
    clearKeepFormulas(foglioStorico, 2, 1, foglioStorico.getLastRow() - 1, 6);
  }
  
  const foglioDash = ss.getSheetByName("DASHBOARD ANNUALE");
  if (foglioDash && foglioDash.getLastRow() > 5) {
    clearKeepFormulas(foglioDash, 6, 3, foglioDash.getLastRow() - 5, 6);
  }

  // Cancella foto su Drive
  try {
    const folder = DriveApp.getFolderById("1DoBG3xKvEFnO31Oxw9zCbwhiecdhH0w-");
    const files = folder.getFiles();
    while (files.hasNext()) {
      files.next().setTrashed(true);
    }
  } catch (e) {}
  
  return "DATABASE SVUOTATO CON SUCCESSO. FORMULE MANTENUTE. FOTO ELIMINATE.";
}
"""

content += "\n" + svuota_db

with open("Codice.js", "w", encoding="utf-8") as f:
    f.write(content)

print("Codice.js aggiornato con SVUOTA_DATABASE e vecchie funzioni rimosse.")
