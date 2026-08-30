// src/components/ThreeBackground.jsx
//
// Fondo animado de la landing.
//
// En una computadora es un campo de partículas con Three.js: profundidad real
// y parallax siguiendo el mouse.
//
// En un celular NO se carga Three.js y se dibuja un cielo equivalente con CSS.
// El motivo es concreto: la librería son 734 KB (unos 180 KB comprimidos) que
// hay que bajar, parsear y compilar, más un canvas WebGL renderizando sin
// parar. En un teléfono de gama media eso se paga en segundos de espera y en
// batería, y esta página es donde aterriza la gente que hace clic en los
// anuncios: casi toda desde el celular y con datos móviles. El fondo de CSS
// pesa cero y se ve prácticamente igual a ese tamaño de pantalla.
//
// Respeta prefers-reduced-motion y limpia todo al desmontar.

import React, { useEffect, useRef, useState } from 'react';

// Las estrellas de CSS: puntos de distintos tamaños y brillos, con posiciones
// fijas —no aleatorias— para que el fondo no cambie en cada carga.
const ESTRELLAS = [
  '12% 18%',
  '78% 8%',
  '35% 62%',
  '92% 44%',
  '5% 77%',
  '61% 27%',
  '24% 91%',
  '88% 71%',
  '47% 12%',
  '70% 55%',
  '18% 40%',
  '55% 84%',
  '83% 22%',
  '30% 33%',
  '96% 88%',
  '8% 55%',
  '65% 95%',
  '41% 48%',
];

const cieloCss = ESTRELLAS.map(
  (pos, i) =>
    `radial-gradient(${i % 3 === 0 ? 2 : 1.5}px ${i % 3 === 0 ? 2 : 1.5}px at ${pos}, rgba(56,189,248,${i % 2 ? 0.45 : 0.28}), transparent)`,
).join(', ');

// ¿Conviene ahorrarle el trabajo a este dispositivo?
//
// El ancho decide casi todo, pero también se miran las señales que el navegador
// da sobre el equipo y la conexión: un teléfono con poca memoria o alguien con
// el ahorro de datos activado tampoco quiere bajar una librería 3D.
function prefiereLiviano() {
  if (typeof window === 'undefined') return true;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
    return true;
  if (window.innerWidth < 768) return true;
  if (navigator.deviceMemory && navigator.deviceMemory <= 4) return true;
  if (navigator.connection?.saveData) return true;
  return false;
}

function ThreeBackground() {
  const mountRef = useRef(null);
  // Arranca en liviano y solo sube a 3D si corresponde: así el primer pintado
  // nunca espera a una decisión.
  const [liviano, setLiviano] = useState(true);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || prefiereLiviano()) return undefined;

    setLiviano(false);
    let limpiar = null;
    let vivo = true;

    // three.js se carga aparte para no pesar en el arranque de la página.
    import('three').then((THREE) => {
      if (!vivo) return;
      limpiar = iniciar(THREE, mount);
    });

    return () => {
      vivo = false;
      if (limpiar) limpiar();
    };
  }, []);

  // Toda la escena vive acá; devuelve la función de limpieza.
  function iniciar(THREE, mount) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      70,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000,
    );
    camera.position.z = 6;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
      return undefined; // sin WebGL: no pasa nada, queda el fondo de CSS.
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    // --- Partículas ---
    const COUNT = 3000;
    const positions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 22;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 22;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 22;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x38bdf8, // sky-400
      size: 0.035,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    // --- Parallax con el mouse ---
    const target = { x: 0, y: 0 };
    const onMouse = (e) => {
      target.x = (e.clientX / window.innerWidth - 0.5) * 0.6;
      target.y = (e.clientY / window.innerHeight - 0.5) * 0.6;
    };
    window.addEventListener('mousemove', onMouse);

    // --- Resize ---
    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // Con la pestaña en segundo plano no se dibuja nada: el navegador ya frena
    // el requestAnimationFrame, pero así tampoco queda un frame a medias.
    let raf;
    const clock = new THREE.Clock();
    const animate = () => {
      const t = clock.getElapsedTime();
      points.rotation.y = t * 0.03;
      points.rotation.x = t * 0.01;
      // parallax suave de cámara
      camera.position.x += (target.x - camera.position.x) * 0.04;
      camera.position.y += (-target.y - camera.position.y) * 0.04;
      camera.lookAt(scene.position);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouse);
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
      style={liviano ? { backgroundImage: cieloCss } : undefined}
    />
  );
}

export default ThreeBackground;
