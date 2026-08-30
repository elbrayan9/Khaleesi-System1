// La bóveda del Access Token de Mercado Pago.
//
// Está en su propio archivo por dos motivos. Uno: es la credencial más valiosa
// del sistema —permite cobrar y hacer devoluciones en nombre del comercio— y
// conviene que su manejo se lea de un tirón, sin buscarlo entre dos mil líneas.
// Dos: recibiendo la base por parámetro se puede ejercitar contra el emulador,
// que es la única forma de comprobar de verdad que un comercio no alcanza el
// token de otro.

/**
 * @param {FirebaseFirestore.Firestore} db
 * @param {typeof import('firebase-admin')} admin
 */
function crearBoveda(db, admin, { esDuenoDeSucursal }) {
  // ---------------------------------------------------------------------------
  // El Access Token de Mercado Pago del comercio
  //
  // Es una credencial de alto valor: permite cobrar, consultar movimientos y
  // hacer devoluciones. Vivía en `sucursales/{id}.configuracion.mpAccessToken`,
  // junto al resto de la configuración, y ahí tenía un problema: ese documento se
  // descarga ENTERO al navegador del dueño en cada sesión. O sea que el token
  // quedaba en memoria del cliente y persistido en el IndexedDB del navegador de
  // la computadora del local. Un XSS en el sistema —ya tuvimos uno en el aviso de
  // pedidos— alcanzaba para llevarse la cuenta de Mercado Pago del comercio.
  //
  // Ahora vive en `secretosMp`, una colección que las reglas le niegan por
  // completo al cliente. Solo se lee desde acá, con el Admin SDK, que no pasa por
  // las reglas. El navegador nunca más lo ve: de la pantalla de configuración
  // sale hacia una función y no vuelve.
  // ---------------------------------------------------------------------------

  const refSecretoMp = (uid, sucursalId) =>
    db
      .collection('secretosMp')
      .doc(sucursalId ? `suc_${sucursalId}` : `uid_${uid}`);

  /**
   * Devuelve el Access Token del comercio, mirando primero la bóveda.
   *
   * Si todavía está en el lugar viejo, lo muda y lo borra de ahí. La migración va
   * acá y no en un script aparte porque así ocurre sola en el primer cobro de
   * cada comercio, sin ventana en la que alguien se quede sin poder cobrar.
   */
  async function leerAccessTokenComercio(uid, sucursalId) {
    // **Quién pide, y de qué sucursal.**
    //
    // Todas las funciones que cobran reciben el `sucursalId` del navegador y lo
    // traen hasta acá. Sin este control, un comercio podía mandar el id de otro
    // —que es público: está en la URL de su tienda online— y operar con la cuenta
    // de Mercado Pago ajena: generar cobros, listar los pagos, cancelar los del
    // posnet. La verificación va en el lector y no en cada función porque es el
    // único lugar por donde pasan todas; en cada llamador sería cuestión de
    // tiempo que a la próxima se le olvide.
    //
    // Devuelve null en vez de lanzar: los que llaman ya saben qué hacer sin
    // token, los webhooks tienen que contestar 200 igual, y así tampoco se
    // delata si esa sucursal existe.
    if (sucursalId && !(await esDuenoDeSucursal(db, uid, sucursalId))) {
      console.warn(
        `[MP] Pedido de token para una sucursal ajena. uid=${uid} suc=${sucursalId}`,
      );
      return null;
    }

    try {
      const doc = await refSecretoMp(uid, sucursalId).get();
      if (doc.exists && doc.data()?.accessToken) return doc.data().accessToken;
      // Sin sucursal el secreto puede estar guardado a nombre del dueño.
      if (sucursalId) {
        const porDueno = await refSecretoMp(uid, null).get();
        if (porDueno.exists && porDueno.data()?.accessToken) {
          return porDueno.data().accessToken;
        }
      }
    } catch (e) {
      console.error('[MP] Error leyendo el token de la bóveda:', e);
    }

    // --- Lugar viejo, con mudanza ---
    let token = null;
    let origen = null;
    try {
      if (sucursalId) {
        const sucDoc = await db.collection('sucursales').doc(sucursalId).get();
        if (sucDoc.exists) {
          const d = sucDoc.data();
          token = d?.configuracion?.mpAccessToken || d?.mpAccessToken || null;
          if (token) origen = { tipo: 'sucursal', id: sucursalId };
        }
      }
      if (!token) {
        const negDoc = await db.collection('datosNegocio').doc(uid).get();
        if (negDoc.exists) {
          token = negDoc.data()?.mpAccessToken || null;
          if (token) origen = { tipo: 'negocio', id: uid };
        }
      }
    } catch (e) {
      console.error('[MP] Error leyendo Access Token:', e);
    }

    if (token && origen) {
      try {
        await guardarSecretoMp(uid, sucursalId, token);
        await limpiarTokenViejo(origen);
        console.log(
          `[MP] Token mudado a la bóveda (${origen.tipo}=${origen.id})`,
        );
      } catch (e) {
        // Si la mudanza falla, el cobro sigue andando con el token viejo.
        console.error('[MP] No se pudo mudar el token:', e);
      }
    }
    return token;
  }

  /** Guarda el token en la bóveda, con los datos no sensibles para mostrar. */
  async function guardarSecretoMp(uid, sucursalId, accessToken, cuenta = null) {
    await refSecretoMp(uid, sucursalId).set(
      {
        accessToken,
        uid,
        sucursalId: sucursalId || null,
        ultimos4: String(accessToken).slice(-4),
        cuenta: cuenta || null,
        actualizado: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  // Al migrar, el token se borra del lugar viejo.
  //
  // Estuvo en false unas horas: el backend se desplegó primero y el frontend
  // quedó sin publicar, y aquel frontend decidía si mostrar el menú "Pagos
  // recibidos" mirando `mpAccessToken` en la configuración. Borrarlo antes le
  // habría hecho desaparecer ese menú al comercio sin ninguna explicación.
  //
  // Con el frontend nuevo publicado —ya mira `mpConfigurado`— el borrado se
  // activa: es el paso que efectivamente saca el token del alcance del navegador.
  const BORRAR_TOKEN_VIEJO = true;

  /** Borra el token del lugar viejo, ya copiado a la bóveda. */
  async function limpiarTokenViejo(origen) {
    if (!BORRAR_TOKEN_VIEJO) {
      // Se marca igual, que es lo que mira el frontend nuevo.
      const marca = { mpConfigurado: true };
      if (origen.tipo === 'sucursal') {
        await db
          .collection('sucursales')
          .doc(origen.id)
          .set({ configuracion: marca }, { merge: true });
      } else {
        await db
          .collection('datosNegocio')
          .doc(origen.id)
          .set(marca, { merge: true });
      }
      return;
    }
    const borrar = admin.firestore.FieldValue.delete();
    if (origen.tipo === 'sucursal') {
      await db
        .collection('sucursales')
        .doc(origen.id)
        .set(
          {
            mpAccessToken: borrar,
            configuracion: { mpAccessToken: borrar, mpConfigurado: true },
          },
          { merge: true },
        );
    } else {
      await db
        .collection('datosNegocio')
        .doc(origen.id)
        .set({ mpAccessToken: borrar, mpConfigurado: true }, { merge: true });
    }
  }
  return {
    refSecretoMp,
    leerAccessTokenComercio,
    guardarSecretoMp,
    limpiarTokenViejo,
    BORRAR_TOKEN_VIEJO,
  };
}

module.exports = { crearBoveda };
