// Original miniature-painting-inspired illustrated family garden.
function flower(cx,cy,r,color){
  const petals=Array.from({length:8},(_,i)=>`<ellipse cx="0" cy="-${(r*0.72).toFixed(2)}" rx="${(r*0.28).toFixed(2)}" ry="${(r*0.52).toFixed(2)}" transform="rotate(${i*45})" fill="${color}" stroke="#ab795f" stroke-width=".65"/>`).join('');
  return `<g transform="translate(${cx} ${cy})">${petals}<circle r="${(r*0.3).toFixed(2)}" fill="#e9c56e" stroke="#a58745" stroke-width=".8"/></g>`;
}
// The art file is a local SVG: no downloaded fonts, trackers, or external imagery.
export function treeArt({compact=false}={}) {
  return `<img class="tree-svg ${compact?'tree-compact':''}" src="./assets/grove-miniature.svg" alt="An Indian miniature painting-inspired family garden with a flourishing tree, generations sharing stories, a peacock and lotus pond" loading="eager" decoding="async">`;
}
export function miniPlant(){return `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M50 111 Q52 70 47 15" fill="none" stroke="#7c7659" stroke-width="3"/><g fill="#6b8b6a" stroke="#4a6655" stroke-width="1.4"><ellipse cx="34" cy="75" rx="12" ry="27" transform="rotate(-35 34 75)"/><ellipse cx="67" cy="65" rx="12" ry="27" transform="rotate(40 67 65)"/><ellipse cx="30" cy="39" rx="11" ry="23" transform="rotate(-42 30 39)"/><ellipse cx="68" cy="31" rx="11" ry="23" transform="rotate(43 68 31)"/></g>${flower(47,15,12,'#dca77a')}</svg>`;}
export const ornaments = `<svg class="ornament" viewBox="0 0 190 22" aria-hidden="true"><path d="M1 11h63m62 0h63" stroke="#b8aa8c"/><path d="M95 3l8 8-8 8-8-8z" fill="#b69c67"/><circle cx="79" cy="11" r="3" fill="#9aa77e"/><circle cx="111" cy="11" r="3" fill="#9aa77e"/></svg>`;
