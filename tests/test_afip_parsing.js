const fs = require("fs");

// Simulación de respuestas XML de AFIP
const xmlMonotributo = `
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
        <ns2:getPersonaResponse xmlns:ns2="http://a13.soap.ws.server.puc.sr/">
            <personaReturn>
                <datosGenerales>
                    <apellido>PEREZ</apellido>
                    <nombre>JUAN</nombre>
                    <idPersona>20123456789</idPersona>
                </datosGenerales>
                <datosMonotributo>
                    <categoria>A</categoria>
                </datosMonotributo>
            </personaReturn>
        </ns2:getPersonaResponse>
    </soap:Body>
</soap:Envelope>
`;

const xmlRI = `
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
        <ns2:getPersonaResponse xmlns:ns2="http://a13.soap.ws.server.puc.sr/">
            <personaReturn>
                <datosGenerales>
                    <razonSocial>EMPRESA S.A.</razonSocial>
                    <idPersona>30123456789</idPersona>
                </datosGenerales>
                <datosRegimenGeneral>
                    <impuesto>
                        <descripcionImpuesto>IVA</descripcionImpuesto>
                        <idImpuesto>30</idImpuesto>
                    </impuesto>
                </datosRegimenGeneral>
            </personaReturn>
        </ns2:getPersonaResponse>
    </soap:Body>
</soap:Envelope>
`;

function parseAfipResponse(text) {
  let tipoResponsable = "Consumidor Final";

  // Lógica mejorada de detección (COPIADA DE afipController.js)
  const esMonotributo =
    text.includes("<monotributo>") || text.includes("<datosMonotributo>");
  const esRI =
    text.includes("<idImpuesto>30</idImpuesto>") ||
    text.includes("<descripcionImpuesto>IVA</descripcionImpuesto>");
  const esExento =
    text.includes("<idImpuesto>32</idImpuesto>") ||
    text.includes("<descripcionImpuesto>IVA EXENTO</descripcionImpuesto>");

  if (esRI) tipoResponsable = "Responsable Inscripto";
  else if (esMonotributo) tipoResponsable = "Responsable Monotributo";
  else if (esExento) tipoResponsable = "Exento";

  return tipoResponsable;
}

console.log("Test Monotributo:", parseAfipResponse(xmlMonotributo));
console.log("Test RI:", parseAfipResponse(xmlRI));
