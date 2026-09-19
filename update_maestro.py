import base64
import re

with open(r'C:\Users\boron\.gemini\antigravity-ide\brain\a471f4f3-5035-4dbb-a876-a223808c3658\.user_uploaded\media_1789780189723.jpg', 'rb') as f:
    b64_img = base64.b64encode(f.read()).decode('utf-8')

with open('Maestro.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update the loginView CSS
css_old = r"#loginView \{ display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; width: 100%; padding: 20px; background-color: #111827; \}"
css_new = f"""#loginView {{ 
    display: flex; flex-direction: column; align-items: center; justify-content: flex-end; 
    min-height: 100vh; width: 100%; padding: 20px; 
    background-image: url('data:image/jpeg;base64,{b64_img}');
    background-size: cover; background-position: center;
}}"""

content = re.sub(css_old, css_new, content)

# 2. Update the loginView HTML structure
html_old = r"""<div id="loginView">
      <img src="https://lh3.googleusercontent.com/d/1-wRsEAvdsK5BGbBoeZlPIqi4SqIDcHrL" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid #d35400; margin: 0 auto 20px auto; display: block;" alt="Maestro">
      <div class="header-dash" style="justify-content:center;">
        <h2>AREA MAESTRO</h2>
      </div>
      <input type="password" id="pinInput" class="pin-input" placeholder="    " maxlength="4" pattern="\[0-9\]\*" inputmode="numeric">
      <button class="btn-login" id="btnLogin" onclick="effettuaLogin\(\)">Accedi</button>
      <div id="loginError" class="error-msg"></div>
    </div>"""

html_new = """<div id="loginView" style="position: relative;">
      <div style="flex: 1;"></div>
      
      <div style="width: 100%; max-width: 320px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding-bottom: 20px;">
          <img src="https://lh3.googleusercontent.com/d/1-wRsEAvdsK5BGbBoeZlPIqi4SqIDcHrL" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid #d35400; margin: 0 auto 10px auto; display: block; z-index: 2; box-shadow: 0 4px 10px rgba(0,0,0,0.5);" alt="Maestro">
          
          <div class="header-dash" style="justify-content:center; background: rgba(0,0,0,0.6); padding: 5px 15px; border-radius: 8px; margin-bottom: 10px; width: 100%; box-sizing: border-box;">
            <h2 style="margin:0; text-align: center;">AREA MAESTRO</h2>
          </div>
          <input type="password" id="pinInput" class="pin-input" placeholder="    " maxlength="4" pattern="[0-9]*" inputmode="numeric" style="margin-top: 0; margin-bottom: 15px;">
          <button class="btn-login" id="btnLogin" onclick="effettuaLogin()">Accedi</button>
          <div id="loginError" class="error-msg"></div>
      </div>
    </div>"""

# Safely replace HTML block
idx = content.find('<div id="loginView">')
end_idx = content.find('</div>', content.find('<div id="loginError"', idx)) + 6
if idx != -1 and end_idx != -1:
    content = content[:idx] + html_new + content[end_idx:]

# 3. Add the ultimate fix for bouncing checkbox
js_to_insert = """
        // Se c'è almeno una spunta tolta, blocchiamo il rendering per non sovrascrivere!
        if (document.querySelectorAll('.checkbox-appello:not(:checked)').length > 0) {
            document.getElementById('loadingDash').classList.add('hidden');
            return;
        }
"""
# insert at the beginning of mostraDati
content = content.replace("function mostraDati(dati) {\n        document.getElementById('loadingDash').classList.add('hidden');", 
                          "function mostraDati(dati) {" + js_to_insert + "\n        document.getElementById('loadingDash').classList.add('hidden');")

with open('Maestro.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done.")
