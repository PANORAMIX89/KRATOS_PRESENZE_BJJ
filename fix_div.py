with open("Maestro.html", "r", encoding="utf-8") as f:
    content = f.read()

# Trova il pezzo doppio
bad_part = """      </div>
    </div>
    </div>"""

good_part = """      </div>
    </div>"""

if bad_part in content:
    content = content.replace(bad_part, good_part)
    with open("Maestro.html", "w", encoding="utf-8") as f:
        f.write(content)
    print("Doppio div rimosso.")
else:
    print("Non trovato doppio div.")
