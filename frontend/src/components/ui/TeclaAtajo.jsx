// La etiqueta con la tecla que va al lado de un botón: [Cobrar F2].
//
// Es cómo se aprenden los atajos sin que nadie lea un manual: el cajero la ve
// mientras hace clic y a los dos días usa la tecla. Por eso va en el botón y no
// escondida en una ventana de ayuda.
//
// Se oculta en pantallas chicas: en un celular no hay teclado físico y el
// cartelito solo ocuparía lugar.

function TeclaAtajo({ children, className = '' }) {
  return (
    <kbd
      aria-hidden="true"
      className={
        'ml-2 hidden rounded border border-white/25 px-1.5 py-0.5 ' +
        'font-sans text-[10px] font-semibold leading-none tracking-wide ' +
        'opacity-70 sm:inline-block ' +
        className
      }
    >
      {children}
    </kbd>
  );
}

export default TeclaAtajo;
