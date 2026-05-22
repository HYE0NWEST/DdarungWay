import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const svgFile = path.join(__dirname, 'public', 'favicon.svg');
const publicDir = path.join(__dirname, 'public');

async function generateIcons() {
  try {
    const svgBuffer = fs.readFileSync(svgFile);
    
    // Generate 192x192 icon
    await sharp(svgBuffer)
      .resize(192, 192)
      .toFile(path.join(publicDir, 'icon-192x192.png'));
    console.log('Generated icon-192x192.png');

    // Generate 512x512 icon
    await sharp(svgBuffer)
      .resize(512, 512)
      .toFile(path.join(publicDir, 'icon-512x512.png'));
    console.log('Generated icon-512x512.png');

    // Generate apple-touch-icon (usually 180x180, solid background recommended, but transparent is okay if the SVG has it)
    await sharp(svgBuffer)
      .resize(180, 180)
      .flatten({ background: { r: 255, g: 255, b: 255 } }) // White background for iOS
      .toFile(path.join(publicDir, 'apple-touch-icon.png'));
    console.log('Generated apple-touch-icon.png');
    
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons();
