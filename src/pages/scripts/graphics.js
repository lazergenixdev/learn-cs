// https://stackoverflow.com/questions/808826/draw-arrow-on-canvas-tag
export function draw_arrow(ctx, x0, y0, x1, y1, r, head_len = 8) {
    const head_angle = Math.PI / 6;
    const angle = Math.atan2(y1 - y0, x1 - x0);
  
    /* Adjust the point */
    x1 -= (ctx.lineWidth + r) * Math.cos(angle);
    y1 -= (ctx.lineWidth + r) * Math.sin(angle);
  
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  
    ctx.beginPath();
    ctx.lineTo(x1, y1);
    ctx.lineTo(x1 - head_len * Math.cos(angle - head_angle), y1 - head_len * Math.sin(angle - head_angle));
    ctx.lineTo(x1 - head_len * Math.cos(angle + head_angle), y1 - head_len * Math.sin(angle + head_angle));
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
}