const https = require("https");

// Configuración
const PROJECT_ID = "khaleesy-system"; // Ajusta si es diferente
const REGION = "us-central1";
const FUNCTION_NAME = "createInvoice";

// URL de la función (ajusta si usas emulador local)
// const URL = `http://127.0.0.1:5001/${PROJECT_ID}/${REGION}/${FUNCTION_NAME}`;
const URL = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/${FUNCTION_NAME}`;

// Datos de prueba (Factura B a Consumidor Final)
// NOTA: El backend espera la estructura "plana" de AFIP, no el objeto complejo del frontend.
const payload = {
  data: {
    sucursalId: "SUCURSAL_ID_TEST", // Reemplaza con una ID real si es necesario
    ptoVta: 1,
    cbteTipo: 6, // 1=Factura A, 6=Factura B, 11=Factura C
    concepto: 1, // 1=Productos
    docTipo: 99, // 99=Consumidor Final, 80=CUIT, 96=DNI
    docNro: 0, // 0 para Consumidor Final sin identificar
    importeTotal: 121.0,
    importeNeto: 100.0,
    importeIva: 21.0,
    importeExento: 0,
    // Fechas solo si concepto > 1
  },
};

// Token de autenticación (Necesitas un ID Token válido de Firebase Auth)
// Puedes obtenerlo imprimiéndolo desde el frontend: console.log(await auth.currentUser.getIdToken())
const ID_TOKEN = "PEGA_TU_ID_TOKEN_AQUI";

if (ID_TOKEN === "PEGA_TU_ID_TOKEN_AQUI") {
  console.error(
    "ERROR: Debes pegar un ID Token válido en el script para probar."
  );
  console.log("Tip: En el frontend, abre la consola y ejecuta:");
  console.log("await firebase.auth().currentUser.getIdToken()");
  process.exit(1);
}

const options = {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ID_TOKEN}`,
  },
};

const req = https.request(URL, options, (res) => {
  let data = "";

  console.log(`Status Code: ${res.statusCode}`);

  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    try {
      const json = JSON.parse(data);
      console.log("Respuesta:", JSON.stringify(json, null, 2));
    } catch (e) {
      console.log("Respuesta (texto):", data);
    }
  });
});

req.on("error", (error) => {
  console.error("Error:", error);
});

req.write(JSON.stringify(payload));
req.end();
