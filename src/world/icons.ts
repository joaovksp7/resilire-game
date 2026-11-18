import { CanvasTexture, SRGBColorSpace } from 'three';

// Ícones desenhados em código: caminhos no formato SVG, numa área de 24×24.
// São preenchidos com a regra "evenodd" (as partes internas viram furos).
// Os mesmos caminhos servem para a placa 3D (Path2D) e, na Fase 4, para os pins em <svg>.

/** Círculo como caminho SVG (para olhos de ícone, cabeças, furos). */
function circle(cx: number, cy: number, r: number): string {
  return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
}

export const ICONS = {
  // Triângulo de atenção com "!"
  alerta: 'M12 2L23 21H1Z M11 8h2v7h-2Z M11 16.5h2v2h-2Z',
  // Chama
  chama:
    'M12 2C10.5 6 5 9 5 15a7 7 0 0 0 14 0c0-3-1.6-5.6-3.6-7.6c0 2.6-1.2 4.2-2.6 4.8C13.2 9 13.2 5.2 12 2Z',
  // Livro aberto
  livro: 'M2 5C5 4 9 4 11 6V20C9 18.6 5 18.4 2 19.4Z M22 5C19 4 15 4 13 6V20C15 18.6 19 18.4 22 19.4Z',
  // Cruz
  cruz: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z',
  // Casa com coração
  abrigo:
    'M12 2L23 11H20V22H4V11H1Z M12 20C7.5 16.8 7.6 12.4 10 12.4C11 12.4 11.6 13 12 13.6C12.4 13 13 12.4 14 12.4C16.4 12.4 16.5 16.8 12 20Z',
  // Rádio com antena
  radio: `M3 9H21V21H3Z M6 9L17 3L17.9 4.8L9.6 9Z ${circle(9, 15, 3.2)} M15 12h3v2h-3Z M15 16h3v2h-3Z`,
  // Sacola de compras
  sacola: 'M4 8H20L19 21H5Z M8 8V6a4 4 0 0 1 8 0V8H14.5V6a2.5 2.5 0 0 0-5 0V8Z',
  // Prédio com uma cruz vazada (o Hospital; a UBS usa a cruz sozinha)
  hospital: 'M8 2H16V6H8Z M3 6H21V22H3Z M10.5 8.5h3v3h3v3h-3v3h-3v-3h-3v-3h3Z',
  // Pata de animal
  pata: `${circle(5, 10, 2.2)} ${circle(9.2, 5.5, 2.3)} ${circle(14.8, 5.5, 2.3)} ${circle(19, 10, 2.2)} M12 12c-3.5 0-6.5 4-6.5 6.5c0 2 1.6 3 3.3 3c1.3 0 2.1-0.6 3.2-0.6s1.9 0.6 3.2 0.6c1.7 0 3.3-1 3.3-3c0-2.5-3-6.5-6.5-6.5Z`,
  // Casa com porta
  casa: 'M12 2L23 11H20V22H4V11H1Z M10 15H14V22H10Z',
} as const;

export type IconId = keyof typeof ICONS;

/** Ícone como <svg> para a interface em HTML (pinta com a cor do texto, `currentColor`). */
export function iconSvg(icon: IconId, className = 'icone'): string {
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" fill-rule="evenodd" d="${ICONS[icon]}"/></svg>`;
}

/** Cor em hexadecimal para CSS (#rrggbb). */
export function cssColor(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/** Textura redonda com o ícone em branco sobre a cor da instituição. */
export function createIconTexture(icon: IconId, color: number, size = 128): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const hex = `#${color.toString(16).padStart(6, '0')}`;
    const r = size / 2;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(r, r, r - 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = hex;
    ctx.beginPath();
    ctx.arc(r, r, r - size * 0.07, 0, Math.PI * 2);
    ctx.fill();

    const iconSize = size * 0.56;
    ctx.save();
    ctx.translate(r - iconSize / 2, r - iconSize / 2);
    ctx.scale(iconSize / 24, iconSize / 24);
    ctx.fillStyle = '#ffffff';
    ctx.fill(new Path2D(ICONS[icon]), 'evenodd');
    ctx.restore();
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
