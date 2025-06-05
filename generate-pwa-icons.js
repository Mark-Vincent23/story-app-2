const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const imagesDirPath = path.resolve(__dirname, 'src/public/images');

// Create directory if it doesn't exist
if (!fs.existsSync(imagesDirPath)) {
  fs.mkdirSync(imagesDirPath, { recursive: true });
}

// Source logo file (assuming logo.png exists in the images directory)
const sourceLogoPath = path.resolve(__dirname, 'src/public/images/logo.png');

// Icon sizes for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Generate icons
sizes.forEach((size) => {
  sharp(sourceLogoPath)
    .resize(size, size)
    .toFile(path.resolve(imagesDirPath, `logo-${size}x${size}.png`))
    .then(() => console.log(`Generated ${size}x${size} icon`))
    .catch((err) => console.error(`Error generating ${size}x${size} icon:`, err));
});

console.log('PWA icons generation complete!');
