const express = require('express');
const path = require('path');
const { generarTodasLasImagenes } = require('./generador')

const app = express();
const PORT = 3000;
require('dotenv').config();

app.use(express.static('public'));

app.get('/', (_, res) => {
    res.send(`
    <html>
      <body style="text-align:center; background:#000; color:snow;">
        <h1>Vista previa: Lunes - Cross</h1>
        <img src="/preview.jpg?${Date.now()}" />
        <p>Presioná F5 para recargar la imagen</p>
      </body>
    </html>
    `)
})
app.get('/generar', async (req, res) => {
    try {
        await generarTodasLasImagenes();
        res.json({ mensaje: '✅ imagenes correctamente generadas' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: '❌ error al generar imagenes' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
