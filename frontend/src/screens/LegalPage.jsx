// src/screens/LegalPage.jsx
//
// Términos y Condiciones + Política de Privacidad. Una sola pantalla con dos
// secciones ancladas (/terminos y /privacidad).

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Footer from '../components/Footer';

const EMPRESA = 'Khaleesi System';
const CONTACTO = 'khaleesisystempos@gmail.com';
const ACTUALIZADO = 'agosto de 2026';

const H2 = ({ children }) => (
  <h2 className="mb-3 mt-8 text-xl font-bold text-white">{children}</h2>
);
const P = ({ children }) => (
  <p className="mb-3 text-sm leading-relaxed text-zinc-300">{children}</p>
);
const LI = ({ children }) => (
  <li className="mb-1.5 text-sm leading-relaxed text-zinc-300">{children}</li>
);

function LegalPage() {
  const { pathname } = useLocation();
  const esPrivacidad = pathname.includes('privacidad');

  return (
    <div className="flex min-h-screen flex-col bg-zinc-900 text-zinc-200">
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft size={16} /> Volver al inicio
        </Link>

        <div className="mb-6 flex gap-2">
          <Link
            to="/terminos"
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
              !esPrivacidad
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            Términos y Condiciones
          </Link>
          <Link
            to="/privacidad"
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
              esPrivacidad
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            Política de Privacidad
          </Link>
        </div>

        {!esPrivacidad ? (
          <article>
            <h1 className="text-3xl font-bold text-white">
              Términos y Condiciones
            </h1>
            <p className="mt-1 text-xs text-zinc-500">
              Última actualización: {ACTUALIZADO}
            </p>

            <H2>1. Qué es este servicio</H2>
            <P>
              {EMPRESA} es un software de gestión comercial (punto de venta,
              stock, clientes, facturación electrónica y herramientas
              relacionadas) que se ofrece en modalidad de suscripción a través
              de internet. Al crear una cuenta aceptás estos términos.
            </P>

            <H2>2. Cuenta y uso</H2>
            <ul className="ml-5 list-disc">
              <LI>
                Sos responsable de la veracidad de los datos que cargás y de
                mantener en secreto tu contraseña.
              </LI>
              <LI>
                Sos responsable de la actividad realizada desde tu cuenta,
                incluida la de tus empleados o personas a las que le des acceso.
              </LI>
              <LI>
                No está permitido usar el servicio para actividades ilícitas, ni
                intentar vulnerar, revender o copiar el sistema.
              </LI>
            </ul>

            <H2>3. Planes, precios y pagos</H2>
            <ul className="ml-5 list-disc">
              <LI>
                Ofrecemos un plan <strong>Básico</strong> y un plan{' '}
                <strong>Completo</strong>, con facturación{' '}
                <strong>mensual o anual</strong>. Los precios vigentes se
                publican en la página principal e incluyen impuestos.
              </LI>
              <LI>
                El período de prueba es de <strong>7 días sin cargo</strong>. Al
                finalizar, para seguir usando el servicio hay que abonar el
                plan elegido.
              </LI>
              <LI>
                Los pagos se procesan a través de <strong>Mercado Pago</strong>.
                No almacenamos datos de tu tarjeta.
              </LI>
              <LI>
                La suscripción <strong>no tiene renovación automática</strong>:
                cada período se abona manualmente. Si no abonás, la cuenta queda
                suspendida y no podés operar, pero tus datos se conservan.
              </LI>
              <LI>
                Podemos actualizar los precios avisando con anticipación
                razonable. Los cambios no afectan un período ya abonado.
              </LI>
              <LI>
                Al ser un servicio digital de acceso inmediato con período de
                prueba gratuito previo, los importes abonados por un período en
                curso no son reintegrables, salvo que la ley aplicable disponga
                lo contrario.
              </LI>
            </ul>

            <H2>4. Facturación electrónica (ARCA/AFIP)</H2>
            <P>
              El plan Completo permite emitir comprobantes electrónicos
              conectándose a los servicios de ARCA (ex AFIP) con{' '}
              <strong>tus propios certificados y punto de venta</strong>. Vos
              sos el emisor y el único responsable frente al organismo por el
              contenido, la veracidad y la oportunidad de los comprobantes
              emitidos, así como por tus obligaciones fiscales. {EMPRESA} es una
              herramienta que transmite la información que vos cargás y no
              presta asesoramiento contable ni impositivo.
            </P>
            <P>
              No respondemos por caídas, demoras o rechazos de los servicios de
              ARCA ni por comprobantes emitidos con datos incorrectos.
            </P>

            <H2>5. Funciones con inteligencia artificial</H2>
            <P>
              Algunas funciones del plan Completo usan inteligencia artificial
              (identificar productos desde una foto, leer facturas de
              proveedores, sugerencias, asistente y venta por voz). Los
              resultados son <strong>sugerencias automáticas</strong> que pueden
              contener errores: siempre debés revisarlos antes de confirmarlos.
              Las acciones sobre tus datos requieren tu confirmación expresa.
              Estas funciones tienen límites de uso diario razonables.
            </P>

            <H2>6. Medios de pago y hardware de terceros</H2>
            <P>
              Las integraciones con Mercado Pago (QR, links, posnet), balanzas,
              impresoras y otros dispositivos dependen de servicios y equipos de
              terceros. Su disponibilidad, comisiones y condiciones son
              responsabilidad de cada proveedor. Las comisiones que cobre el
              procesador de pagos por tus cobros corren por tu cuenta.
            </P>

            <H2>7. Disponibilidad del servicio</H2>
            <P>
              Trabajamos para que el servicio esté disponible de forma continua,
              pero puede haber interrupciones por mantenimiento, fallas de
              terceros (proveedores de nube, internet, ARCA, pasarelas de pago) o
              causas de fuerza mayor. No garantizamos disponibilidad
              ininterrumpida.
            </P>

            <H2>8. Tus datos y copias de seguridad</H2>
            <P>
              La información que cargás es tuya. Podés exportarla desde el
              sistema en cualquier momento y te recomendamos hacer copias
              periódicas. Si cancelás, conservamos tus datos por un tiempo
              prudencial para que puedas recuperarlos; luego pueden ser
              eliminados.
            </P>

            <H2>9. Responsabilidad</H2>
            <P>
              El servicio se ofrece “tal como está”. En la medida permitida por
              la ley, nuestra responsabilidad total frente a cualquier reclamo se
              limita al importe abonado por vos en los últimos 3 meses. No
              respondemos por lucro cesante ni por pérdidas indirectas.
            </P>

            <H2>10. Baja y cancelación</H2>
            <P>
              Podés dejar de usar el servicio cuando quieras: simplemente no
              abonás el período siguiente. También podés pedir la eliminación de
              tu cuenta escribiéndonos. Podemos suspender cuentas que incumplan
              estos términos.
            </P>

            <H2>11. Ley aplicable</H2>
            <P>
              Estos términos se rigen por las leyes de la República Argentina.
              Ante cualquier controversia se aplicarán, cuando corresponda, las
              normas de defensa del consumidor. Consultas: {CONTACTO}.
            </P>
          </article>
        ) : (
          <article>
            <h1 className="text-3xl font-bold text-white">
              Política de Privacidad
            </h1>
            <p className="mt-1 text-xs text-zinc-500">
              Última actualización: {ACTUALIZADO}
            </p>

            <H2>1. Quién trata tus datos</H2>
            <P>
              {EMPRESA} (Córdoba, Argentina) es responsable del tratamiento de
              los datos personales que se registran en el servicio. Contacto:{' '}
              {CONTACTO}.
            </P>

            <H2>2. Qué datos recopilamos</H2>
            <ul className="ml-5 list-disc">
              <LI>
                <strong>De tu cuenta:</strong> nombre del negocio, email,
                teléfono, domicilio, CUIT y datos fiscales que cargues.
              </LI>
              <LI>
                <strong>De tu operación:</strong> productos, ventas,
                comprobantes, caja, proveedores y demás información que cargues
                para gestionar tu comercio.
              </LI>
              <LI>
                <strong>De tus clientes:</strong> los datos que vos cargues
                (nombre, CUIT/CUIL, teléfono, email, cuenta corriente). Si usás
                la lectura de DNI, se procesan los datos del documento para
                completar la ficha del cliente.
              </LI>
              <LI>
                <strong>Técnicos:</strong> datos de uso, dispositivo y registros
                de acceso, necesarios para seguridad y funcionamiento.
              </LI>
            </ul>
            <P>
              <strong>No almacenamos datos de tarjetas.</strong> Los pagos los
              procesa Mercado Pago con su propia política de privacidad.
            </P>

            <H2>3. Para qué los usamos</H2>
            <ul className="ml-5 list-disc">
              <LI>Prestar el servicio y las funciones que activás.</LI>
              <LI>Emitir comprobantes ante ARCA cuando vos lo solicitás.</LI>
              <LI>Procesar tu suscripción y enviarte el comprobante de pago.</LI>
              <LI>Soporte, seguridad, prevención de fraude y mejoras.</LI>
            </ul>
            <P>
              No vendemos tus datos ni los de tus clientes, ni los usamos para
              publicidad de terceros.
            </P>

            <H2>4. Con quién los compartimos</H2>
            <P>
              Solo con proveedores necesarios para operar, que actúan por cuenta
              nuestra o tuya:
            </P>
            <ul className="ml-5 list-disc">
              <LI>
                <strong>Google Firebase</strong> (Google Cloud): alojamiento de
                datos, autenticación y funciones del servidor.
              </LI>
              <LI>
                <strong>Netlify</strong>: publicación del sitio.
              </LI>
              <LI>
                <strong>Mercado Pago</strong>: procesamiento de pagos.
              </LI>
              <LI>
                <strong>ARCA (ex AFIP)</strong>: cuando emitís comprobantes
                electrónicos.
              </LI>
              <LI>
                <strong>Google (Gemini)</strong>: solo si usás funciones de
                inteligencia artificial; se envía el contenido necesario para
                procesar tu pedido (por ejemplo, la foto de un producto o
                factura).
              </LI>
            </ul>
            <P>
              Algunos de estos proveedores procesan información fuera de la
              Argentina, con resguardos contractuales adecuados.
            </P>

            <H2>5. Tienda online pública</H2>
            <P>
              Si activás la tienda online, los productos que publiques (nombre,
              precio y foto) quedan <strong>visibles públicamente</strong> para
              quien acceda al enlace o escanee el QR. Podés desactivarla en
              cualquier momento desde Configuración.
            </P>

            <H2>6. Seguridad</H2>
            <P>
              Usamos cifrado en tránsito (HTTPS), autenticación gestionada por
              Google (las contraseñas se guardan cifradas y no tenemos acceso a
              ellas), reglas de acceso por usuario y verificación de aplicación
              para bloquear pedidos ajenos al sistema. Ningún sistema es
              infalible: te recomendamos usar una contraseña fuerte y no
              compartirla.
            </P>

            <H2>7. Conservación</H2>
            <P>
              Conservamos la información mientras tu cuenta esté activa y por el
              plazo que exijan las normas fiscales y contables. Luego se elimina
              o se anonimiza.
            </P>

            <H2>8. Tus derechos</H2>
            <P>
              Podés solicitar acceso, rectificación, actualización o supresión de
              tus datos personales escribiendo a {CONTACTO}. Conforme a la Ley
              25.326 de Protección de los Datos Personales, el titular de los
              datos tiene derecho a solicitar el retiro o bloqueo de su nombre de
              los bancos de datos. La Agencia de Acceso a la Información Pública,
              órgano de control de la Ley N.º 25.326, tiene la atribución de
              atender denuncias y reclamos por incumplimiento de las normas sobre
              protección de datos personales.
            </P>
            <P>
              <strong>Importante:</strong> respecto de los datos de tus propios
              clientes, vos sos el responsable de haberlos obtenido de forma
              lícita y de atender sus derechos; nosotros actuamos como prestador
              del servicio por cuenta tuya.
            </P>

            <H2>9. Cambios</H2>
            <P>
              Podemos actualizar esta política. Publicaremos la versión vigente
              en esta página con su fecha de actualización.
            </P>
          </article>
        )}
      </main>
      <Footer simple />
    </div>
  );
}

export default LegalPage;
