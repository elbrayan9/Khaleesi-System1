#!/usr/bin/env bash
# Regenera las 4 locuciones con la voz clonada y vuelve a renderizar los videos.
#
#   bash videos/rehacer-con-voz.sh
#
# Requiere que exista c:\dev\vozarg\mi-voz.wav (la referencia) y el venv de vozarg.
set -u

VOZ="/c/dev/vozarg"
VIDEOS="/c/Users/brian/khaleesi-system1/videos"
PY="$VOZ/.venv/Scripts/python.exe"

# proyecto -> texto -> nombre del render
declare -A TEXTO=(
  [khaleesi-promo]=v1
  [khaleesi-promo-2]=v2
  [khaleesi-promo-3]=v3
  [khaleesi-promo-4]=v4
)
declare -A RENDER=(
  [khaleesi-promo]=khaleesi-foto-ia-voz
  [khaleesi-promo-2]=khaleesi-tienda-pedidos-voz
  [khaleesi-promo-3]=khaleesi-todo-en-uno-voz
  [khaleesi-promo-4]=khaleesi-completo
)

echo "=== 1. Generando locuciones con la voz clonada ==="
for proy in "${!TEXTO[@]}"; do
  t="${TEXTO[$proy]}"
  if [ -f "$VOZ/out/${t}_arg.wav" ]; then
    echo "  $t: ya existe, se omite"
    continue
  fi
  echo "  $t: generando..."
  (cd "$VOZ" && "$PY" clonar.py --texto "$t.txt" --voz mi-voz.wav --salida "out/${t}_arg.wav" 2>&1 | tail -1)
done

echo
echo "=== 2. Copiando audio y ajustando duraciones ==="
for proy in "${!TEXTO[@]}"; do
  t="${TEXTO[$proy]}"
  src="$VOZ/out/${t}_arg.wav"
  [ -f "$src" ] || { echo "  $proy: falta $src, se omite"; continue; }

  cp "$src" "$VIDEOS/$proy/assets/audio/vo.wav"
  dur=$("$PY" -c "import soundfile as sf; d,sr=sf.read(r'$src'); print(round(len(d)/sr,2))")

  # la pista de voz no puede pasarse del largo del video o se corta el cierre
  largo=$(grep -oP 'data-composition-id="main"[^>]*data-duration="\K[\d.]+' "$VIDEOS/$proy/index.html" | head -1)
  echo "  $proy: locucion ${dur}s / video ${largo:-?}s"

  python - "$VIDEOS/$proy/index.html" "$dur" <<'PY'
import io, re, sys
p, dur = sys.argv[1], sys.argv[2]
s = io.open(p, encoding='utf-8').read()
s = re.sub(r'(id="vo-locucion".*?data-duration=")[\d.]+(")', r'\g<1>' + dur + r'\g<2>', s, flags=re.S)
io.open(p, 'w', encoding='utf-8').write(s)
PY
done

echo
echo "=== 3. Verificando y renderizando ==="
for proy in "${!TEXTO[@]}"; do
  echo "--- $proy"
  cd "$VIDEOS/$proy" || continue
  npx hyperframes check 2>&1 | grep -E "^◇  Check"
  npx hyperframes render --skill=product-launch-video --quality high --workers 4 \
      --output "renders/${RENDER[$proy]}.mp4" 2>&1 | grep -E "^◇  C:|MB ·"
done

echo
echo "Listo. Los MP4 quedaron en videos/<proyecto>/renders/"
