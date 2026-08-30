// frontend/src/utils/image.js
//
// Redimensiona/comprime una imagen a un tamaño máximo (JPEG) en el navegador,
// para que las subidas a Storage sean livianas. Si algo falla, devuelve el
// archivo original.

// Dibuja la imagen ya escalada en un canvas, siempre sobre fondo blanco.
//
// Lo del fondo importa: un canvas nace transparente y el JPEG no tiene canal
// alfa, así que al convertir, lo transparente se rellena con NEGRO. Un logo PNG
// recortado —que es como vienen casi todos— terminaba como un rectángulo negro
// arriba de la factura. Pintando blanco primero, sale como se espera sobre el
// papel.
const dibujarEnCanvas = (img, maxSize) => {
  let { width, height } = img;
  if (width > height && width > maxSize) {
    height = Math.round((height * maxSize) / width);
    width = maxSize;
  } else if (height > maxSize) {
    width = Math.round((width * maxSize) / height);
    height = maxSize;
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
};

const conLaImagen = (file, hacer, siFalla) =>
  new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      hacer(img, resolve);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(siFalla);
    };
    img.src = url;
  });

export const resizeImage = (file, maxSize = 800, quality = 0.8) =>
  conLaImagen(
    file,
    (img, resolve) =>
      dibujarEnCanvas(img, maxSize).toBlob(
        (blob) => resolve(blob || file),
        'image/jpeg',
        quality,
      ),
    file,
  );

// La misma imagen, pero como data URL.
//
// Sirve para lo que hay que dibujar sin depender de la red: el logo dentro de
// un PDF, por ejemplo. Guardado así, el comprobante se arma al instante y sale
// igual aunque Storage no conteste, aunque la conexión esté caída o aunque el
// navegador bloquee la descarga cruzada.
export const imagenADataUrl = (file, maxSize = 320, quality = 0.85) =>
  conLaImagen(
    file,
    (img, resolve) =>
      resolve(dibujarEnCanvas(img, maxSize).toDataURL('image/jpeg', quality)),
    null,
  );
