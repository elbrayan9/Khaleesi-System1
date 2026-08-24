const admin = require('firebase-admin');
const { onCall, HttpsError, onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const functions = require('firebase-functions');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { defineSecret } = require('firebase-functions/params'); // <-- necesario para secrets

admin.initializeApp();
const db = admin.firestore();

// Secret de Gemini (configurado con `firebase functions:secrets:set GEMINI_KEY`)
const GEMINI_KEY = defineSecret('GEMINI_KEY');
// Access Token de Mercado Pago de la PLATAFORMA (tu cuenta) para cobrar las
// suscripciones. Se setea con: firebase functions:secrets:set MP_PLATFORM_TOKEN
const MP_PLATFORM_TOKEN = defineSecret('MP_PLATFORM_TOKEN');

// =======================
// Funciones de administración
// =======================
exports.addAdminRole = onCall({ enforceAppCheck: true }, async (request) => {
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

exports.listAllUsers = onCall({ enforceAppCheck: true }, async (request) => {
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

exports.getUserDetails = onCall({ enforceAppCheck: true }, async (request) => {
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

exports.updateUserSubscription = onCall({ enforceAppCheck: true }, async (request) => {
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
exports.bulkUpdateProducts = onCall({ enforceAppCheck: true }, async (request) => {
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

// Solo Plan Completo (premium) o admin pueden usar las funciones de IA.
async function enforcePremium(request) {
  if (request?.auth?.token?.admin === true) return;
  const uid = request?.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Debes estar autenticado.');
  const doc = await db.collection('datosNegocio').doc(uid).get();
  const plan = doc.exists ? doc.data()?.plan : null;
  if (plan !== 'premium') {
    throw new HttpsError(
      'permission-denied',
      'Las funciones con IA están disponibles en el Plan Completo.',
    );
  }
}
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

exports.askGemini = onCall(
  { secrets: [GEMINI_KEY], enforceAppCheck: true },
  async (request) => {
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

  await enforcePremium(request);
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
// Identificar producto desde una foto (visión de Gemini)
// ===============================================
exports.identificarProductoFoto = onCall(
  { secrets: [GEMINI_KEY], enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes estar autenticado.');
    }
    const { imageBase64, mimeType = 'image/jpeg' } = request.data || {};
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      throw new HttpsError('invalid-argument', 'Falta la imagen.');
    }
    await enforcePremium(request);
    await enforceDailyLimit(request.auth.uid, 40);

    const apiKey = GEMINI_KEY.value();
    if (!apiKey) {
      throw new HttpsError('internal', 'Falta la clave de Gemini.');
    }
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: MODEL_NAME });
      const prompt =
        'Mirá la foto de este producto de comercio/almacén. Respondé SOLO un ' +
        'JSON (sin texto extra ni markdown) con este formato: ' +
        '{"nombre": "nombre comercial con marca y tamaño/variante si se ven", ' +
        '"codigo": "codigo de barras EAN o UPC si es legible, solo digitos, o vacio", ' +
        '"categoria": "rubro corto en español, ej: Bebidas, Almacén, Limpieza, ' +
        'Golosinas, Lácteos, Perfumería, Kiosco"}. ' +
        'Si no distinguís el producto, poné nombre vacío.';
      const result = await model.generateContent([
        { inlineData: { data: imageBase64, mimeType } },
        prompt,
      ]);
      const raw = (result.response.text() || '').trim();
      let nombre = '';
      let codigo = '';
      let categoria = '';
      try {
        const jsonTxt = raw.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(jsonTxt);
        nombre = String(parsed.nombre || '').trim();
        codigo = String(parsed.codigo || '').replace(/\D/g, '');
        categoria = String(parsed.categoria || '').trim();
      } catch (_) {
        // Si no vino JSON, usamos el texto crudo como nombre.
        nombre = raw.toUpperCase().includes('NO_SE') ? '' : raw;
      }
      return { nombre, codigo, categoria };
    } catch (error) {
      console.error('[identificarProductoFoto] error:', error);
      throw new HttpsError('internal', 'No se pudo identificar el producto.');
    }
  },
);

// ===============================================
// Leer factura/remito de proveedor desde una foto (visión de Gemini)
// ===============================================
exports.leerFacturaProveedor = onCall(
  { secrets: [GEMINI_KEY], enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes estar autenticado.');
    }
    const { imageBase64, mimeType = 'image/jpeg' } = request.data || {};
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      throw new HttpsError('invalid-argument', 'Falta la imagen.');
    }
    await enforcePremium(request);
    await enforceDailyLimit(request.auth.uid, 25);
    const apiKey = GEMINI_KEY.value();
    if (!apiKey) throw new HttpsError('internal', 'Falta la clave de Gemini.');
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: MODEL_NAME });
      const prompt =
        'Esta es una foto de una factura o remito de proveedor. Extraé los ' +
        'renglones de productos. Respondé SOLO un JSON array (sin markdown): ' +
        '[{"nombre":"descripcion del producto","cantidad":numero,"costo":numero}]. ' +
        'cantidad = unidades compradas; costo = precio unitario (sin IVA si se ' +
        'distingue), o 0 si no se ve. Ignorá totales, impuestos, descuentos y los ' +
        'datos del proveedor/cliente.';
      const result = await model.generateContent([
        { inlineData: { data: imageBase64, mimeType } },
        prompt,
      ]);
      const raw = (result.response.text() || '').trim();
      let items = [];
      try {
        items = JSON.parse(raw.replace(/```json|```/g, '').trim());
      } catch (_) {
        items = [];
      }
      if (!Array.isArray(items)) items = [];
      items = items
        .slice(0, 100)
        .map((it) => ({
          nombre: String(it.nombre || '').trim(),
          cantidad: Number(it.cantidad) || 0,
          costo: Number(it.costo) || 0,
        }))
        .filter((it) => it.nombre);
      return { items };
    } catch (error) {
      console.error('[leerFacturaProveedor] error:', error);
      throw new HttpsError('internal', 'No se pudo leer la factura.');
    }
  },
);

// ===============================================
// Sugerencia de reposición con IA
// ===============================================
exports.sugerirReposicion = onCall(
  { secrets: [GEMINI_KEY], enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes estar autenticado.');
    }
    const datos = request.data?.datos;
    if (!datos || typeof datos !== 'string') {
      throw new HttpsError('invalid-argument', 'Faltan los datos.');
    }
    await enforcePremium(request);
    await enforceDailyLimit(request.auth.uid, 20);
    const apiKey = GEMINI_KEY.value();
    if (!apiKey) throw new HttpsError('internal', 'Falta la clave de Gemini.');
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: MODEL_NAME });
      const prompt =
        'Sos el encargado de compras de un comercio. Con estos datos (producto, ' +
        'stock actual, unidades vendidas en 30 días), decime en una lista corta ' +
        'QUÉ reponer y CUÁNTO comprar para cubrir ~3 semanas sin quedar sin ' +
        'stock. Priorizá lo que se está por agotar y lo que más rota; ignorá lo ' +
        'que sobra. Español, viñetas, breve y concreto.\n\nDatos:\n' +
        datos.slice(0, 6000);
      const result = await model.generateContent(prompt);
      return { texto: (result.response.text() || '').trim() };
    } catch (error) {
      console.error('[sugerirReposicion] error:', error);
      throw new HttpsError('internal', 'No se pudo generar la sugerencia.');
    }
  },
);

// ===============================================
// Asistente que propone acciones (stock/precio) con confirmación
// ===============================================
exports.asistenteAccion = onCall(
  { secrets: [GEMINI_KEY], enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes estar autenticado.');
    }
    const { prompt, productos } = request.data || {};
    if (!prompt || typeof prompt !== 'string') {
      throw new HttpsError('invalid-argument', 'Falta el pedido.');
    }
    await enforcePremium(request);
    await enforceDailyLimit(request.auth.uid, 30);
    const apiKey = GEMINI_KEY.value();
    if (!apiKey) throw new HttpsError('internal', 'Falta la clave de Gemini.');
    const lista = Array.isArray(productos)
      ? productos.slice(0, 250).join(' | ')
      : '';
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: MODEL_NAME });
      const instru =
        'Sos el asistente de un sistema de comercio. El usuario puede pedir una ' +
        'ACCIÓN sobre un producto (cambiar stock o precio) o hacer una PREGUNTA. ' +
        'Respondé SOLO un JSON (sin markdown) con este formato: ' +
        '{"accion": true|false, "reply": "respuesta en texto si NO es accion", ' +
        '"producto": "nombre EXACTO de la lista", "campo": "stock"|"precio", ' +
        '"operacion": "sumar"|"restar"|"fijar"|"subir_pct"|"bajar_pct", ' +
        '"valor": numero, "resumen": "descripcion humana de la accion"}. ' +
        'Si es acción, elegí el producto más parecido de la lista (nombre exacto). ' +
        'Si no es una acción o no entendés, poné accion=false y una reply útil.\n' +
        `Pedido: "${prompt}"\nProductos: ${lista}`;
      const result = await model.generateContent(instru);
      const raw = (result.response.text() || '').trim();
      let out = { accion: false, reply: raw };
      try {
        out = JSON.parse(raw.replace(/```json|```/g, '').trim());
      } catch (_) {
        out = { accion: false, reply: raw };
      }
      return out;
    } catch (error) {
      console.error('[asistenteAccion] error:', error);
      throw new HttpsError('internal', 'No se pudo procesar el pedido.');
    }
  },
);

// ===============================================
// Resumen del día con IA (para el dueño)
// ===============================================
exports.resumenDiario = onCall(
  { secrets: [GEMINI_KEY], enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes estar autenticado.');
    }
    const datos = request.data?.datos;
    if (!datos || typeof datos !== 'string') {
      throw new HttpsError('invalid-argument', 'Faltan los datos.');
    }
    await enforcePremium(request);
    await enforceDailyLimit(request.auth.uid, 20);
    const apiKey = GEMINI_KEY.value();
    if (!apiKey) throw new HttpsError('internal', 'Falta la clave de Gemini.');
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: MODEL_NAME });
      const prompt =
        'Sos asesor de un comercio. Con estos datos del día de HOY, escribí un ' +
        'resumen corto y claro en español para el dueño (2 a 4 líneas), tono ' +
        'cercano, y 1 o 2 alertas o consejos si corresponde. Sin markdown.\n\n' +
        'Datos:\n' +
        datos.slice(0, 4000);
      const result = await model.generateContent(prompt);
      return { texto: (result.response.text() || '').trim() };
    } catch (error) {
      console.error('[resumenDiario] error:', error);
      throw new HttpsError('internal', 'No se pudo generar el resumen.');
    }
  },
);

// ===============================================
// Tienda online pública (catálogo + pedidos por WhatsApp)
// ===============================================
// Devuelve solo datos públicos del negocio para la vitrina. No requiere login
// (es para los clientes del comercio), pero sí App Check.
exports.getTiendaPublica = onCall(
  { enforceAppCheck: true },
  async (request) => {
    const sucursalId = String(request.data?.sucursalId || '').trim();
    if (!sucursalId) {
      throw new HttpsError('invalid-argument', 'Falta la sucursal.');
    }
    try {
      const estado = await estadoTiendaSucursal(sucursalId);
      // `motivo` es para que el duenio pueda ver por que su tienda no publica.
      // No expone datos del negocio: es una etiqueta fija.
      if (!estado.ok) return { activa: false, motivo: estado.motivo };

      const { suc, neg } = estado;
      const cfg = suc.configuracion || {};
      // Si la sucursal no tiene su propia configuracion, se usan los datos
      // del documento global, que es de donde los lee la app en ese caso.
      const dato = (campo) => cfg[campo] || neg?.[campo] || '';

      return {
        activa: true,
        nombre: dato('nombre') || suc.nombre || 'Nuestra tienda',
        direccion: dato('direccion'),
        whatsapp: dato('whatsappDueño'),
        logoUrl: dato('logoUrl'),
      };
    } catch (error) {
      console.error('[getTiendaPublica] error:', error);
      throw new HttpsError('internal', 'No se pudo cargar la tienda.');
    }
  },
);

// ===============================================
// Pagos recibidos: ver los cobros de Mercado Pago sin salir del sistema
// ===============================================
// Consulta los pagos aprobados de la cuenta del comercio con su propio Access
// Token. Cubre lo que se cobra por Mercado Pago: QR del local, link, posnet y
// tarjeta. (Las transferencias entre personas pueden no figurar acá.)
exports.consultarPagosMp = onCall(
  { enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes estar autenticado.');
    }
    const uid = request.auth.uid;
    const { sucursalId = null, dias = 1 } = request.data || {};

    const token = await leerAccessTokenComercio(uid, sucursalId);
    if (!token) {
      return { configurado: false, pagos: [] };
    }

    // Rango relativo, que es el formato que documenta Mercado Pago.
    const rango = Math.min(Math.max(Math.floor(Number(dias) || 1), 1), 31);
    const url =
      'https://api.mercadopago.com/v1/payments/search' +
      '?sort=date_created&criteria=desc&status=approved' +
      `&range=date_created&begin_date=NOW-${rango}DAYS&end_date=NOW&limit=50`;

    try {
      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json();
      if (!r.ok) {
        console.error('[consultarPagosMp] rechazo:', data);
        throw new HttpsError(
          'invalid-argument',
          data?.message || 'Mercado Pago no respondió.',
        );
      }
      const pagos = (data.results || []).map((p) => ({
        id: String(p.id),
        monto: p.transaction_amount || 0,
        neto: p.transaction_details?.net_received_amount ?? null,
        fecha: p.date_approved || p.date_created || null,
        metodo: p.payment_method_id || '',
        tipo: p.payment_type_id || '',
        descripcion: p.description || '',
        pagador:
          p.payer?.first_name || p.payer?.email || p.payer?.identification?.number || '',
      }));

      // Además de los cobros, intentamos traer los movimientos de la cuenta
      // para incluir las transferencias recibidas (lo que se ve en la app de
      // Mercado Pago). No todas las cuentas habilitan este endpoint: si no se
      // puede, seguimos mostrando los cobros y lo avisamos.
      let incluyeTransferencias = false;
      try {
        const desdeIso = new Date(
          Date.now() - rango * 24 * 60 * 60 * 1000,
        ).toISOString();
        const mr = await fetch(
          'https://api.mercadopago.com/v1/account/movements/search' +
            `?begin_date=${encodeURIComponent(desdeIso)}` +
            `&end_date=${encodeURIComponent(new Date().toISOString())}` +
            '&limit=50&offset=0',
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (mr.ok) {
          const mdata = await mr.json();
          const movs = Array.isArray(mdata?.results) ? mdata.results : [];
          incluyeTransferencias = true;
          const yaEstan = new Set(pagos.map((p) => p.id));
          movs.forEach((m) => {
            const monto = Number(m.amount ?? m.transaction_amount ?? 0);
            // Solo ingresos que no sean cobros ya listados (transferencias).
            const esPago = String(m.type || '').includes('payment');
            const id = String(m.id ?? m.reference_id ?? '');
            if (!id || esPago || yaEstan.has(id) || monto <= 0) return;
            pagos.push({
              id,
              monto,
              neto: null,
              fecha: m.date_created || m.date_approved || null,
              metodo: 'transferencia',
              tipo: 'bank_transfer',
              descripcion: m.description || 'Transferencia recibida',
              pagador: m.counterpart?.name || m.payer?.first_name || '',
            });
          });
          pagos.sort(
            (a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0),
          );
        } else {
          console.log(
            '[consultarPagosMp] movements no disponible:',
            mr.status,
          );
        }
      } catch (e) {
        console.log('[consultarPagosMp] movements falló:', e?.message);
      }

      return { configurado: true, pagos, incluyeTransferencias };
    } catch (error) {
      if (error.code) throw error;
      console.error('[consultarPagosMp] error de red:', error);
      throw new HttpsError('internal', 'No se pudo consultar Mercado Pago.');
    }
  },
);

// ===============================================
// Pedidos online: la tienda pública crea el pedido y entra al POS en vivo
// ===============================================
// Devuelve la sucursal si su tienda está publicada (activa + suscripción
// vigente + Plan Completo), o null. Mismo criterio que getTiendaPublica.
// Estado de la tienda de una sucursal, con el motivo por el que no publica.
// La configuracion puede vivir en dos lugares: en `sucursales/{id}.configuracion`
// (multisucursal) o en `datosNegocio/{uid}` (el documento global, que es el que
// usan las cuentas que nunca se migraron). El frontend ya lee de los dos con
// fallback; si el servidor mirara solo uno, la tienda quedaria "no disponible"
// para el duenio aunque en su pantalla figure activada.
async function estadoTiendaSucursal(sucursalId) {
  const sucDoc = await db.collection('sucursales').doc(sucursalId).get();
  if (!sucDoc.exists) return { ok: false, motivo: 'sucursal_inexistente' };

  const suc = sucDoc.data() || {};
  if (!suc.userId) return { ok: false, motivo: 'sucursal_sin_duenio' };

  const negDoc = await db.collection('datosNegocio').doc(suc.userId).get();
  const neg = negDoc.exists ? negDoc.data() : null;

  const activa =
    suc.configuracion?.tiendaActiva === true || neg?.tiendaActiva === true;
  if (!activa) return { ok: false, motivo: 'tienda_desactivada' };

  if (!['active', 'trial'].includes(neg?.subscriptionStatus)) {
    return { ok: false, motivo: 'suscripcion_vencida' };
  }
  // La tienda online es del Plan Completo.
  if (neg?.plan !== 'premium') return { ok: false, motivo: 'plan_basico' };

  return { ok: true, suc, neg };
}

async function leerTiendaPublicada(sucursalId) {
  const estado = await estadoTiendaSucursal(sucursalId);
  return estado.ok ? estado.suc : null;
}

// Número de pedido corto y correlativo por sucursal.
async function siguienteCodigoPedido(sucursalId) {
  const ref = db.collection('contadores').doc(sucursalId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const actual = Number(snap.exists ? snap.data()?.pedidosOnline : 0) || 0;
    const proximo = actual + 1;
    tx.set(ref, { pedidosOnline: proximo }, { merge: true });
    return proximo;
  });
}

exports.crearPedidoTienda = onCall(
  { enforceAppCheck: true },
  async (request) => {
    const sucursalId = String(request.data?.sucursalId || '').trim();
    const items = Array.isArray(request.data?.items) ? request.data.items : [];
    const cliente = request.data?.cliente || {};
    const tipo = request.data?.tipo === 'delivery' ? 'delivery' : 'retiro';
    const metodoPago =
      request.data?.metodoPago === 'qr_local' ? 'qr_local' : 'efectivo';

    if (!sucursalId) {
      throw new HttpsError('invalid-argument', 'Falta la sucursal.');
    }
    if (items.length === 0 || items.length > 50) {
      throw new HttpsError('invalid-argument', 'El pedido está vacío.');
    }
    const nombreCliente = String(cliente.nombre || '').trim().slice(0, 80);
    const telefono = String(cliente.telefono || '').replace(/\D/g, '').slice(0, 20);
    if (!nombreCliente || telefono.length < 6) {
      throw new HttpsError(
        'invalid-argument',
        'Necesitamos tu nombre y un teléfono válido.',
      );
    }
    const direccion = String(cliente.direccion || '').trim().slice(0, 160);
    if (tipo === 'delivery' && !direccion) {
      throw new HttpsError('invalid-argument', 'Falta la dirección de envío.');
    }

    try {
      const suc = await leerTiendaPublicada(sucursalId);
      if (!suc) {
        throw new HttpsError(
          'failed-precondition',
          'La tienda no está disponible en este momento.',
        );
      }

      // Freno anti-abuso: máximo de pedidos por sucursal por día.
      const limiteRef = db
        .collection('contadores')
        .doc(`${sucursalId}_${getLocalDateKey()}`);
      const cuenta = await db.runTransaction(async (tx) => {
        const snap = await tx.get(limiteRef);
        const n = (Number(snap.exists ? snap.data()?.pedidos : 0) || 0) + 1;
        tx.set(limiteRef, { pedidos: n }, { merge: true });
        return n;
      });
      if (cuenta > 300) {
        throw new HttpsError(
          'resource-exhausted',
          'Se alcanzó el máximo de pedidos por hoy.',
        );
      }

      // Los precios y el stock salen de Firestore: nunca del navegador.
      const detalle = [];
      let total = 0;
      for (const it of items) {
        const productoId = String(it?.productoId || '').trim();
        const cantidad = Math.floor(Number(it?.cantidad) || 0);
        if (!productoId || cantidad <= 0) continue;
        // eslint-disable-next-line no-await-in-loop
        const pDoc = await db.collection('productos').doc(productoId).get();
        if (!pDoc.exists) {
          throw new HttpsError(
            'failed-precondition',
            'Uno de los productos ya no está disponible.',
          );
        }
        const p = pDoc.data() || {};
        if (p.sucursalId !== sucursalId) {
          throw new HttpsError('failed-precondition', 'Pedido inválido.');
        }
        const precioUnitario = Number(p.precio) || 0;
        if (precioUnitario <= 0) {
          throw new HttpsError(
            'failed-precondition',
            `"${p.nombre}" no está disponible.`,
          );
        }
        if ((Number(p.stock) || 0) < cantidad) {
          throw new HttpsError(
            'failed-precondition',
            `No hay stock suficiente de "${p.nombre}".`,
          );
        }
        const subtotal = Math.round(precioUnitario * cantidad * 100) / 100;
        detalle.push({
          productoId,
          nombre: String(p.nombre || ''),
          cantidad,
          precioUnitario,
          subtotal,
        });
        total += subtotal;
      }
      if (detalle.length === 0) {
        throw new HttpsError('invalid-argument', 'El pedido está vacío.');
      }
      total = Math.round(total * 100) / 100;

      const codigo = await siguienteCodigoPedido(sucursalId);
      const trackingToken = require('crypto').randomUUID();

      const ref = await db.collection('pedidos_online').add({
        userId: suc.userId,
        sucursalId,
        codigo,
        cliente: { nombre: nombreCliente, telefono, direccion },
        tipo,
        items: detalle,
        total,
        metodoPago,
        estado: 'nuevo',
        tiempoEstimado: null,
        trackingToken,
        ventaId: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { pedidoId: ref.id, codigo, trackingToken, total };
    } catch (error) {
      if (error.code) throw error;
      console.error('[crearPedidoTienda] error:', error);
      throw new HttpsError('internal', 'No se pudo enviar el pedido.');
    }
  },
);

// ===============================================
// App del repartidor (sin cuenta: entra con un link con token)
// ===============================================
// Busca al repartidor por su token de acceso. Devuelve null si no existe o si
// el comercio lo dio de baja.
async function leerRepartidorPorToken(token) {
  const t = String(token || '').trim();
  if (!t) return null;
  const snap = await db
    .collection('repartidores')
    .where('accessToken', '==', t)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const d = doc.data() || {};
  if (d.activo === false) return null;
  return { id: doc.id, ref: doc.ref, ...d };
}

// Sesión del repartidor: sus datos, el pedido que tenga en curso y los pedidos
// de delivery listos para salir.
exports.sesionRepartidor = onCall(
  { enforceAppCheck: true },
  async (request) => {
    const rep = await leerRepartidorPorToken(request.data?.token);
    if (!rep) {
      throw new HttpsError('permission-denied', 'Enlace no válido.');
    }
    try {
      const base = db
        .collection('pedidos_online')
        .where('sucursalId', '==', rep.sucursalId);

      const [asignados, disponibles] = await Promise.all([
        base.where('repartidorId', '==', rep.id).limit(10).get(),
        base.where('estado', '==', 'listo').limit(20).get(),
      ]);

      const aPedido = (doc) => {
        const d = doc.data() || {};
        return {
          id: doc.id,
          codigo: d.codigo,
          estado: d.estado,
          tipo: d.tipo,
          total: d.total,
          metodoPago: d.metodoPago,
          cliente: d.cliente || {},
          items: (d.items || []).map((it) => ({
            nombre: it.nombre,
            cantidad: it.cantidad,
          })),
          repartidorId: d.repartidorId || null,
        };
      };

      // El que tiene en curso (todavía no entregado).
      const enCurso = asignados.docs
        .map(aPedido)
        .filter((p) => ['en_camino', 'listo'].includes(p.estado));

      // Disponibles: solo delivery y sin repartidor asignado.
      const libres = disponibles.docs
        .map(aPedido)
        .filter((p) => p.tipo === 'delivery' && !p.repartidorId);

      return {
        repartidor: {
          nombre: rep.nombre || '',
          online: !!rep.online,
          vehiculo: rep.vehiculo || null,
        },
        enCurso,
        disponibles: rep.online ? libres : [],
      };
    } catch (error) {
      console.error('[sesionRepartidor] error:', error);
      throw new HttpsError('internal', 'No se pudo cargar la sesión.');
    }
  },
);

// Disponible / no disponible (el switch "Online").
exports.repartidorOnline = onCall(
  { enforceAppCheck: true },
  async (request) => {
    const rep = await leerRepartidorPorToken(request.data?.token);
    if (!rep) throw new HttpsError('permission-denied', 'Enlace no válido.');
    const online = !!request.data?.online;
    const vehiculo = ['moto', 'auto', 'bici'].includes(request.data?.vehiculo)
      ? request.data.vehiculo
      : rep.vehiculo || 'moto';
    await rep.ref.update({
      online,
      vehiculo,
      actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true, online, vehiculo };
  },
);

// Posición del repartidor mientras está en viaje.
exports.ubicacionRepartidor = onCall(
  { enforceAppCheck: true },
  async (request) => {
    const rep = await leerRepartidorPorToken(request.data?.token);
    if (!rep) throw new HttpsError('permission-denied', 'Enlace no válido.');
    const lat = Number(request.data?.lat);
    const lng = Number(request.data?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new HttpsError('invalid-argument', 'Coordenadas inválidas.');
    }
    await rep.ref.update({ ubicacion: { lat, lng, ts: Date.now() } });
    return { success: true };
  },
);

// Tomar un pedido. Transacción para que dos repartidores no agarren el mismo.
exports.tomarPedido = onCall({ enforceAppCheck: true }, async (request) => {
  const rep = await leerRepartidorPorToken(request.data?.token);
  if (!rep) throw new HttpsError('permission-denied', 'Enlace no válido.');
  const pedidoId = String(request.data?.pedidoId || '').trim();
  if (!pedidoId) throw new HttpsError('invalid-argument', 'Falta el pedido.');

  const ref = db.collection('pedidos_online').doc(pedidoId);
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) {
        throw new HttpsError('not-found', 'El pedido ya no existe.');
      }
      const d = snap.data() || {};
      if (d.sucursalId !== rep.sucursalId) {
        throw new HttpsError('permission-denied', 'Pedido de otro comercio.');
      }
      if (d.repartidorId) {
        throw new HttpsError(
          'failed-precondition',
          'Otro repartidor ya tomó este pedido.',
        );
      }
      if (d.estado !== 'listo') {
        throw new HttpsError(
          'failed-precondition',
          'El pedido todavía no está listo.',
        );
      }
      tx.update(ref, {
        repartidorId: rep.id,
        repartidorNombre: rep.nombre || '',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    return { success: true };
  } catch (error) {
    if (error.code) throw error;
    console.error('[tomarPedido] error:', error);
    throw new HttpsError('internal', 'No se pudo tomar el pedido.');
  }
});

// En camino / entregado. La venta NO se registra acá: la confirma el comercio
// desde el POS cuando el repartidor rinde la plata.
exports.estadoEntrega = onCall({ enforceAppCheck: true }, async (request) => {
  const rep = await leerRepartidorPorToken(request.data?.token);
  if (!rep) throw new HttpsError('permission-denied', 'Enlace no válido.');
  const pedidoId = String(request.data?.pedidoId || '').trim();
  const estado = String(request.data?.estado || '').trim();
  if (!pedidoId || !['en_camino', 'entregado'].includes(estado)) {
    throw new HttpsError('invalid-argument', 'Datos inválidos.');
  }
  const ref = db.collection('pedidos_online').doc(pedidoId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Pedido no encontrado.');
  if (snap.data()?.repartidorId !== rep.id) {
    throw new HttpsError('permission-denied', 'Ese pedido no es tuyo.');
  }
  await ref.update({
    estado,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { success: true };
});

// Seguimiento para el cliente (sin login): solo con el token del pedido.
exports.getEstadoPedido = onCall(
  { enforceAppCheck: true },
  async (request) => {
    const pedidoId = String(request.data?.pedidoId || '').trim();
    const token = String(request.data?.trackingToken || '').trim();
    if (!pedidoId || !token) {
      throw new HttpsError('invalid-argument', 'Datos incompletos.');
    }
    try {
      const doc = await db.collection('pedidos_online').doc(pedidoId).get();
      if (!doc.exists) throw new HttpsError('not-found', 'Pedido no encontrado.');
      const d = doc.data() || {};
      if (d.trackingToken !== token) {
        throw new HttpsError('permission-denied', 'Pedido no encontrado.');
      }
      // Si ya salió con un repartidor, mandamos su posición para el mapa.
      let repartidor = null;
      if (d.repartidorId) {
        try {
          const rDoc = await db
            .collection('repartidores')
            .doc(d.repartidorId)
            .get();
          const r = rDoc.exists ? rDoc.data() : null;
          if (r) {
            repartidor = {
              nombre: r.nombre || '',
              vehiculo: r.vehiculo || null,
              // Solo si la posición es reciente (menos de 5 minutos).
              lat:
                r.ubicacion?.ts && Date.now() - r.ubicacion.ts < 300000
                  ? r.ubicacion.lat
                  : null,
              lng:
                r.ubicacion?.ts && Date.now() - r.ubicacion.ts < 300000
                  ? r.ubicacion.lng
                  : null,
            };
          }
        } catch (e) {
          console.warn('[getEstadoPedido] repartidor:', e?.message);
        }
      }

      return {
        codigo: d.codigo,
        estado: d.estado,
        tiempoEstimado: d.tiempoEstimado ?? null,
        total: d.total,
        tipo: d.tipo,
        repartidor,
      };
    } catch (error) {
      if (error.code) throw error;
      console.error('[getEstadoPedido] error:', error);
      throw new HttpsError('internal', 'No se pudo consultar el pedido.');
    }
  },
);

// Cambio de estado desde el POS (solo el dueño del pedido).
exports.actualizarEstadoPedido = onCall(
  { enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes estar autenticado.');
    }
    const pedidoId = String(request.data?.pedidoId || '').trim();
    const estado = String(request.data?.estado || '').trim();
    const permitidos = ['confirmado', 'listo', 'entregado', 'rechazado'];
    if (!pedidoId || !permitidos.includes(estado)) {
      throw new HttpsError('invalid-argument', 'Datos inválidos.');
    }
    try {
      const ref = db.collection('pedidos_online').doc(pedidoId);
      const doc = await ref.get();
      if (!doc.exists) throw new HttpsError('not-found', 'Pedido no encontrado.');
      if (doc.data()?.userId !== request.auth.uid) {
        throw new HttpsError('permission-denied', 'No es tu pedido.');
      }
      const update = {
        estado,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (estado === 'confirmado') {
        const t = Number(request.data?.tiempoEstimado) || 0;
        if (t > 0) update.tiempoEstimado = t;
      }
      if (estado === 'entregado' && request.data?.ventaId) {
        update.ventaId = String(request.data.ventaId);
      }
      await ref.update(update);
      return { success: true };
    } catch (error) {
      if (error.code) throw error;
      console.error('[actualizarEstadoPedido] error:', error);
      throw new HttpsError('internal', 'No se pudo actualizar el pedido.');
    }
  },
);

// ===============================================
// Venta por voz: convierte un dictado en items del carrito
// ===============================================
exports.ventaPorVoz = onCall(
  { secrets: [GEMINI_KEY], enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes estar autenticado.');
    }
    const { texto, productos } = request.data || {};
    if (!texto || typeof texto !== 'string') {
      throw new HttpsError('invalid-argument', 'Falta el texto dictado.');
    }
    await enforcePremium(request);
    await enforceDailyLimit(request.auth.uid, 60);
    const apiKey = GEMINI_KEY.value();
    if (!apiKey) throw new HttpsError('internal', 'Falta la clave de Gemini.');
    const lista = Array.isArray(productos)
      ? productos.slice(0, 300).join(' | ')
      : '';
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: MODEL_NAME });
      const prompt =
        'Un cajero dictó una venta en voz alta. Convertilo en items usando SOLO ' +
        'productos de la lista (nombre EXACTO como figura). Respondé SOLO un ' +
        'JSON array (sin markdown): [{"producto":"nombre exacto","cantidad":numero}]. ' +
        'Interpretá cantidades en palabras ("dos" = 2) y plurales ("dos cocas" = ' +
        'el producto Coca). Si algo no coincide con ningún producto, omitilo.\n' +
        `Dictado: "${texto}"\nProductos: ${lista}`;
      const result = await model.generateContent(prompt);
      const raw = (result.response.text() || '').trim();
      let items = [];
      try {
        items = JSON.parse(raw.replace(/```json|```/g, '').trim());
      } catch (_) {
        items = [];
      }
      if (!Array.isArray(items)) items = [];
      items = items
        .slice(0, 30)
        .map((it) => ({
          producto: String(it.producto || '').trim(),
          cantidad: Number(it.cantidad) || 1,
        }))
        .filter((it) => it.producto);
      return { items };
    } catch (error) {
      console.error('[ventaPorVoz] error:', error);
      throw new HttpsError('internal', 'No se pudo interpretar el dictado.');
    }
  },
);

// ===============================================
// Precio preferencial para clientes actuales (grandfathering)
// ===============================================
// Le guarda a cada cliente existente el precio que tenía antes del aumento.
// Solo admin. `meses` (opcional) define hasta cuándo se respeta; sin valor, es
// indefinido. No pisa a quien ya tenga un precio preferencial.
exports.aplicarPrecioLegacy = onCall(
  { enforceAppCheck: true },
  async (request) => {
    if (!request.auth || request.auth.token.admin !== true) {
      throw new HttpsError('permission-denied', 'Solo un administrador.');
    }
    const meses = Number(request.data?.meses) || 0;
    let hasta = null;
    if (meses > 0) {
      hasta = new Date();
      hasta.setMonth(hasta.getMonth() + meses);
    }

    const PRECIOS_ANTERIORES = {
      basic: { mensual: 15000, anual: 135000 },
      premium: { mensual: 25000, anual: 250000 },
    };

    try {
      const snap = await db.collection('datosNegocio').get();
      let aplicados = 0;
      const batchOps = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data() || {};
        if (d.precioLegacy) return; // ya tiene uno, no lo pisamos
        if (!['active', 'trial'].includes(d.subscriptionStatus)) return;
        const update = { precioLegacy: PRECIOS_ANTERIORES };
        if (hasta) update.precioLegacyHasta = hasta;
        batchOps.push(docSnap.ref.set(update, { merge: true }));
        aplicados += 1;
      });
      await Promise.all(batchOps);
      return {
        success: true,
        aplicados,
        hasta: hasta ? hasta.toISOString() : null,
      };
    } catch (error) {
      console.error('[aplicarPrecioLegacy] error:', error);
      throw new HttpsError('internal', 'No se pudo aplicar.');
    }
  },
);

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

exports.notifyAdminOfPayment = onCall({ enforceAppCheck: true }, async (request) => {
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
// La facturación electrónica es del Plan Completo: se valida en el servidor,
// no solo escondiendo botones en la interfaz.
exports.createInvoice = onCall({ enforceAppCheck: true }, async (request) => {
  await enforcePremium(request);
  return await afipController.createInvoice(request);
});

exports.getContribuyente = onCall({ enforceAppCheck: true }, async (request) => {
  await enforcePremium(request);
  return await afipController.getContribuyente(request);
});

exports.checkAfipStatus = onCall({ enforceAppCheck: true }, async (request) => {
  return await afipController.getServerStatus(request);
});

// ===============================================
// MERCADO PAGO: crear link/QR de pago (Checkout Pro)
// ===============================================
exports.crearPagoMP = onCall({ enforceAppCheck: true }, async (request) => {
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

  // Referencia externa para identificar el pago después (webhook).
  const externalReference = ventaId || `${uid}_${Date.now()}`;
  const WEBHOOK_URL =
    'https://us-central1-khaleesy-system.cloudfunctions.net/mpWebhook';

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
    notification_url: `${WEBHOOK_URL}?uid=${uid}&suc=${sucursalId || ''}`,
    metadata: { userId: uid, sucursalId, ventaId },
  };

  // Registramos el cobro como "pendiente" para confirmarlo luego por webhook
  // y que el frontend lo escuche en tiempo real.
  try {
    await db.collection('cobros_mp').doc(externalReference).set({
      userId: uid,
      sucursalId: sucursalId || null,
      monto: parseFloat(montoNum.toFixed(2)),
      descripcion: String(descripcion),
      estado: 'pendiente',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error('[MP] Error creando cobro pendiente:', e);
  }

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
// MERCADO PAGO: webhook de notificaciones de pago
// ===============================================
exports.mpWebhook = onRequest(async (req, res) => {
  try {
    // El uid del comercio viaja en la query (lo pusimos en notification_url).
    const uid = req.query.uid;
    const tipo = req.body?.type || req.query.type || req.query.topic;
    const paymentId =
      req.body?.data?.id || req.query['data.id'] || req.query.id;

    // Solo nos interesan notificaciones de pago.
    if (!uid || !paymentId || (tipo && tipo !== 'payment')) {
      return res.status(200).send('ignored');
    }

    // Access Token del comercio (igual que crearPagoMP: sucursal, luego negocio).
    const sucId = req.query.suc;
    let token = null;
    if (sucId) {
      const sucDoc = await db.collection('sucursales').doc(sucId).get();
      if (sucDoc.exists) {
        const d = sucDoc.data();
        token = d?.configuracion?.mpAccessToken || d?.mpAccessToken || null;
      }
    }
    if (!token) {
      const negDoc = await db.collection('datosNegocio').doc(uid).get();
      token = negDoc.exists ? negDoc.data()?.mpAccessToken : null;
    }
    if (!token) {
      console.warn(`[MP webhook] sin token (uid=${uid}, suc=${sucId})`);
      return res.status(200).send('sin token');
    }
    console.log(
      `[MP webhook] uid=${uid} suc=${sucId} paymentId=${paymentId}`,
    );

    const r = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const pago = await r.json();
    if (!r.ok) {
      console.error('[MP webhook] Error consultando pago:', pago);
      return res.status(200).send('error consulta');
    }

    const extRef = pago.external_reference;
    console.log(`[MP webhook] extRef=${extRef} status=${pago.status}`);
    if (extRef) {
      const estado = pago.status === 'approved' ? 'pagado' : pago.status;
      await db.collection('cobros_mp').doc(extRef).set(
        {
          estado,
          paymentId: String(paymentId),
          montoPagado: pago.transaction_amount || null,
          metodoMP: pago.payment_type_id || null,
          actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    return res.status(200).send('ok');
  } catch (error) {
    console.error('[MP webhook] Error:', error);
    // Respondemos 200 igual para que MP no reintente indefinidamente.
    return res.status(200).send('error');
  }
});

// ===============================================
// MERCADO PAGO POINT (posnet): cobro integrado en el aparato
// ===============================================
// Lee el Access Token del comercio (sucursal primero, luego negocio). Es el
// mismo criterio que usa crearPagoMP / mpWebhook.
async function leerAccessTokenComercio(uid, sucursalId) {
  let token = null;
  try {
    if (sucursalId) {
      const sucDoc = await db.collection('sucursales').doc(sucursalId).get();
      if (sucDoc.exists) {
        const d = sucDoc.data();
        token = d?.configuracion?.mpAccessToken || d?.mpAccessToken || null;
      }
    }
    if (!token) {
      const negDoc = await db.collection('datosNegocio').doc(uid).get();
      if (negDoc.exists) token = negDoc.data()?.mpAccessToken || null;
    }
  } catch (e) {
    console.error('[Point] Error leyendo Access Token:', e);
  }
  return token;
}

const POINT_API = 'https://api.mercadopago.com/point/integration-api';

// Lista los posnet Point vinculados a la cuenta del comercio. Si no hay token o
// no hay aparatos, devuelve lista vacía (así el frontend no muestra el botón).
exports.listarDispositivosPoint = onCall({ enforceAppCheck: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes estar autenticado.');
  }
  const uid = request.auth.uid;
  const { sucursalId = null } = request.data || {};
  const token = await leerAccessTokenComercio(uid, sucursalId);
  if (!token) return { success: true, devices: [] };
  try {
    const r = await fetch(`${POINT_API}/devices`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await r.json();
    if (!r.ok) {
      console.error('[Point] Error listando devices:', data);
      return { success: true, devices: [] };
    }
    const devices = (data.devices || []).map((d) => ({
      id: d.id,
      operatingMode: d.operating_mode || null,
    }));
    return { success: true, devices };
  } catch (e) {
    console.error('[Point] Error de red listando devices:', e);
    return { success: true, devices: [] };
  }
});

// Envía una intención de pago al posnet: el aparato muestra el monto y el
// cliente paga con tarjeta. Registra el cobro pendiente en cobros_mp (misma
// colección que el QR) para reutilizar la confirmación en tiempo real.
exports.crearPagoPoint = onCall({ enforceAppCheck: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes estar autenticado.');
  }
  const uid = request.auth.uid;
  const {
    deviceId,
    monto,
    descripcion = 'Venta',
    sucursalId = null,
    ventaId = null,
  } = request.data || {};

  if (!deviceId) {
    throw new HttpsError('invalid-argument', 'Falta el posnet (deviceId).');
  }
  const montoNum = Number(monto);
  if (!montoNum || montoNum <= 0) {
    throw new HttpsError('invalid-argument', 'Monto inválido.');
  }

  const token = await leerAccessTokenComercio(uid, sucursalId);
  if (!token) {
    throw new HttpsError(
      'failed-precondition',
      'Falta configurar el Access Token de Mercado Pago en Configuración.',
    );
  }

  const externalReference = ventaId || `point_${uid}_${Date.now()}`;

  // Aseguramos que el aparato esté en modo integrado (PDV). Best-effort: si
  // falla igual intentamos crear la intención.
  try {
    await fetch(`${POINT_API}/devices/${deviceId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ operating_mode: 'PDV' }),
    });
  } catch (e) {
    console.warn('[Point] No se pudo fijar modo PDV:', e?.message || e);
  }

  // Registramos el cobro pendiente (para el listener en tiempo real).
  try {
    await db.collection('cobros_mp').doc(externalReference).set({
      userId: uid,
      sucursalId: sucursalId || null,
      monto: parseFloat(montoNum.toFixed(2)),
      descripcion: String(descripcion),
      estado: 'pendiente',
      via: 'point',
      deviceId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error('[Point] Error creando cobro pendiente:', e);
  }

  // En la API de Point el monto va en centavos (entero).
  const amountCents = Math.round(montoNum * 100);

  try {
    const r = await fetch(`${POINT_API}/devices/${deviceId}/payment-intents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        amount: amountCents,
        additional_info: {
          external_reference: externalReference,
          print_on_terminal: true,
        },
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      console.error('[Point] Rechazo al crear payment-intent:', data);
      throw new HttpsError(
        'invalid-argument',
        `Mercado Pago Point: ${
          data?.message || 'no se pudo enviar el cobro al posnet.'
        }`,
      );
    }
    try {
      await db
        .collection('cobros_mp')
        .doc(externalReference)
        .set({ paymentIntentId: data.id || null }, { merge: true });
    } catch (_) {
      /* no crítico */
    }
    return {
      success: true,
      externalReference,
      paymentIntentId: data.id,
      deviceId,
    };
  } catch (error) {
    if (error.code) throw error;
    console.error('[Point] Error de red creando payment-intent:', error);
    throw new HttpsError(
      'internal',
      'No se pudo contactar con Mercado Pago Point.',
    );
  }
});

// Consulta el estado de la intención del posnet (polling desde el frontend).
// Cuando termina aprobada, marca el cobro como pagado en cobros_mp.
exports.consultarPagoPoint = onCall({ enforceAppCheck: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes estar autenticado.');
  }
  const uid = request.auth.uid;
  const {
    paymentIntentId,
    externalReference = null,
    sucursalId = null,
  } = request.data || {};
  if (!paymentIntentId) {
    throw new HttpsError('invalid-argument', 'Falta paymentIntentId.');
  }
  const token = await leerAccessTokenComercio(uid, sucursalId);
  if (!token) {
    throw new HttpsError(
      'failed-precondition',
      'Falta el Access Token de Mercado Pago.',
    );
  }
  try {
    const r = await fetch(`${POINT_API}/payment-intents/${paymentIntentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await r.json();
    if (!r.ok) {
      console.error('[Point] Error consultando payment-intent:', data);
      return { success: false, state: 'ERROR' };
    }
    const state = data.state || data.status || 'OPEN';
    const aprobado =
      state === 'FINISHED' &&
      (!data.payment || data.payment.status === 'approved');

    if (aprobado && externalReference) {
      await db
        .collection('cobros_mp')
        .doc(externalReference)
        .set(
          {
            estado: 'pagado',
            paymentId: String(data.payment?.id || paymentIntentId),
            montoPagado: data.amount ? data.amount / 100 : null,
            metodoMP: 'point',
            actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
    }
    return { success: true, state, aprobado };
  } catch (e) {
    console.error('[Point] Error de red consultando payment-intent:', e);
    return { success: false, state: 'ERROR' };
  }
});

// Cancela la intención de pago en el posnet (si el cajero aborta el cobro).
exports.cancelarPagoPoint = onCall({ enforceAppCheck: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes estar autenticado.');
  }
  const uid = request.auth.uid;
  const {
    deviceId,
    paymentIntentId,
    externalReference = null,
    sucursalId = null,
  } = request.data || {};
  if (!deviceId || !paymentIntentId) {
    throw new HttpsError('invalid-argument', 'Faltan datos para cancelar.');
  }
  const token = await leerAccessTokenComercio(uid, sucursalId);
  if (!token) {
    throw new HttpsError(
      'failed-precondition',
      'Falta el Access Token de Mercado Pago.',
    );
  }
  try {
    await fetch(
      `${POINT_API}/devices/${deviceId}/payment-intents/${paymentIntentId}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
    );
    if (externalReference) {
      await db
        .collection('cobros_mp')
        .doc(externalReference)
        .set(
          {
            estado: 'cancelado',
            actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
    }
    return { success: true };
  } catch (e) {
    console.error('[Point] Error cancelando payment-intent:', e);
    return { success: false };
  }
});

// ===============================================
// MERCADO PAGO: QR interoperable (Transferencias 3.0 / In-Store)
// Cualquier billetera o banco lo escanea. Usa una "Caja/POS" de la cuenta del
// comercio (se crea sola la primera vez y se guarda en la sucursal).
// ===============================================
const MP_API = 'https://api.mercadopago.com';

// Asegura que exista Tienda + Caja (POS) para el comercio y devuelve sus datos.
async function asegurarPosQr(token, uid, sucursalId) {
  const sucRef = sucursalId
    ? db.collection('sucursales').doc(sucursalId)
    : null;
  let cfg = {};
  if (sucRef) {
    const s = await sucRef.get();
    cfg = (s.exists && s.data()?.configuracion) || {};
  }
  if (cfg.mpQrExternalPosId && cfg.mpQrUserId) {
    return {
      userId: cfg.mpQrUserId,
      externalPosId: cfg.mpQrExternalPosId,
      qrImage: cfg.mpQrImage || null,
    };
  }

  // 1) Collector user_id
  const meR = await fetch(`${MP_API}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const me = await meR.json();
  if (!meR.ok || !me.id) {
    throw new HttpsError(
      'failed-precondition',
      'No se pudo leer la cuenta de Mercado Pago (revisá el Access Token).',
    );
  }
  const userId = me.id;
  const baseExt =
    String(sucursalId || uid)
      .replace(/[^\w-]/g, '')
      .slice(0, 28) || String(uid).slice(0, 28);
  const storeExternalId = `khaleesi_store_${baseExt}`;
  const posExternalId = `khaleesi_pos_${baseExt}`;

  // 2) Tienda (si ya existe, MP devuelve error y seguimos)
  try {
    await fetch(`${MP_API}/users/${userId}/stores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'Khaleesi',
        external_id: storeExternalId,
        location: {
          street_number: '0',
          street_name: 'Local',
          city_name: 'CABA',
          state_name: 'Buenos Aires',
          latitude: -34.6,
          longitude: -58.4,
        },
      }),
    });
  } catch (e) {
    console.warn('[QR] Store (posible ya existente):', e?.message || e);
  }

  // 3) Caja (POS). Si ya existe, la buscamos.
  let qrImage = null;
  const posR = await fetch(`${MP_API}/pos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'Khaleesi Caja',
      fixed_amount: false,
      external_id: posExternalId,
      external_store_id: storeExternalId,
      category: 621102,
    }),
  });
  const pos = await posR.json();
  if (posR.ok && pos.external_id) {
    qrImage = pos.qr?.image || null;
  } else {
    const listR = await fetch(
      `${MP_API}/pos?external_id=${posExternalId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const list = await listR.json();
    const found = list?.results?.[0];
    if (!found) {
      console.error('[QR] No se pudo crear/obtener POS:', pos);
      throw new HttpsError(
        'failed-precondition',
        `Mercado Pago: ${pos?.message || 'no se pudo crear la caja QR.'}`,
      );
    }
    qrImage = found.qr?.image || null;
  }

  if (sucRef) {
    await sucRef.set(
      {
        configuracion: {
          mpQrUserId: userId,
          mpQrExternalPosId: posExternalId,
          mpQrImage: qrImage,
        },
      },
      { merge: true },
    );
  }
  return { userId, externalPosId: posExternalId, qrImage };
}

// Genera el QR interoperable para una venta (asocia el monto a la Caja).
exports.crearQrInteroperable = onCall(
  { enforceAppCheck: true },
  async (request) => {
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

    const token = await leerAccessTokenComercio(uid, sucursalId);
    if (!token) {
      throw new HttpsError(
        'failed-precondition',
        'Falta configurar el Access Token de Mercado Pago en Configuración.',
      );
    }

    const { userId, externalPosId, qrImage } = await asegurarPosQr(
      token,
      uid,
      sucursalId,
    );

    const externalReference = ventaId || `qr_${uid}_${Date.now()}`;
    const WEBHOOK_QR_URL =
      'https://us-central1-khaleesy-system.cloudfunctions.net/mpWebhookQr';

    try {
      await db.collection('cobros_mp').doc(externalReference).set({
        userId: uid,
        sucursalId: sucursalId || null,
        monto: parseFloat(montoNum.toFixed(2)),
        descripcion: String(descripcion),
        estado: 'pendiente',
        via: 'qr_interoperable',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (e) {
      console.error('[QR] Error creando cobro pendiente:', e);
    }

    const montoFinal = parseFloat(montoNum.toFixed(2));
    const orderBody = {
      external_reference: externalReference,
      title: String(descripcion).substring(0, 200) || 'Venta',
      description: String(descripcion).substring(0, 200) || 'Venta',
      notification_url: `${WEBHOOK_QR_URL}?uid=${uid}&suc=${sucursalId || ''}`,
      total_amount: montoFinal,
      items: [
        {
          title: String(descripcion).substring(0, 200) || 'Venta',
          quantity: 1,
          unit_measure: 'unit',
          unit_price: montoFinal,
          total_amount: montoFinal,
        },
      ],
    };

    const orderR = await fetch(
      `${MP_API}/instore/orders/qr/seller/collectors/${userId}/pos/${externalPosId}/orders`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderBody),
      },
    );
    if (!orderR.ok) {
      const err = await orderR.json().catch(() => ({}));
      console.error('[QR] Error creando orden:', err);
      throw new HttpsError(
        'invalid-argument',
        `Mercado Pago: ${err?.message || 'no se pudo generar el QR.'}`,
      );
    }

    return { success: true, externalReference, qrImage };
  },
);

// Webhook del QR interoperable: confirma el pago y marca el cobro como pagado.
exports.mpWebhookQr = onRequest(async (req, res) => {
  try {
    const uid = req.query.uid;
    const sucId = req.query.suc;
    const topic = req.body?.type || req.query.type || req.query.topic;
    const resourceId =
      req.body?.data?.id || req.query['data.id'] || req.query.id;
    if (!uid || !resourceId) return res.status(200).send('ignored');

    const token = await leerAccessTokenComercio(uid, sucId);
    if (!token) return res.status(200).send('sin token');

    // Notificación de pago directo.
    if (topic === 'payment') {
      const pr = await fetch(`${MP_API}/v1/payments/${resourceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const pago = await pr.json();
      if (pr.ok && pago.external_reference && pago.status === 'approved') {
        await db
          .collection('cobros_mp')
          .doc(pago.external_reference)
          .set(
            {
              estado: 'pagado',
              paymentId: String(resourceId),
              montoPagado: pago.transaction_amount || null,
              metodoMP: 'qr_interoperable',
              actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
      }
      return res.status(200).send('ok');
    }

    // Notificación de merchant_order (lo típico del QR).
    if (topic === 'merchant_order') {
      const mr = await fetch(`${MP_API}/merchant_orders/${resourceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const mo = await mr.json();
      if (mr.ok && mo.external_reference) {
        const pagado =
          mo.order_status === 'paid' ||
          (mo.total_amount > 0 && (mo.paid_amount || 0) >= mo.total_amount);
        if (pagado) {
          await db
            .collection('cobros_mp')
            .doc(mo.external_reference)
            .set(
              {
                estado: 'pagado',
                paymentId: String(mo.payments?.[0]?.id || resourceId),
                montoPagado: mo.paid_amount || mo.total_amount || null,
                metodoMP: 'qr_interoperable',
                actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true },
            );
        }
      }
      return res.status(200).send('ok');
    }

    return res.status(200).send('ignored');
  } catch (error) {
    console.error('[QR webhook] Error:', error);
    return res.status(200).send('error');
  }
});

// ===============================================
// SUSCRIPCIONES: cobro con Mercado Pago (a la cuenta de la plataforma)
// ===============================================
const PLANES_PRECIO = { basic: 20000, premium: 35000 };
const PLANES_PRECIO_ANUAL = { basic: 200000, premium: 350000 };

exports.crearPagoSuscripcion = onCall(
  { secrets: [MP_PLATFORM_TOKEN], enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes estar autenticado.');
    }
    const uid = request.auth.uid;
    const email = request.auth.token?.email || '';
    const plan = ['basic', 'premium'].includes(request.data?.plan)
      ? request.data.plan
      : 'premium';
    const ciclo = request.data?.ciclo === 'anual' ? 'anual' : 'mensual';
    let precio =
      ciclo === 'anual' ? PLANES_PRECIO_ANUAL[plan] : PLANES_PRECIO[plan];

    // Precio preferencial (clientes anteriores al aumento). Se respeta mientras
    // no venza `precioLegacyHasta` (si no tiene fecha, es indefinido).
    try {
      const negSnap = await db.collection('datosNegocio').doc(uid).get();
      const neg = negSnap.exists ? negSnap.data() : null;
      const legacy = neg?.precioLegacy?.[plan];
      if (legacy) {
        const hasta = neg?.precioLegacyHasta
          ? new Date(
              typeof neg.precioLegacyHasta.toDate === 'function'
                ? neg.precioLegacyHasta.toDate()
                : neg.precioLegacyHasta,
            )
          : null;
        const vigente = !hasta || hasta.getTime() > Date.now();
        const valor = ciclo === 'anual' ? legacy.anual : legacy.mensual;
        if (vigente && Number(valor) > 0) precio = Number(valor);
      }
    } catch (e) {
      console.warn('[MP sub] no se pudo leer precioLegacy:', e?.message);
    }

    const token = MP_PLATFORM_TOKEN.value();
    if (!token) {
      throw new HttpsError(
        'failed-precondition',
        'Falta configurar el token de Mercado Pago de la plataforma.',
      );
    }

    const WEBHOOK_URL =
      'https://us-central1-khaleesy-system.cloudfunctions.net/mpWebhookSuscripcion';
    const externalReference = `sub_${uid}_${plan}_${Date.now()}`;

    // Origen del frontend (window.location.origin) para volver a la app al
    // terminar el pago. Se valida que sea una URL http(s) para no confiar en
    // texto arbitrario.
    const origin =
      typeof request.data?.origin === 'string' &&
      /^https?:\/\/[^\s]+$/.test(request.data.origin)
        ? request.data.origin.replace(/\/+$/, '')
        : null;

    const preference = {
      items: [
        {
          title: `Suscripción Khaleesi - Plan ${
            plan === 'premium' ? 'Completo' : 'Básico'
          } (${ciclo === 'anual' ? 'Anual' : 'Mensual'})`,
          quantity: 1,
          unit_price: precio,
          currency_id: 'ARS',
        },
      ],
      payer: email ? { email } : undefined,
      external_reference: externalReference,
      notification_url: `${WEBHOOK_URL}?uid=${uid}&plan=${plan}&ciclo=${ciclo}`,
      // 1 sola cuota: sin costo de financiación de cuotas (nada extra que te
      // descuenten por cuotas). El cliente paga con débito, dinero en cuenta o
      // tarjeta en 1 pago.
      payment_methods: { installments: 1, default_installments: 1 },
      metadata: { userId: uid, plan, tipo: 'suscripcion' },
    };

    // Al terminar el pago, MP devuelve al usuario a la app automáticamente.
    if (origin) {
      preference.back_urls = {
        success: `${origin}/dashboard?pago=ok`,
        pending: `${origin}/dashboard?pago=pendiente`,
        failure: `${origin}/payment-instructions?pago=error`,
      };
      // auto_return sólo con https (MP lo rechaza en http/localhost).
      if (origin.startsWith('https://')) {
        preference.auto_return = 'approved';
      }
    }

    try {
      const resp = await fetch(
        'https://api.mercadopago.com/checkout/preferences',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(preference),
        },
      );
      const data = await resp.json();
      if (!resp.ok) {
        console.error('[MP sub] rechazo al crear preferencia:', data);
        throw new HttpsError(
          'invalid-argument',
          `Mercado Pago: ${data?.message || 'no se pudo crear el pago.'}`,
        );
      }
      return {
        success: true,
        initPoint: data.init_point,
        sandboxInitPoint: data.sandbox_init_point,
        preferenceId: data.id,
        plan,
        precio,
      };
    } catch (error) {
      if (error.code) throw error;
      console.error('[MP sub] error de red:', error);
      throw new HttpsError('internal', 'No se pudo contactar con Mercado Pago.');
    }
  },
);

exports.mpWebhookSuscripcion = onRequest(
  { secrets: [MP_PLATFORM_TOKEN] },
  async (req, res) => {
    try {
      const uid = req.query.uid;
      const plan = ['basic', 'premium'].includes(req.query.plan)
        ? req.query.plan
        : null;
      const ciclo = req.query.ciclo === 'anual' ? 'anual' : 'mensual';
      const tipo = req.body?.type || req.query.type || req.query.topic;
      const paymentId =
        req.body?.data?.id || req.query['data.id'] || req.query.id;

      if (!uid || !paymentId || (tipo && tipo !== 'payment')) {
        return res.status(200).send('ignored');
      }

      const token = MP_PLATFORM_TOKEN.value();
      if (!token) return res.status(200).send('sin token');

      const r = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const pago = await r.json();
      if (!r.ok) {
        console.error('[MP sub webhook] error consultando pago:', pago);
        return res.status(200).send('error consulta');
      }

      console.log(
        `[MP sub webhook] uid=${uid} plan=${plan} status=${pago.status} extRef=${pago.external_reference}`,
      );

      // Solo reactivamos si el pago está aprobado y corresponde a este usuario.
      if (
        pago.status === 'approved' &&
        String(pago.external_reference || '').startsWith(`sub_${uid}`)
      ) {
        const dias = ciclo === 'anual' ? 365 : 30;
        const nuevaFecha = new Date();
        nuevaFecha.setDate(nuevaFecha.getDate() + dias);
        const updates = {
          subscriptionStatus: 'active',
          subscriptionEndDate: nuevaFecha,
        };
        if (plan) updates.plan = plan;
        await db.collection('datosNegocio').doc(uid).set(updates, { merge: true });
        console.log(
          `[MP sub webhook] Suscripción reactivada: ${uid} (+${dias} días)`,
        );

        // Comprobante de pago por email (best-effort; MP igual manda el suyo).
        try {
          const negocio = (
            await db.collection('datosNegocio').doc(uid).get()
          ).data();
          const dest = pago.payer?.email || negocio?.email;
          const emailCfg = functions.config().email || {};
          if (dest && emailCfg.user && emailCfg.pass) {
            const transporte = nodemailer.createTransport({
              service: 'gmail',
              auth: { user: emailCfg.user, pass: emailCfg.pass },
            });
            const monto = pago.transaction_amount || '';
            const fechaPago = new Date().toLocaleDateString('es-AR');
            const vence = nuevaFecha.toLocaleDateString('es-AR');
            await transporte.sendMail({
              from: `Khaleesi System <${emailCfg.user}>`,
              to: dest,
              subject: 'Comprobante de pago - Khaleesi System',
              html: `
                <h2>¡Gracias por tu pago!</h2>
                <p>Confirmamos la activación de tu suscripción.</p>
                <ul>
                  <li><strong>Plan:</strong> ${plan === 'premium' ? 'Completo' : 'Básico'} (${ciclo})</li>
                  <li><strong>Monto:</strong> $${monto}</li>
                  <li><strong>Fecha de pago:</strong> ${fechaPago}</li>
                  <li><strong>Pago Mercado Pago Nº:</strong> ${paymentId}</li>
                  <li><strong>Válido hasta:</strong> ${vence}</li>
                </ul>
                <p>Khaleesi System</p>`,
            });
            console.log(`[MP sub webhook] Comprobante enviado a ${dest}`);
          }
        } catch (mailErr) {
          console.warn('[MP sub webhook] No se pudo enviar comprobante:', mailErr?.message);
        }
      }

      return res.status(200).send('ok');
    } catch (error) {
      console.error('[MP sub webhook] Error:', error);
      return res.status(200).send('error');
    }
  },
);

// ===============================================
// BACKUP MANUAL DE DATOS
// ===============================================
/**
 * Recopila todos los datos de un usuario desde varias colecciones y los devuelve.
 */
exports.backupUserData = onCall({ enforceAppCheck: true }, async (request) => {
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
