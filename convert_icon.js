const fs = require('fs');
const path = require('path');

// Simple script to read a PNG and write it as a basic ICO file.
// ICO files are basically just the PNG data with a 22-byte header attached.

async function convertPngToIco() {
    try {
        const pngPath = path.join(__dirname, 'protrack_logo_transparent.png');
        const icoPath = path.join(__dirname, 'protrack_final_icon.ico');

        if (!fs.existsSync(pngPath)) {
            console.error("Source PNG not found at:", pngPath);
            return;
        }

        const pngData = fs.readFileSync(pngPath);
        
        // Basic dimensions (assuming it's roughly square and fits within 256x256 max standard for basic ICOs)
        // We will just claim it's a 256x256 image for the ICO header, which Windows scales.
        const width = 0; // 0 means 256
        const height = 0; // 0 means 256

        // ICO Header (6 bytes) + ICONDIRENTRY (16 bytes)
        const header = Buffer.alloc(22);
        
        // 1. Reserved (always 0)
        header.writeUInt16LE(0, 0);
        // 2. Type (1 for icon)
        header.writeUInt16LE(1, 2);
        // 3. Count (1 image)
        header.writeUInt16LE(1, 4);
        
        // 4. Width
        header.writeUInt8(width, 6);
        // 5. Height
        header.writeUInt8(height, 7);
        // 6. Color count (0 = >= 8bpp)
        header.writeUInt8(0, 8);
        // 7. Reserved (0)
        header.writeUInt8(0, 9);
        // 8. Color planes (1)
        header.writeUInt16LE(1, 10);
        // 9. Bit count (32 bits for RGBA)
        header.writeUInt16LE(32, 12);
        // 10. Image size (number of bytes in the PNG)
        header.writeUInt32LE(pngData.length, 14);
        // 11. Image offset (where the PNG data starts, which is immediately after this 22-byte header)
        header.writeUInt32LE(22, 18);

        // Concatenate header and PNG data
        const icoData = Buffer.concat([header, pngData]);

        fs.writeFileSync(icoPath, icoData);
        console.log(`Successfully created ${icoPath}`);
        
    } catch (err) {
        console.error("Failed to convert icon:", err);
    }
}

convertPngToIco();
