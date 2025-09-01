const admin = require("firebase-admin");
const { MercadoPagoConfig, Preference, Payment } = require("mercadopago");
const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { defineSecret } = require("firebase-functions/params"); // <-- necesario para secrets

admin.initializeApp();
const db = admin.firestore();

// Secret de Gemini (configurado con `firebase functions:secrets:set GEMINI_KEY`)
const GEMINI_KEY = defineSecret("GEMINI_KEY");
const MERCADOPAGO_ACCESS_TOKEN = defineSecret("MERCADOPAGO_ACCESS_TOKEN"); // <-- AÑADE ESTA LÍNEA

// =======================
// Funciones de administración
// =======================
exports.addAdminRole = onCall(async (request) => {
  if (!request.auth || request.auth.token.admin !== true) {
    throw new HttpsError("permission-denied", "Solo un administrador puede realizar esta acción.");
  }
  const email = request.data.email;
  if (!email || typeof email !== "string") {
    throw new HttpsError("invalid-argument", "El email debe ser proporcionado y ser un texto válido.");
  }
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    return { message: `Éxito! El usuario ${email} ahora es administrador.` };
  } catch (err) {
    console.error("Error al asignar rol de admin:", err);
    throw new HttpsError("internal", "Ocurrió un error al intentar asignar el rol.");
  }
});

exports.listAllUsers = onCall(async (request) => {
  if (!request.auth || request.auth.token.admin !== true) {
    throw new HttpsError("permission-denied", "Solo un administrador puede realizar esta acción.");
  }
  try {
    const userRecords = await admin.auth().listUsers(1000);
    const promises = userRecords.users.map(async (user) => {
      const userDocRef = db.collection("datosNegocio").doc(user.uid);
      const userDoc = await userDocRef.get();
      return {
        uid: user.uid,
        email: user.email,
        fechaCreacion: user.metadata.creationTime,
        ultimoLogin: user.metadata.lastSignInTime,
        datosNegocio: userDoc.exists
          ? userDoc.data()
          : { subscriptionStatus: "desconocido", subscriptionEndDate: null },
      };
    });
    const usersData = await Promise.all(promises);
    return usersData;
  } catch (error) {
    console.error("Error al listar usuarios:", error);
    throw new HttpsError("internal", "No se pudo obtener la lista de usuarios.");
  }
});

exports.getUserDetails = onCall(async (request) => {
  if (!request.auth || request.auth.token.admin !== true) {
    throw new HttpsError("permission-denied", "Solo un administrador puede ver los detalles.");
  }
  const userId = request.data.userId;
  if (!userId) {
    throw new HttpsError("invalid-argument", "Se requiere un ID de usuario.");
  }
  try {
    const collectionsToFetch = ["productos", "clientes", "ventas", "notas_cd"];
    const promises = collectionsToFetch.map((col) => db.collection(col).where("userId", "==", userId).get());
    const [productosSnap, clientesSnap, ventasSnap, notasCDSnap] = await Promise.all(promises);
    const getData = (snapshot) => snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return {
      productos: getData(productosSnap),
      clientes: getData(clientesSnap),
      ventas: getData(ventasSnap),
      notasCD: getData(notasCDSnap),
    };
  } catch (error) {
    console.error("Error al obtener detalles del usuario:", error);
    throw new HttpsError("internal", "No se pudo obtener los detalles del usuario.");
  }
});

exports.updateUserSubscription = onCall(async (request) => {
  if (!request.auth || request.auth.token.admin !== true) {
    throw new HttpsError("permission-denied", "Solo un administrador puede modificar suscripciones.");
  }
  const { userId, newStatus } = request.data;
  if (!userId || !["active", "trial", "expired"].includes(newStatus)) {
    throw new HttpsError("invalid-argument", "Faltan datos o el nuevo estado es inválido.");
  }
  try {
    const userDocRef = db.collection("datosNegocio").doc(userId);
    const updates = { subscriptionStatus: newStatus };
    if (newStatus === "active") {
      const newEndDate = new Date();
      newEndDate.setDate(newEndDate.getDate() + 30);
      updates.subscriptionEndDate = newEndDate;
    }
    await userDocRef.update(updates);
    return { success: true, message: `Usuario actualizado a estado '${newStatus}'.` };
  } catch (error) {
    console.error("Error al actualizar la suscripción:", error);
    throw new HttpsError("internal", "No se pudo actualizar la suscripción del usuario.");
  }
});

// =======================
// Actualización masiva de productos
// =======================
exports.bulkUpdateProducts = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes estar autenticado para realizar esta acción.");
  }

  const productsToUpdate = request.data.products;
  if (!productsToUpdate || !Array.isArray(productsToUpdate) || productsToUpdate.length === 0) {
    throw new HttpsError("invalid-argument", "No se proporcionaron productos para actualizar.");
  }

  const batch = db.batch();

  productsToUpdate.forEach((product) => {
    if (!product.id || (product.precio === undefined && product.stock === undefined)) {
      return;
    }
    const productRef = db.collection("productos").doc(product.id);
    const updateData = {};
    if (product.precio !== undefined && product.precio !== null) {
      updateData.precio = Number(product.precio);
    }
    if (product.stock !== undefined && product.stock !== null) {
      updateData.stock = Number(product.stock);
    }

    if (Object.keys(updateData).length > 0) {
      batch.update(productRef, updateData);
    }
  });

  try {
    await batch.commit();
    return { success: true, message: `Se procesaron ${productsToUpdate.length} productos.` };
  } catch (error) {
    console.error("Error en la actualización masiva:", error);
    throw new HttpsError("internal", "Ocurrió un error al actualizar los productos.");
  }
});
// ===== Límite diario por usuario: 10 llamadas por día, hora local de Argentina =====
const TZ = "America/Argentina/Cordoba";

// Devuelve la fecha local AAAA-MM-DD (Córdoba) para “cortar” el día correctamente
function getLocalDateKey() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Cordoba",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }); // => "YYYY-MM-DD"
}


// Incrementa el contador del día y lanza error si supera el límite
async function enforceDailyLimit(uid, maxPerDay = 10) {
  const dateKey = getLocalDateKey(); // p.ej. "2025-08-19"
  const docId = `${uid}_${dateKey}`;
  const ref = db.collection("_usage_daily").doc(docId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : { count: 0, date: dateKey };
    const next = (data.count || 0) + 1;

    if (next > maxPerDay) {
      throw new HttpsError(
        "resource-exhausted",
        "Alcanzaste tu límite diario de 10 consultas. Probá nuevamente mañana."
      );
    }

    tx.set(
      ref,
      {
        count: admin.firestore.FieldValue.increment(1),
        date: dateKey,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });
}


// =======================
// Chat con Gemini (Gen2 + Secret + modelo vigente)
// =======================
const MODEL_NAME = "gemini-1.5-flash";
const TOPIC_KEYWORDS = [
  "pago","pagos","venta","ventas","comprobante","boleta","ticket","factura","imprimir","reimprimir",
  "nota de credito","nota de crédito","nota de debito","nota de débito","devolucion","devolución","reembolso",
  "suscripcion","suscripción","plan","tarjeta","medios de pago","actualizar tarjeta","aprobado","pendiente","rechazado"
];
function isInScope(prompt = "") {
  const p = String(prompt).toLowerCase();
  return TOPIC_KEYWORDS.some(k => p.includes(k));
}
const OOS_MESSAGE = "Puedo ayudarte solo con temas del sistema de pagos Khaleesi (comprobantes, facturas, notas C/D, ventas, reembolsos, suscripciones, medios de pago, etc.). Por favor, reformulá tu pregunta en ese contexto.";

// functions/index.js

exports.askGemini = onCall({ secrets: [GEMINI_KEY] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes estar autenticado para usar el chat.");
  }

  const userPrompt = request.data?.prompt;
  const userId = request.auth.uid;

  if (!userPrompt || typeof userPrompt !== "string") {
    throw new HttpsError("invalid-argument", "Se requiere una pregunta válida.");
  }

  await enforceDailyLimit(userId, 10);

  try {
    const apiKey = GEMINI_KEY.value();
    if (!apiKey) {
      throw new HttpsError("internal", "La clave de API de Gemini no está configurada en el servidor.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    let finalPrompt = userPrompt;
    let context = "";

    const stockKeywords = ["stock", "inventario", "cuánto hay", "cuantos quedan", "disponible"];
    const isStockQuery = stockKeywords.some(k => userPrompt.toLowerCase().includes(k));

    if (isStockQuery) {
      console.log(`[Usuario: ${userId}] Intención detectada: Consulta de Stock.`);

      const words = userPrompt.split(' ');
      const productNameIndex = words.findIndex(w => w.toLowerCase() === 'producto' || w.toLowerCase() === 'de') + 1;
      const productName = words.slice(productNameIndex).join(' ').replace(/[?¿!¡]/g, '');

      if (productName) {
        const productsRef = db.collection('productos');
        const query = productsRef.where('userId', '==', userId).where('nombre', '==', productName);
        const productSnapshot = await query.get();

        if (!productSnapshot.empty) {
          const productData = productSnapshot.docs[0].data();
          context = `Contexto de la base de datos: El producto "${productData.nombre}" tiene un stock de ${productData.stock} unidades.`;
        } else {
          context = `Contexto de la base de datos: No se encontró un producto con el nombre exacto "${productName}".`;
        }
        console.log(`[Usuario: ${userId}] Contexto generado: ${context}`);
      }
    } else if (!isInScope(userPrompt)) {
      // Si NO es una consulta de stock, revisamos si está en el alcance general.
      return { reply: OOS_MESSAGE };
    }

    if (context) {
      finalPrompt = `${context}\n\nPregunta del usuario: "${userPrompt}"\n\nResponde a la pregunta basándote únicamente en el contexto proporcionado.`;
    }

    const systemInstruction = `
      Eres 'Asistente Khaleesi', un experto en el sistema de punto de venta.
      - Si se te proporciona un "Contexto de la base de datos", tu respuesta DEBE basarse estrictamente en esa información.
      - No inventes datos. Si el contexto dice que no se encontró algo, informa al usuario que no encontraste el producto.
      - Sé breve, amable y directo.
    `.trim();

    const model = genAI.getGenerativeModel({ model: MODEL_NAME, systemInstruction });

    const result = await model.generateContent(finalPrompt);
    const text = result?.response?.text?.();

    if (!text) {
      throw new HttpsError("internal", "La API respondió sin contenido.");
    }

    return { reply: text };
  } catch (error) {
    console.error("Error al contactar la API de Gemini o Firestore:", error);
    throw new HttpsError("internal", "No se pudo obtener una respuesta del asistente.");
  }
});
// ===============================================
// FUNCIONES AUTOMÁTICAS (CRON JOBS)
// ===============================================
/**
 * Se ejecuta todos los días a las 3:00 AM (hora de Argentina) para verificar
 * y actualizar las suscripciones vencidas.
 */
exports.checkExpiredSubscriptions = onSchedule("every day 03:00", async (event) => {
  console.log("Iniciando verificación de suscripciones vencidas...");

  const now = new Date();
  const subscriptionsRef = db.collection("datosNegocio");

  // 1. Buscamos todas las suscripciones que estén activas o en prueba.
  const query = subscriptionsRef.where("subscriptionStatus", "in", ["active", "trial"]);

  try {
    const snapshot = await query.get();
    if (snapshot.empty) {
      console.log("No hay suscripciones activas o en prueba para verificar.");
      return null;
    }

    const batch = db.batch();
    let expiredCount = 0;

    snapshot.forEach(doc => {
      const sub = doc.data();
      // Convertimos la fecha de Firestore a un objeto Date de JavaScript
      const endDate = sub.subscriptionEndDate.toDate();

      // 2. Comparamos si la fecha de vencimiento ya pasó.
      if (endDate < now) {
        console.log(`Suscripción vencida encontrada para el usuario ${doc.id}. Fecha fin: ${endDate.toLocaleDateString()}`);

        // 3. Si está vencida, la añadimos al lote para actualizarla a "expired".
        const docRef = db.collection("datosNegocio").doc(doc.id);
        batch.update(docRef, { subscriptionStatus: "expired" });
        expiredCount++;
      }
    });

    if (expiredCount > 0) {
      // 4. Ejecutamos todas las actualizaciones de una sola vez.
      await batch.commit();
      console.log(`Se actualizaron ${expiredCount} suscripciones a "expired".`);
    } else {
      console.log("No se encontraron suscripciones para actualizar en esta ejecución.");
    }

    return null;
  } catch (error) {
    console.error("Error al verificar suscripciones vencidas:", error);
    return null;
  }
});
// functions/index.js

// ===============================================
// PASARELA DE PAGO (MERCADO PAGO)
// ===============================================
/**
 * Crea una preferencia de pago en Mercado Pago y devuelve la URL de checkout.
 */
exports.createPaymentPreference = onCall({ secrets: [MERCADOPAGO_ACCESS_TOKEN] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes estar autenticado para crear un pago.");
  }

  const userId = request.auth.uid;
  const userEmail = request.auth.token.email;

  // 1. Inicializamos Mercado Pago con nuestro Access Token secreto.
  const client = new MercadoPagoConfig({
    accessToken: MERCADOPAGO_ACCESS_TOKEN.value(),
  });
  const preference = new Preference(client);

  try {
    console.log(`Creando preferencia de pago para el usuario: ${userId}`);

    // 2. Creamos el cuerpo de la preferencia de pago.
    const preferenceData = {
      body: {
        items: [
          {
            id: "sub-khaleesi-monthly",
            title: "Suscripción Mensual - Khaleesi System",
            quantity: 1,
            unit_price: 15000, // <-- ¡IMPORTANTE! CAMBIA ESTE PRECIO
            currency_id: "ARS",   // <-- ¡IMPORTANTE! CAMBIA A TU MONEDA (ej: "ARS", "MXN")
          },
        ],
        payer: {
          email: userEmail,
        },
        back_urls: {
          success: "https://khaleesy-system.web.app/dashboard",
          failure: "https://khaleesy-system.web.app/dashboard",
          pending: "https://khaleesy-system.web.app/dashboard",
        },
        auto_return: "approved",
        // Guardamos el ID del usuario para saber quién pagó cuando recibamos la notificación.
        external_reference: userId,
        // URL a la que Mercado Pago enviará una notificación automática (webhook)
        // IMPORTANTE: El nombre "paymentWebhook" debe coincidir con el de la función que crearemos después.
        notification_url: `https://us-central1-khaleesy-system.cloudfunctions.net/paymentWebhook`,
      },
    };

    // 3. Creamos la preferencia y obtenemos el resultado.
    const result = await preference.create(preferenceData);

    // 4. Devolvemos la URL de pago al frontend.
    console.log(`Preferencia creada con ID: ${result.id}`);
    return { preferenceId: result.id, init_point: result.init_point };

  } catch (error) {
    console.error("Error al crear la preferencia de pago:", error);
    throw new HttpsError("internal", "No se pudo generar el link de pago.");
  }
});
// functions/index.js

/**
 * Webhook para recibir notificaciones de pago de Mercado Pago.
 * Esta es una función HTTP pública que Mercado Pago llamará.
 */
exports.paymentWebhook = onRequest({ secrets: [MERCADOPAGO_ACCESS_TOKEN] }, async (req, res) => {
  // Usamos el SDK de Mercado Pago para interpretar la notificación
  const client = new MercadoPagoConfig({ accessToken: MERCADOPAGO_ACCESS_TOKEN.value() });
  const payment = new Payment(client);

  const body = req.body;
  console.log("Webhook de Mercado Pago recibido:", body);

  // Verificamos que sea una notificación de un pago creado y que tenga un ID.
  if (body.type === "payment" && body.data && body.data.id) {
    const paymentId = body.data.id;

    try {
      console.log(`Obteniendo detalles del pago ID: ${paymentId}`);
      // Obtenemos los detalles completos y verificados del pago desde la API de Mercado Pago.
      const paymentDetails = await payment.get({ id: paymentId });

      // Si el pago está aprobado y tiene una referencia externa (nuestro userId)
      if (paymentDetails && paymentDetails.status === 'approved' && paymentDetails.external_reference) {
        const userId = paymentDetails.external_reference;
        console.log(`Pago aprobado para el usuario: ${userId}`);

        // Actualizamos la suscripción del usuario en Firestore
        const userRef = db.collection('datosNegocio').doc(userId);

        const newEndDate = new Date();
        newEndDate.setDate(newEndDate.getDate() + 30); // Añade 30 días a la fecha actual

        await userRef.update({
          subscriptionStatus: 'active',
          subscriptionEndDate: newEndDate
        });

        console.log(`Suscripción actualizada para el usuario: ${userId}`);
      }
    } catch (error) {
      console.error("Error al procesar el webhook de Mercado Pago:", error);
    }
  }

  // Respondemos a Mercado Pago con un "200 OK" para que sepa que recibimos la notificación.
  res.status(200).send("OK");
});