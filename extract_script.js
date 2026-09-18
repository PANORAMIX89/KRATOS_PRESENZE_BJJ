const fs = require('fs');

const html = fs.readFileSync('Maestro.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);

if (scriptMatch) {
    fs.writeFileSync('test_maestro.js', scriptMatch[1]);
    console.log("Extracted script");
} else {
    console.log("No script tag found");
}
