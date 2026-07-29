const admin = require('firebase-admin');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const functions = require('firebase-functions');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { defineSecret } = require('firebase-functions/params'); // <-- necesario para secrets

admin.initializeApp();
const db = admin.firestore();

// Secret de Gemini (configurado con `firebase functions:secrets:set GEMINI_KEY`)
const GEMINI_KEY = defineSecret('GEMINI_KEY');

// =======================
// Funciones de administración
// =======================
exports.addAdminRole = onCall(async (request) => {
  if (!request.auth || request.auth.token.admin !== true) {
    throw new HttpsError(
      'permission-denied',
      'Solo un administrador puede realizar esta acción.',
    );
  }
  const email = request.data.email;
  if (!email || typeof email !== 'string') {
    throw new HttpsError(
      'invalid-argument',
      'El email debe ser proporcionado y ser un texto válido.',
    );
  }
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    return { message: `Éxito! El usuario ${email} ahora es administrador.` };
  } catch (err) {
    console.error('Error al asignar rol de admin:', err);
    throw new HttpsError(
      'internal',
      'Ocurrió un error al intentar asignar el rol.',
    );
  }
});

exports.listAllUsers = onCall(async (request) => {
  if (!request.auth || request.auth.token.admin !== true) {
    throw new HttpsError(
      'permission-denied',
      'Solo un administrador puede realizar esta acción.',
    );
  }
  try {
    const userRecords = await admin.auth().listUsers(1000);
    const promises = userRecords.users.map(async (user) => {
      const userDocRef = db.collection('datosNegocio').doc(user.uid);
      const userDoc = await userDocRef.get();
      return {
        uid: user.uid,
        email: user.email,
        fechaCreacion: user.metadata.creationTime,
        ultimoLogin: user.metadata.lastSignInTime,
        datosNegocio: userDoc.exists
          ? userDoc.data()
          : { subscriptionStatus: 'desconocido', subscriptionEndDate: null },
      };
    });
    const usersData = await Promise.all(promises);
    return usersData;
  } catch (error) {
    console.error('Error al listar usuarios:', error);
    throw new HttpsError(
      'internal',
      'No se pudo obtener la lista de usuarios.',
    );
  }
});

exports.getUserDetails = onCall(async (request) => {
  if (!request.auth || request.auth.token.admin !== true) {
    throw new HttpsError(
      'permission-denied',
      'Solo un administrador puede ver los detalles.',
    );
  }
  const userId = request.data.userId;
  if (!userId) {
    throw new HttpsError('invalid-argument', 'Se requiere un ID de usuario.');
  }
  try {
    // Limitamos a 100 documentos por colección para evitar timeouts y respuestas gigantes
    const limit = 100;

    const productosPromise = db
      .collection('productos')
      .where('userId', '==', userId)
      .limit(limit)
      .get();

    const clientesPromise = db
      .collection('clientes')
      .where('userId', '==', userId)
      .limit(limit)
      .get();

    const ventasPromise = db
      .collection('ventas')
      .where('userId', '==', userId)
      .limit(limit)
      .get();

    const notasCDPromise = db
      .collection('notas_cd')
      .where('userId', '==', userId)
      .limit(limit)
      .get();

    const [productosSnap, clientesSnap, ventasSnap, notasCDSnap] =
      await Promise.all([
        productosPromise,
        clientesPromise,
        ventasPromise,
        notasCDPromise,
      ]);

    const getData = (snapshot) =>
      snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return {
      productos: getData(productosSnap),
      clientes: getData(clientesSnap),
      ventas: getData(ventasSnap),
      notasCD: getData(notasCDSnap),
    };
  } catch (error) {
    console.error('Error al obtener detalles del usuario:', error);
    // Si falla por índice faltante (común con orderBy), intentamos sin ordenamiento
    if (error.code === 9 || error.message.includes('index')) {
      console.log('Reintentando sin ordenamiento...');
      // Fallback simple sin orderBy
      // ... (podríamos implementar retry aquí, pero por simplicidad solo lanzamos error más descriptivo)
      throw new HttpsError(
        'failed-precondition',
        'Falta un índice compuesto en Firestore. Revisa los logs.',
      );
    }
    throw new HttpsError(
      'internal',
      'No se pudo obtener los detalles del usuario.',
    );
  }
});

exports.updateUserSubscription = onCall(async (request) => {
  if (!request.auth || request.auth.token.admin !== true) {
    throw new HttpsError(
      'permission-denied',
      'Solo un administrador puede modificar suscripciones.',
    );
  }
  const { userId, newStatus, plan } = request.data;

  // Validamos que al menos uno de los dos (status o plan) esté presente
  if (!userId || (!newStatus && !plan)) {
    throw new HttpsError(
      'invalid-argument',
      'Faltan datos (userId y al menos newStatus o plan).',
    );
  }

  if (newStatus && !['active', 'trial', 'expired'].includes(newStatus)) {
    throw new HttpsError('invalid-argument', 'El nuevo estado es inválido.');
  }

  if (plan && !['basic', 'premium'].includes(plan)) {
    throw new HttpsError('invalid-argument', 'El plan es inválido.');
  }

  try {
    const userDocRef = db.collection('datosNegocio').doc(userId);
    const updates = {};

    if (newStatus) {
      updates.subscriptionStatus = newStatus;
      if (newStatus === 'active') {
        const newEndDate = new Date();
        newEndDate.setDate(newEndDate.getDate() + 30);
        updates.subscriptionEndDate = newEndDate;
      } else if (newStatus === 'trial') {
        const newEndDate = new Date();
        newEndDate.setDate(newEndDate.getDate() + 7);
        updates.subscriptionEndDate = newEndDate;
      }
    }

    if (plan) {
      updates.plan = plan;
    }

    await userDocRef.set(updates, { merge: true });
    return {
      success: true,
      message: `Usuario actualizado a estado '${newStatus}'.`,
    };
  } catch (error) {
    console.error('Error al actualizar la suscripción:', error);
    throw new HttpsError(
      'internal',
      'No se pudo actualizar la suscripción del usuario.',
    );
  }
});

// =======================
// Actualización masiva de productos
// =======================
exports.bulkUpdateProducts = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'Debes estar autenticado para realizar esta acción.',
    );
  }

  const productsToUpdate = request.data.products;
  if (
    !productsToUpdate ||
    !Array.isArray(productsToUpdate) ||
    productsToUpdate.length === 0
  ) {
    throw new HttpsError(
      'invalid-argument',
      'No se proporcionaron productos para actualizar.',
    );
  }

  const isAdmin = request.auth.token.admin === true;
  const uid = request.auth.uid;
  const batch = db.batch();
  let productsProcessed = 0;

  // Mapa para acceso rápido a los datos de actualización
  const updatesMap = new Map();
  productsToUpdate.forEach((p) => {
    if (p.id) updatesMap.set(p.id, p);
  });

  try {
    if (isAdmin) {
      // Admin: Actualización directa sin verificación de propiedad
      updatesMap.forEach((updateReq, id) => {
        const productRef = db.collection('productos').doc(id);
        const updateData = {};
        if (updateReq.precio !== undefined && updateReq.precio !== null)
          updateData.precio = Number(updateReq.precio);
        if (updateReq.stock !== undefined && updateReq.stock !== null)
          updateData.stock = Number(updateReq.stock);

        if (Object.keys(updateData).length > 0) {
          batch.update(productRef, updateData);
          productsProcessed++;
        }
      });
    } else {
      // Usuario Normal: Verificación estricta de propiedad
      const refs = Array.from(updatesMap.keys()).map((id) =>
        db.collection('productos').doc(id),
      );

      // Firestore getAll soporta varargs, pero cuidado con límites muy altos.
      // Asumimos que el frontend envía lotes razonables.
      if (refs.length > 0) {
        const snapshots = await db.getAll(...refs);

        snapshots.forEach((doc) => {
          if (doc.exists && doc.data().userId === uid) {
            const updateReq = updatesMap.get(doc.id);
            const productRef = db.collection('productos').doc(doc.id);
            const updateData = {};

            if (updateReq.precio !== undefined && updateReq.precio !== null)
              updateData.precio = Number(updateReq.precio);
            if (updateReq.stock !== undefined && updateReq.stock !== null)
              updateData.stock = Number(updateReq.stock);

            if (Object.keys(updateData).length > 0) {
              batch.update(productRef, updateData);
              productsProcessed++;
            }
          } else {
            console.warn(
              `Intento de modificación no autorizado: Usuario ${uid} intentó modificar producto ${doc.id}`,
            );
          }
        });
      }
    }

    if (productsProcessed > 0) {
      await batch.commit();
    }

    return {
      success: true,
      message: `Se procesaron ${productsProcessed} productos correctamente.`,
    };
  } catch (error) {
    console.error('Error en la actualización masiva:', error);
    throw new HttpsError(
      'internal',
      'Ocurrió un error al actualizar los productos.',
    );
  }
});
// ===== Límite diario por usuario: 10 llamadas por día, hora local de Argentina =====
const TZ = 'America/Argentina/Cordoba';

// Devuelve la fecha local AAAA-MM-DD (Córdoba) para “cortar” el día correctamente
function getLocalDateKey() {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Argentina/Cordoba',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }); // => "YYYY-MM-DD"
}

// Incrementa el contador del día y lanza error si supera el límite
async function enforceDailyLimit(uid, maxPerDay = 10) {
  const dateKey = getLocalDateKey(); // p.ej. "2025-08-19"
  const docId = `${uid}_${dateKey}`;
  const ref = db.collection('_usage_daily').doc(docId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : { count: 0, date: dateKey };
    const next = (data.count || 0) + 1;

    if (next > maxPerDay) {
      throw new HttpsError(
        'resource-exhausted',
        'Alcanzaste tu límite diario de 10 consultas. Probá nuevamente mañana.',
      );
    }

    tx.set(
      ref,
      {
        count: admin.firestore.FieldValue.increment(1),
        date: dateKey,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
}

// =======================
// Chat con Gemini (Gen2 + Secret + modelo vigente)
// =======================
// Alias que apunta siempre al modelo Flash vigente (evita 404 cuando Google
// da de baja versiones puntuales como gemini-pro / gemini-2.0-flash).
const MODEL_NAME = 'gemini-flash-latest';
const TOPIC_KEYWORDS = [
  'pago',
  'pagos',
  'venta',
  'ventas',
  'comprobante',
  'boleta',
  'ticket',
  'factura',
  'imprimir',
  'reimprimir',
  'nota de credito',
  'nota de crédito',
  'nota de debito',
  'nota de débito',
  'devolucion',
  'devolución',
  'reembolso',
  'suscripcion',
  'suscripción',
  'plan',
  'tarjeta',
  'medios de pago',
  'actualizar tarjeta',
  'aprobado',
  'pendiente',
  'rechazado',
];
function isInScope(prompt = '') {
  const p = String(prompt).toLowerCase();
  return TOPIC_KEYWORDS.some((k) => p.includes(k));
}
const OOS_MESSAGE =
  'Puedo ayudarte solo con temas del sistema de pagos Khaleesi (comprobantes, facturas, notas C/D, ventas, reembolsos, suscripciones, medios de pago, etc.). Por favor, reformulá tu pregunta en ese contexto.';

// functions/index.js

exports.askGemini = onCall({ secrets: [GEMINI_KEY] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'Debes estar autenticado para usar el chat.',
    );
  }

  const userPrompt = request.data?.prompt;
  const userId = request.auth.uid;

  if (!userPrompt || typeof userPrompt !== 'string') {
    throw new HttpsError(
      'invalid-argument',
      'Se requiere una pregunta válida.',
    );
  }

  await enforceDailyLimit(userId, 10);

  try {
    const apiKey = GEMINI_KEY.value();
    if (!apiKey) {
      throw new HttpsError(
        'internal',
        'La clave de API de Gemini no está configurada en el servidor.',
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    let finalPrompt = userPrompt;
    let context = '';

    const stockKeywords = [
      'stock',
      'inventario',
      'cuánto hay',
      'cuantos quedan',
      'disponible',
    ];
    const isStockQuery = stockKeywords.some((k) =>
      userPrompt.toLowerCase().includes(k),
    );

    if (isStockQuery) {
      console.log(
        `[Usuario: ${userId}] Intención detectada: Consulta de Stock.`,
      );

      const words = userPrompt.split(/\s+/);
      const productNameIndex = words.findIndex((w) =>
        ['producto', 'de'].includes(w.toLowerCase().replace(/[?¿!¡.,]/g, '')),
      );
      const productName = (
        productNameIndex >= 0 ? words.slice(productNameIndex + 1) : []
      )
        .join(' ')
        .replace(/[?¿!¡.,]/g, '')
        .trim();

      const norm = (s) =>
        String(s || '')
          .toLowerCase()
          .trim();
      const target = norm(productName);

      // Traemos los productos del usuario y matcheamos EN CÓDIGO, sin distinguir
      // mayúsculas ni espacios (el match exacto de Firestore era muy frágil y
      // confundía nombres parecidos como "pucho" y "puchio").
      const snap = await db
        .collection('productos')
        .where('userId', '==', userId)
        .get();
      const productos = snap.docs.map((d) => d.data());

      let candidatos = [];
      if (target) {
        // 1) Coincidencia exacta normalizada.
        candidatos = productos.filter((p) => norm(p.nombre) === target);
        // 2) Si no hay exacta, coincidencias parciales en ambos sentidos.
        if (candidatos.length === 0) {
          candidatos = productos.filter(
            (p) =>
              norm(p.nombre).includes(target) ||
              target.includes(norm(p.nombre)),
          );
        }
      }

      if (candidatos.length > 0) {
        const lista = candidatos
          .map((p) => `- "${p.nombre}": ${Number(p.stock) || 0} unidades`)
          .join('\n');
        context = `Contexto de la base de datos (stock actual):\n${lista}`;
      } else {
        context = `Contexto de la base de datos: No se encontró ningún producto que coincida con "${productName}".`;
      }
      console.log(`[Usuario: ${userId}] Contexto generado: ${context}`);
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
      - Respetá EXACTAMENTE los nombres y el stock que figuran en el contexto; no confundas productos con nombres parecidos.
      - Si el contexto lista varios productos, informá el stock de cada uno por separado.
      - No inventes datos. Si el contexto dice que no se encontró algo, informa al usuario que no encontraste el producto.
      - Sé breve, amable y directo.
    `.trim();

    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
    });

    // Prepend system instruction to the prompt since some models/API versions
    // might not support the systemInstruction parameter directly yet.
    finalPrompt = `${systemInstruction}\n\n${finalPrompt}`;

    const result = await model.generateContent(finalPrompt);
    const text = result?.response?.text?.();

    if (!text) {
      throw new HttpsError('internal', 'La API respondió sin contenido.');
    }

    return { reply: text };
  } catch (error) {
    console.error('Error al contactar la API de Gemini o Firestore:', error);

    // Si el error es 404 (Modelo no encontrado), intentamos listar los modelos disponibles
    if (error.message.includes('404') || error.message.includes('not found')) {
      try {
        const apiKey = GEMINI_KEY.value();
        console.log('Intentando listar modelos disponibles...');
        const listResp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        );
        if (listResp.ok) {
          const listData = await listResp.json();
          const availableModels = listData.models
            .map((m) => m.name.replace('models/', ''))
            .join(', ');
          console.log('Modelos disponibles:', availableModels);
          throw new HttpsError(
            'internal',
            `Error de modelo. Disponibles: ${availableModels}`,
          );
        } else {
          console.error('Error al listar modelos, status:', listResp.status);
        }
      } catch (listError) {
        console.error('Error al listar modelos (catch):', listError);
      }
    }

    throw new HttpsError('internal', `Error interno: ${error.message}`);
  }
});
// ===============================================
// FUNCIONES AUTOMÁTICAS (CRON JOBS)
// ===============================================
/**
 * Se ejecuta todos los días a las 3:00 AM (hora de Argentina) para verificar
 * y actualizar las suscripciones vencidas.
 */
exports.checkExpiredSubscriptions = onSchedule(
  'every day 03:00',
  async (event) => {
    console.log('Iniciando verificación de suscripciones vencidas...');

    const now = new Date();
    const subscriptionsRef = db.collection('datosNegocio');

    // 1. Buscamos todas las suscripciones que estén activas o en prueba.
    const query = subscriptionsRef.where('subscriptionStatus', 'in', [
      'active',
      'trial',
    ]);

    try {
      const snapshot = await query.get();
      if (snapshot.empty) {
        console.log('No hay suscripciones activas o en prueba para verificar.');
        return null;
      }

      const batch = db.batch();
      let expiredCount = 0;

      snapshot.forEach((doc) => {
        const sub = doc.data();
        // Convertimos la fecha de Firestore a un objeto Date de JavaScript
        const endDate = sub.subscriptionEndDate.toDate();

        // 2. Comparamos si la fecha de vencimiento ya pasó.
        if (endDate < now) {
          console.log(
            `Suscripción vencida encontrada para el usuario ${doc.id}. Fecha fin: ${endDate.toLocaleDateString()}`,
          );

          // 3. Si está vencida, la añadimos al lote para actualizarla a "expired".
          const docRef = db.collection('datosNegocio').doc(doc.id);
          batch.update(docRef, { subscriptionStatus: 'expired' });
          expiredCount++;
        }
      });

      if (expiredCount > 0) {
        // 4. Ejecutamos todas las actualizaciones de una sola vez.
        await batch.commit();
        console.log(
          `Se actualizaron ${expiredCount} suscripciones a "expired".`,
        );
      } else {
        console.log(
          'No se encontraron suscripciones para actualizar en esta ejecución.',
        );
      }

      return null;
    } catch (error) {
      console.error('Error al verificar suscripciones vencidas:', error);
      return null;
    }
  },
);
// functions/index.js

exports.notifyAdminOfPayment = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes estar autenticado.');
  }
  const { uid, email } = request.auth.token;

  try {
    await db.collection('paymentNotifications').add({
      userId: uid,
      userEmail: email,
      notifiedAt: new Date(),
      status: 'pending_review',
    });
    console.log(`Notificación de pago recibida para el usuario: ${uid}`);
    return { success: true };
  } catch (error) {
    console.error('Error al guardar la notificación de pago:', error);
    throw new HttpsError('internal', 'No se pudo enviar la notificación.');
  }
});

// =======================
// Facturación Electrónica (AFIP)
// =======================
const afipController = require('./afipController');
exports.createInvoice = onCall(async (request) => {
  return await afipController.createInvoice(request);
});

exports.getContribuyente = onCall(async (request) => {
  return await afipController.getContribuyente(request);
});

exports.checkAfipStatus = onCall(async (request) => {
  return await afipController.getServerStatus(request);
});

// ===============================================
// MERCADO PAGO: crear link/QR de pago (Checkout Pro)
// ===============================================
exports.crearPagoMP = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes estar autenticado.');
  }
  const uid = request.auth.uid;
  const {
    monto,
    descripcion = 'Venta',
    sucursalId = null,
    ventaId = null,
  } = request.data || {};

  const montoNum = Number(monto);
  if (!montoNum || montoNum <= 0) {
    throw new HttpsError('invalid-argument', 'Monto inválido.');
  }

  // Buscamos el Access Token de Mercado Pago del comercio (sucursal o negocio).
  let accessToken = null;
  try {
    if (sucursalId) {
      const sucDoc = await db.collection('sucursales').doc(sucursalId).get();
      if (sucDoc.exists) {
        const d = sucDoc.data();
        accessToken =
          d?.configuracion?.mpAccessToken || d?.mpAccessToken || null;
      }
    }
    if (!accessToken) {
      const negDoc = await db.collection('datosNegocio').doc(uid).get();
      if (negDoc.exists) accessToken = negDoc.data()?.mpAccessToken || null;
    }
  } catch (e) {
    console.error('[MP] Error leyendo Access Token:', e);
  }

  if (!accessToken) {
    throw new HttpsError(
      'failed-precondition',
      'Falta configurar el Access Token de Mercado Pago en Configuración.',
    );
  }

  // Referencia externa para poder identificar el pago después (webhook).
  const externalReference = ventaId || `${uid}_${Date.now()}`;

  const preference = {
    items: [
      {
        title: String(descripcion).substring(0, 250) || 'Venta',
        quantity: 1,
        unit_price: parseFloat(montoNum.toFixed(2)),
        currency_id: 'ARS',
      },
    ],
    external_reference: externalReference,
    metadata: { userId: uid, sucursalId, ventaId },
  };

  try {
    const resp = await fetch(
      'https://api.mercadopago.com/checkout/preferences',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(preference),
      },
    );
    const data = await resp.json();
    if (!resp.ok) {
      console.error('[MP] Rechazo al crear preferencia:', data);
      throw new HttpsError(
        'invalid-argument',
        `Mercado Pago: ${data?.message || 'no se pudo crear el link de pago.'}`,
      );
    }
    return {
      success: true,
      preferenceId: data.id,
      initPoint: data.init_point,
      sandboxInitPoint: data.sandbox_init_point,
      externalReference,
    };
  } catch (error) {
    if (error.code) throw error;
    console.error('[MP] Error de red:', error);
    throw new HttpsError('internal', 'No se pudo contactar con Mercado Pago.');
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
    throw new HttpsError(
      'unauthenticated',
      'Debes estar autenticado para generar un backup.',
    );
  }

  const userId = request.auth.uid;
  console.log(`Iniciando proceso de backup para el usuario: ${userId}`);

  // Lista de todas las colecciones que queremos incluir en el backup.
  const collectionsToBackup = [
    'productos',
    'clientes',
    'vendedores',
    'ventas',
    'egresos',
    'ingresos_manuales',
    'notas_cd',
  ];

  try {
    const backupData = {};

    // Usamos Promise.all para hacer todas las consultas a la base de datos en paralelo,
    // lo cual es mucho más rápido.
    await Promise.all(
      collectionsToBackup.map(async (collectionName) => {
        const snapshot = await db
          .collection(collectionName)
          .where('userId', '==', userId)
          .get();
        // Guardamos los datos de cada colección en nuestro objeto de backup.
        backupData[collectionName] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        console.log(
          `- ${snapshot.size} documentos recuperados de la colección '${collectionName}'.`,
        );
      }),
    );

    // También añadimos los datos del negocio al backup.
    const negocioDoc = await db.collection('datosNegocio').doc(userId).get();
    if (negocioDoc.exists) {
      backupData['datosNegocio'] = negocioDoc.data();
    }

    console.log(`Backup completado para el usuario: ${userId}`);
    // Devolvemos el objeto completo con todos los datos.
    return backupData;
  } catch (error) {
    console.error(
      `Error al generar el backup para el usuario ${userId}:`,
      error,
    );
    throw new HttpsError(
      'internal',
      'No se pudo completar el backup de los datos.',
    );
  }
});

const nodemailer = require('nodemailer');

// --- CÓDIGO NUEVO Y CORREGIDO CON SINTAXIS v2 ---
exports.enviarReporteDiario = onSchedule(
  {
    schedule: '0 2 * * *', // Se ejecuta todos los días a las 9 PM
    timeZone: 'America/Argentina/Buenos_Aires',
  },
  async (event) => {
    console.log('Ejecutando la función de reporte diario.');

    // 1. Obtener todos los negocios que tienen activado el reporte
    const negociosSnapshot = await db
      .collection('datosNegocio')
      .where('recibirReporteDiario', '==', true)
      .get();

    if (negociosSnapshot.empty) {
      console.log('No hay usuarios para enviar reporte.');
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
      const fechaAyer = ahora.toISOString().split('T')[0]; // Formato YYYY-MM-DD

      // 3. Obtener ventas de ayer
      const ventasSnapshot = await db
        .collection('ventas')
        .where('userId', '==', userId)
        .where('fecha', '==', fechaAyer)
        .get();

      let totalVentas = 0;
      let gananciaBruta = 0;
      let numeroDeVentas = ventasSnapshot.size;

      ventasSnapshot.forEach((ventaDoc) => {
        const venta = ventaDoc.data();
        totalVentas += venta.total;
        (venta.items || []).forEach((item) => {
          gananciaBruta +=
            (item.precioFinal - (item.costo || 0)) * item.cantidad;
        });
      });

      // 4. Formatear y enviar el email
      const mailOptions = {
        from: `Khaleesi System <${functions.config().email.user}>`,
        to: userEmail,
        subject: `📈 Reporte de Ventas del ${fechaAyer}`,
        html: `
              <h1>Resumen del ${fechaAyer}</h1>
              <p>Hola ${negocio.nombre || 'Usuario'}, aquí está el resumen de tu negocio:</p>
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
    console.log('Proceso de reportes diarios finalizado.');
    return null;
  },
);
