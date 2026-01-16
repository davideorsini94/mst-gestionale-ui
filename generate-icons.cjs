const fs = require('fs');
const path = require('path');

// Crea un'icona SVG semplice
const createSVGIcon = (size) => `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#1e40af"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.3}" 
        fill="white" text-anchor="middle" dominant-baseline="middle" font-weight="bold">
    MST
  </text>
</svg>
`;

// Salva le icone SVG (che funzionano anche come PNG placeholder)
const publicDir = path.join(__dirname, 'public');

// Crea icona 192x192
fs.writeFileSync(
    path.join(publicDir, 'icon-192.svg'),
    createSVGIcon(192)
);

// Crea icona 512x512
fs.writeFileSync(
    path.join(publicDir, 'icon-512.svg'),
    createSVGIcon(512)
);

// Crea apple touch icon
fs.writeFileSync(
    path.join(publicDir, 'apple-touch-icon.svg'),
    createSVGIcon(180)
);

console.log('✓ Icone SVG create con successo!');
console.log('⚠ IMPORTANTE: Sostituisci icon-192.png, icon-512.png e apple-touch-icon.png');
console.log('  con le tue icone PNG reali per una migliore compatibilità.');
