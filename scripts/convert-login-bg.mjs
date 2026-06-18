import sharp from "sharp";

const input = "public/images/login/source/backgroug.png";
const output = "public/images/login/background.webp";

await sharp(input)
  .resize({ width: 1920, withoutEnlargement: true })
  .webp({ quality: 82 })
  .toFile(output);

console.log(`Background convertido: ${output}`);
