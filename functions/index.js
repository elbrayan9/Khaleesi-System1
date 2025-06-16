const functions = require("firebase-functions");
const admin = require("firebase-admin");
// CAMBIO 1: Importamos 'onCall' desde la nueva ubicación para funciones v2
const { onCall } = require("firebase-functions/v2/https");

admin.initializeApp();

// --- TODAS LAS FUNCIONES ACTUALIZADAS A SINTAXIS V2 ---

exports.addAdminRole = onCall(async (request) => {
    // En v2, los datos y la autenticación vienen en el objeto 'request'
    
    // Dejamos la seguridad comentada para crear el primer admin
    
    if (!request.auth || request.auth.token.admin !== true) {
        throw new functions.https.HttpsError('permission-denied', 'Solo un administrador puede realizar esta acción.');
    }
    

    const email = request.data.email;
    if (!email || typeof email !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'El email debe ser proporcionado y ser un texto válido.');
    }

    try {
        const user = await admin.auth().getUserByEmail(email);
        await admin.auth().setCustomUserClaims(user.uid, { admin: true });
        return { message: `Éxito! El usuario ${email} ahora es administrador.` };
    } catch (err) {
        console.error("Error al asignar rol de admin:", err);
        throw new functions.https.HttpsError('internal', 'Ocurrió un error al intentar asignar el rol.');
    }
});

exports.listAllUsers = onCall(async (request) => {
    if (!request.auth || request.auth.token.admin !== true) {
        throw new functions.https.HttpsError('permission-denied', 'Solo un administrador puede realizar esta acción.');
    }

    try {
        const userRecords = await admin.auth().listUsers(1000);
        const firestore = admin.firestore();
        const promises = userRecords.users.map(async (user) => {
            const userDocRef = firestore.collection('datosNegocio').doc(user.uid);
            const userDoc = await userDocRef.get();
            return {
                uid: user.uid,
                email: user.email,
                fechaCreacion: user.metadata.creationTime,
                ultimoLogin: user.metadata.lastSignInTime,
                datosNegocio: userDoc.exists ? userDoc.data() : { subscriptionStatus: 'desconocido', subscriptionEndDate: null }
            };
        });
        const usersData = await Promise.all(promises);
        return usersData;
    } catch (error) {
        console.error("Error al listar usuarios:", error);
        throw new functions.https.HttpsError('internal', 'No se pudo obtener la lista de usuarios.');
    }
});

exports.getUserDetails = onCall(async (request) => {
    if (!request.auth || request.auth.token.admin !== true) {
        throw new functions.https.HttpsError('permission-denied', 'Solo un administrador puede ver los detalles.');
    }
    const userId = request.data.userId;
    if (!userId) {
        throw new functions.https.HttpsError('invalid-argument', 'Se requiere un ID de usuario.');
    }
    try {
        const firestore = admin.firestore();
        const collectionsToFetch = ['productos', 'clientes', 'ventas', 'notas_cd'];
        const promises = collectionsToFetch.map(col => firestore.collection(col).where('userId', '==', userId).get());
        const [productosSnap, clientesSnap, ventasSnap, notasCDSnap] = await Promise.all(promises);
        const getData = (snapshot) => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return {
            productos: getData(productosSnap),
            clientes: getData(clientesSnap),
            ventas: getData(ventasSnap),
            notasCD: getData(notasCDSnap),
        };
    } catch (error) {
        console.error("Error al obtener detalles del usuario:", error);
        throw new functions.https.HttpsError('internal', 'No se pudo obtener los detalles del usuario.');
    }
});

exports.updateUserSubscription = onCall(async (request) => {
    if (!request.auth || request.auth.token.admin !== true) {
        throw new functions.https.HttpsError('permission-denied', 'Solo un administrador puede modificar suscripciones.');
    }
    const { userId, newStatus } = request.data;
    if (!userId || !['active', 'trial', 'expired'].includes(newStatus)) {
        throw new functions.https.HttpsError('invalid-argument', 'Faltan datos o el nuevo estado es inválido.');
    }
    try {
        const userDocRef = admin.firestore().collection('datosNegocio').doc(userId);
        const updates = { subscriptionStatus: newStatus };
        if (newStatus === 'active') {
            const newEndDate = new Date();
            newEndDate.setDate(newEndDate.getDate() + 30);
            updates.subscriptionEndDate = newEndDate;
        }
        await userDocRef.update(updates);
        return { success: true, message: `Usuario actualizado a estado '${newStatus}'.` };
    } catch (error) {
        console.error("Error al actualizar la suscripción:", error);
        throw new functions.https.HttpsError('internal', 'No se pudo actualizar la suscripción del usuario.');
    }
});