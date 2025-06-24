const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');
const { createCanvas, registerFont } = require('canvas');
const { loadImage } = require('canvas');
const path = require('path')
require('dotenv').config();



const carpeta = path.join(__dirname, 'imagenes');
if (!fs.existsSync(carpeta)) {
    fs.mkdirSync(carpeta)
}
const SPREADSHEET_ID = '10UkDEN6ZN2gTwwg9L5Ly_Exwx9-F8Lx1_WJ5cHXRDo8'; // tu ID real
const HOJA = "'Junio Sem 4'";

// Registro la fuente
registerFont('./fonts/BebasNeue-Regular.ttf', { family: 'Bebas Neue' });


//rangos de la planilla
const rangosPorDiaYClase = {
    Lunes: {
        Cross: 'A2:D22',
        Funcional: 'A24:D44',
        Cardio: 'A46:D66',
    },
    Martes: {
        Cross: 'E2:H22',
        Funcional: 'E24:H44',
        Cardio: 'E46:H66',
    },
    Miércoles: {
        Cross: 'I2:L22',
        Funcional: 'I24:L44',
        Cardio: 'I46:L66',
    },
    Jueves: {
        Cross: 'M2:P22',
        Funcional: 'M24:P44',
        Cardio: 'M46:P66',
    },
    Viernes: {
        Cross: 'Q2:T22',
        Funcional: 'Q24:T44',
        Cardio: 'Q46:T66',
    },
    Sábado: {
        Cross: 'U2:X22',
        Funcional: 'U24:X44',
        // Sábado no tiene Cardio
    }
};
const coloresPorClase = {
    Cross: '#233dff',    // azul
    Cardio: '#01cbf4',   // celeste
    Funcional: '#ff0000' // rojo

};

// 1. Leer datos desde Google Sheets (array de filas)
async function leerDatosDesdeGoogleSheet(rango) {
    const auth = new GoogleAuth({
        keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        scopes: [process.env.SCOPES],
    });

    const authClient = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });

    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${HOJA}!${rango}`,
    });

    return res.data.values || [];
}

async function generarImagenParaDiaYClase(dia, clase, rango) {

    const colorClase = coloresPorClase[clase] || 'snow'; // color por defecto
    const datos = await leerDatosDesdeGoogleSheet(rango);

    if (!datos || datos.length === 0) {
        console.log(`No hay datos para ${dia} - ${clase}`);
        return;
    }

    const canvas = createCanvas(1080, 1920);
    const ctx = canvas.getContext('2d');

    const nombreFondo = `${clase.charAt(0).toUpperCase() + clase.slice(1).toLowerCase()}.jpg`;
    const rutaFondo = path.join(__dirname, 'public', 'image', nombreFondo);

    try {
        const fondo = await loadImage(rutaFondo);
        ctx.drawImage(fondo, 0, 0, 1080, 1920);
    } catch (error) {
        console.warn(`⚠️ No se pudo cargar el fondo para ${clase}, se usará fondo liso`);
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, 1080, 1920);
    }

    const palabrasClave = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'STRENGTH', 'CARDIO', 'FUNCIONAL', 'CROSS', 'WOD', 'BLOQUE', 'FUERZA', 'OLY', 'METABOLICO'];

    function medirAnchoLinea(ctx, texto, palabrasClave) {
        const palabras = texto.split(' ');
        let anchoTotal = 0;

        for (const palabra of palabras) {
            const palabraSinPunt = palabra.replace(/[.,]/g, '').toUpperCase();

            if (palabrasClave.includes(palabraSinPunt)) {
                ctx.font = 'bold 75px "Bebas Neue"';
            } else {
                ctx.font = '55px "Bebas Neue"';
            }
            const width = ctx.measureText(palabra).width;
            anchoTotal += width + 10; // sumo espacio entre palabras
        }
        return anchoTotal;
    }



    function dibujarLineaConDestacados(ctx, texto, y, palabrasClave) {
        const palabras = texto.split(' ');
        const paddingHorizontal = 35; // espacio extra a los lados del texto dentro del rectángulo

        // Primero calculo ancho total para centrar
        const anchoTotal = medirAnchoLinea(ctx, texto, palabrasClave);

        let cursorX = (ctx.canvas.width - anchoTotal) / 2;

        for (const palabra of palabras) {
            const palabraSinPunt = palabra.replace(/[.,]/g, '').toUpperCase();

            if (palabrasClave.includes(palabraSinPunt)) {
                ctx.font = 'bold 75px "Bebas Neue"';
                const width = ctx.measureText(palabra).width;

                const xRect = cursorX - paddingHorizontal; // para centrar la palabra en el rectángulo
                const widthRect = width + paddingHorizontal * 2; // ancho total del rectángulo
                ctx.fillStyle = colorClase;
                ctx.fillRect(xRect, y - 60, widthRect, 80);


                ctx.fillStyle = 'snow';
                ctx.fillText(palabra, cursorX, y);

                cursorX += width + 25;
            } else {
                ctx.font = '55px "Bebas Neue"';
                const width = ctx.measureText(palabra).width;
                ctx.fillStyle = 'snow';
                ctx.fillText(palabra, cursorX, y);

                cursorX += width + 10;
            }
        }
    }

    //como usarlo:
    let y = 450;

    for (const fila of datos) {
        const texto = fila.join(' ').trim();
        if (texto) {
            dibujarLineaConDestacados(ctx, texto, y, palabrasClave);
            y += 90;
        }
    }

    //guardo las imagenes

    const nombreArchivo = path.join(carpeta, `${dia.toLowerCase()}_${clase.toLowerCase()}.jpg`);
    const buffer = canvas.toBuffer('image/jpeg');
    fs.writeFileSync(nombreArchivo, buffer);

    if (dia === 'Lunes' && clase === 'Cross') {
        const previewPath = path.join(__dirname, 'public', 'preview.jpg');
        fs.writeFileSync(previewPath, buffer);
        console.log(`✅ Imagen de preview guardada en: ${previewPath}`);
    }

    console.log(`✅ Imagen generada: ${nombreArchivo}`);
}

async function generarTodasLasImagenes() {
    for (const dia in rangosPorDiaYClase) {
        const clases = rangosPorDiaYClase[dia];
        for (const clase in clases) {
            const rango = clases[clase];
            await generarImagenParaDiaYClase(dia, clase, rango);
        }
    }
}

module.exports = { generarTodasLasImagenes };
