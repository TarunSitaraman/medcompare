const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

// Icon SVG — navy gradient bg, white pill+arrow logo centered
const iconSvg = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1024" y2="1024" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#1a3565"/>
      <stop offset="100%" stop-color="#2a6db5"/>
    </linearGradient>
  </defs>
  <!-- Background -->
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <!-- Left pill -->
  <rect x="238" y="308" width="220" height="408" rx="110" fill="white" opacity="0.95"/>
  <!-- Right pill -->
  <rect x="418" y="308" width="220" height="408" rx="110" fill="white" opacity="0.72"/>
  <!-- Overlap blend -->
  <rect x="418" y="308" width="40" height="408" fill="white" opacity="0.22"/>
  <!-- Arrow (savings direction) -->
  <line x1="570" y1="512" x2="768" y2="512" stroke="white" stroke-width="44" stroke-linecap="round" opacity="0.92"/>
  <polyline points="680,420 768,512 680,604" fill="none" stroke="white" stroke-width="44" stroke-linecap="round" stroke-linejoin="round" opacity="0.92"/>
</svg>`

// Splash SVG — same gradient, smaller logo, tagline
const splashSvg = `<svg width="2732" height="2732" viewBox="0 0 2732 2732" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="2732" y2="2732" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#1a3565"/>
      <stop offset="100%" stop-color="#2a6db5"/>
    </linearGradient>
  </defs>
  <rect width="2732" height="2732" fill="url(#bg)"/>
  <!-- Icon centered, 360px tall -->
  <rect x="1096" y="1086" width="165" height="306" rx="83" fill="white" opacity="0.95"/>
  <rect x="1231" y="1086" width="165" height="306" rx="83" fill="white" opacity="0.72"/>
  <rect x="1231" y="1086" width="30" height="306" fill="white" opacity="0.22"/>
  <line x1="1346" y1="1239" x2="1496" y2="1239" stroke="white" stroke-width="33" stroke-linecap="round" opacity="0.92"/>
  <polyline points="1420,1190 1496,1239 1420,1288" fill="none" stroke="white" stroke-width="33" stroke-linecap="round" stroke-linejoin="round" opacity="0.92"/>
</svg>`

async function generate() {
  const iconOut = path.join(__dirname, '..', 'assets', 'icon', 'icon.png')
  const splashOut = path.join(__dirname, '..', 'assets', 'splash', 'splash.png')

  console.log('Generating icon...')
  await sharp(Buffer.from(iconSvg)).png().toFile(iconOut)
  console.log('✓ assets/icon/icon.png')

  console.log('Generating splash...')
  await sharp(Buffer.from(splashSvg)).png().toFile(splashOut)
  console.log('✓ assets/splash/splash.png')
}

generate().catch(console.error)
