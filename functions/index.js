const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
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

exports.askGemini = onCall({ secrets: [GEMINI_KEY] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes estar autenticado para usar el chat.");
  }

  const userPrompt = request.data?.prompt;
  if (!userPrompt || typeof userPrompt !== "string") {
    throw new HttpsError("invalid-argument", "Se requiere una pregunta válida.");
  }
  console.log("askGemini call", {
  uid: request.auth.uid,
  dateKey: getLocalDateKey(),
  promptPreview: String(userPrompt).slice(0, 80)
});

  await enforceDailyLimit(request.auth.uid, 10);

if (!isInScope(userPrompt)) {
  return { reply: OOS_MESSAGE };
}

  try {
    const apiKey = GEMINI_KEY.value();
    if (!apiKey) {
      throw new HttpsError("internal", "La clave de API de Gemini no está configurada en el servidor.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Podés meter tu instrucción de sistema acá:
    const systemInstruction = `
Eres 'Asistente Khaleesi'… 
- No respondas temas fuera del sistema. 
- No pidas PAN completo ni CVV; a lo sumo últimos 4 dígitos.
- Si falta info, pide 1 dato breve (fecha/monto/cliente).
`.trim(); 

    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction,
    });

    const chat = model.startChat({
      history: [],
      generationConfig: {
        maxOutputTokens: 512,
        // temperature: 0.7,
      },
    });

    const result = await chat.sendMessage(userPrompt);
    const text = result?.response?.text?.();

    if (!text) {
      throw new HttpsError("internal", "La API respondió sin contenido.");
    }

    return { reply: text };
  } catch (error) {
    console.error("Error al contactar la API de Gemini:", error);
    const extra = error?.status ? ` (status ${error.status})` : "";
    throw new HttpsError("internal", "No se pudo obtener una respuesta del asistente" + extra);
  }
});
