const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Asegúrate de que la carpeta exista
const carpeta = path.join(__dirname, '..', 'fotos');
if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, carpeta);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const nombreArchivo = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, nombreArchivo);
  }
});

const upload = multer({ storage });


module.exports = upload;

