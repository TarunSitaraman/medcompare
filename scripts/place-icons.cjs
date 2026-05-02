const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const ROOT = path.join(__dirname, '..')
const ANDROID_RES = path.join(ROOT, 'android', 'app', 'src', 'main', 'res')
const ICON_SRC = path.join(ROOT, 'assets', 'icon', 'icon.png')
const SPLASH_SRC = path.join(ROOT, 'assets', 'splash', 'splash.png')

const ICON_SIZES = [
  { dir: 'mipmap-mdpi',    size: 48  },
  { dir: 'mipmap-hdpi',    size: 72  },
  { dir: 'mipmap-xhdpi',   size: 96  },
  { dir: 'mipmap-xxhdpi',  size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
]

// Splash: cropped to each density's natural canvas (Capacitor uses a single drawable)
const SPLASH_SIZE = 1024

async function run() {
  // Icons
  for (const { dir, size } of ICON_SIZES) {
    const dest = path.join(ANDROID_RES, dir)
    fs.mkdirSync(dest, { recursive: true })
    await sharp(ICON_SRC).resize(size, size).png().toFile(path.join(dest, 'ic_launcher.png'))
    await sharp(ICON_SRC).resize(size, size).png().toFile(path.join(dest, 'ic_launcher_round.png'))
    // Foreground layer for adaptive icons (same image, padded slightly)
    await sharp(ICON_SRC).resize(Math.round(size * 0.7), Math.round(size * 0.7))
      .extend({ top: Math.round(size * 0.15), bottom: Math.round(size * 0.15), left: Math.round(size * 0.15), right: Math.round(size * 0.15), background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png().toFile(path.join(dest, 'ic_launcher_foreground.png'))
    console.log(`✓ ${dir} (${size}px)`)
  }

  // Splash — single drawable used by Capacitor splash-screen
  const splashDirs = ['drawable', 'drawable-land-hdpi', 'drawable-port-hdpi', 'drawable-land-mdpi', 'drawable-port-mdpi']
  for (const d of splashDirs) {
    const dest = path.join(ANDROID_RES, d)
    fs.mkdirSync(dest, { recursive: true })
    await sharp(SPLASH_SRC).resize(SPLASH_SIZE, SPLASH_SIZE, { fit: 'cover' }).png().toFile(path.join(dest, 'splash.png'))
    console.log(`✓ ${d}/splash.png`)
  }

  console.log('\nAll done.')
}

run().catch(console.error)
