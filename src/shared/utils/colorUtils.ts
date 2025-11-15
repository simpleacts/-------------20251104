export const adjustColor = (color: string, amount: number): string => {
    if (!color || !color.startsWith('#')) return color;
    let usePound = true;
    if (color[0] === '#') {
        color = color.slice(1);
    }
    if (color.length === 3) {
        color = color.split('').map(c => c + c).join('');
    }
    const num = parseInt(color, 16);
    let r = (num >> 16) + amount;
    if (r > 255) r = 255;
    else if (r < 0) r = 0;
    let b = ((num >> 8) & 0x00FF) + amount;
    if (b > 255) b = 255;
    else if (b < 0) b = 0;
    let g = (num & 0x0000FF) + amount;
    if (g > 255) g = 255;
    else if (g < 0) g = 0;
    const toHex = (c: number) => `00${Math.round(c).toString(16)}`.slice(-2);
    return (usePound ? '#' : '') + toHex(r) + toHex(b) + toHex(g);
};

export const hexToRgb = (hex: string): string | null => {
    if (!hex) return null;
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
        : null;
};