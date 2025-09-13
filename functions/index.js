const admin = require("firebase-admin");
const { onCall, HttpsError, } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const functions = require("firebase-functions"); 
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { defineSecret } = require("firebase-functions/params"); // <-- necesario para secrets

admin.initializeApp();
const db = admin.firestore();

// Secret de Gemini (configurado con `firebase functions:secrets:set GEMINI_KEY`)
const GEMINI_KEY = defineSecret("GEMINI_KEY");


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

exports.notifyAdminOfPayment = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes estar autenticado.");
  }
  const { uid, email } = request.auth.token;

  try {
    await db.collection("paymentNotifications").add({
      userId: uid,
      userEmail: email,
      notifiedAt: new Date(),
      status: "pending_review"
    });
    console.log(`Notificación de pago recibida para el usuario: ${uid}`);
    return { success: true };
  } catch (error) {
    console.error("Error al guardar la notificación de pago:", error);
    throw new HttpsError("internal", "No se pudo enviar la notificación.");
  }
});

// ===============================================
// BACKUP MANUAL DE DATOS
// ===============================================
/**
 * Recopila todos los datos de un usuario desde varias colecciones y los devuelve.
 */
exports.backupUserData = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes estar autenticado para generar un backup.");
  }

  const userId = request.auth.uid;
  console.log(`Iniciando proceso de backup para el usuario: ${userId}`);

  // Lista de todas las colecciones que queremos incluir en el backup.
  const collectionsToBackup = [
    "productos",
    "clientes",
    "vendedores",
    "ventas",
    "egresos",
    "ingresos_manuales",
    "notas_cd",
  ];

  try {
    const backupData = {};

    // Usamos Promise.all para hacer todas las consultas a la base de datos en paralelo,
    // lo cual es mucho más rápido.
    await Promise.all(
      collectionsToBackup.map(async (collectionName) => {
        const snapshot = await db.collection(collectionName).where("userId", "==", userId).get();
        // Guardamos los datos de cada colección en nuestro objeto de backup.
        backupData[collectionName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`- ${snapshot.size} documentos recuperados de la colección '${collectionName}'.`);
      })
    );

    // También añadimos los datos del negocio al backup.
    const negocioDoc = await db.collection("datosNegocio").doc(userId).get();
    if (negocioDoc.exists) {
        backupData["datosNegocio"] = negocioDoc.data();
    }

    console.log(`Backup completado para el usuario: ${userId}`);
    // Devolvemos el objeto completo con todos los datos.
    return backupData;

  } catch (error) {
    console.error(`Error al generar el backup para el usuario ${userId}:`, error);
    throw new HttpsError("internal", "No se pudo completar el backup de los datos.");
  }
});

const nodemailer = require("nodemailer");

// --- CÓDIGO NUEVO Y CORREGIDO CON SINTAXIS v2 ---
exports.enviarReporteDiario = onSchedule({
    schedule: "0 21 * * *", // Se ejecuta todos los días a las 9 PM
    timeZone: "America/Argentina/Buenos_Aires",
}, async (event) => {
    console.log("Ejecutando la función de reporte diario.");

    // 1. Obtener todos los negocios que tienen activado el reporte
    const negociosSnapshot = await db.collection("datosNegocio")
        .where("recibirReporteDiario", "==", true).get();

    if (negociosSnapshot.empty) {
        console.log("No hay usuarios para enviar reporte.");
        return null;
    }

    const reportPromises = negociosSnapshot.docs.map(async (doc) => {
        const negocio = doc.data();
        const userId = doc.id;
        const userEmail = negocio.email;

        if (!userEmail) {
            console.log(`Usuario ${userId} no tiene email, omitiendo.`);
            return;
        }

        // 2. Calcular fechas para "ayer"
        const ahora = new Date();
        ahora.setDate(ahora.getDate() - 1);
        const fechaAyer = ahora.toISOString().split("T")[0]; // Formato YYYY-MM-DD

        // 3. Obtener ventas de ayer
        const ventasSnapshot = await db.collection("ventas")
            .where("userId", "==", userId)
            .where("fecha", "==", fechaAyer).get();

        let totalVentas = 0;
        let gananciaBruta = 0;
        let numeroDeVentas = ventasSnapshot.size;

        ventasSnapshot.forEach((ventaDoc) => {
            const venta = ventaDoc.data();
            totalVentas += venta.total;
            (venta.items || []).forEach((item) => {
                gananciaBruta += (item.precioFinal - (item.costo || 0)) * item.cantidad;
            });
        });

        // 4. Formatear y enviar el email
        const mailOptions = {
            from: `Khaleesi System <${functions.config().email.user}>`,
            to: userEmail,
            subject: `📈 Reporte de Ventas del ${fechaAyer}`,
            html: `
              <h1>Resumen del ${fechaAyer}</h1>
              <p>Hola ${negocio.nombre || "Usuario"}, aquí está el resumen de tu negocio:</p>
              <ul>
                  <li><strong>Ingresos Brutos:</strong> $${totalVentas.toFixed(2)}</li>
                  <li><strong>Ganancia Bruta Estimada:</strong> $${gananciaBruta.toFixed(2)}</li>
                  <li><strong>Número de Ventas:</strong> ${numeroDeVentas}</li>
              </ul>
              <p>¡Sigue así!</p>
              <p><em>- El equipo de Khaleesi System</em></p>
            `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`Reporte enviado a ${userEmail}`);
    });

    await Promise.all(reportPromises);
    console.log("Proceso de reportes diarios finalizado.");
    return null;
});