/**
 * Procedural texture factory.
 *
 * Every texture in YYVOLT is drawn here with Canvas2D, so the game ships with
 * no binary assets. Textures are tracked in one place so Game can release them
 * on hot reload or teardown. Colour maps use sRGB; repeats are chosen so the
 * room's 12 x 10 floor reads at the right plank scale.
 */
import {
  CanvasTexture,
  ClampToEdgeWrapping,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';

function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext('2d') };
}

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function drawBolt(ctx, cx, cy, size) {
  const points = [
    [-0.18, -0.5], [0.3, -0.5], [0.04, -0.08], [0.32, -0.08],
    [-0.24, 0.5], [-0.02, 0.08], [-0.32, 0.08],
  ];
  ctx.beginPath();
  points.forEach(([x, y], index) => {
    const px = cx + x * size;
    const py = cy + y * size;
    if (index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.fill();
}

function drawCheckerBand(ctx, x, y, width, height, columns) {
  const cell = width / columns;
  for (let row = 0; row < Math.ceil(height / cell); row += 1) {
    for (let col = 0; col < columns; col += 1) {
      ctx.fillStyle = (row + col) % 2 === 0 ? '#f4f6f8' : '#12223f';
      ctx.fillRect(x + col * cell, y + row * cell, cell, cell);
    }
  }
}

export class TextureFactory {
  constructor(renderer) {
    this.maxAnisotropy = Math.min(
      renderer.capabilities.getMaxAnisotropy(),
      8,
    );
    this.textures = new Set();
  }

  /** Register a canvas as a texture with sane colour-space and wrap defaults. */
  fromCanvas(canvas, { repeat = [1, 1], clamp = false } = {}) {
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = this.maxAnisotropy;
    texture.wrapS = clamp ? ClampToEdgeWrapping : RepeatWrapping;
    texture.wrapT = clamp ? ClampToEdgeWrapping : RepeatWrapping;
    texture.repeat.set(repeat[0], repeat[1]);
    texture.needsUpdate = true;
    this.textures.add(texture);
    return texture;
  }

  /** Warm oak planks with staggered joints and subtle grain. */
  createFloorWood() {
    const { canvas, ctx } = createCanvas(1024, 1024);
    const random = createRandom(11);
    const rows = 6;
    const rowHeight = canvas.height / rows;
    const bases = ['#8a5a35', '#96633c', '#7d4f2f', '#a06b42', '#8e5d38'];

    for (let row = 0; row < rows; row += 1) {
      const y = row * rowHeight;
      ctx.fillStyle = bases[row % bases.length];
      ctx.fillRect(0, y, canvas.width, rowHeight);
      ctx.fillStyle = 'rgba(45, 24, 12, 0.18)';
      ctx.fillRect(0, y, canvas.width, 3);
      ctx.fillStyle = 'rgba(255, 230, 190, 0.06)';
      ctx.fillRect(0, y + 3, canvas.width, 2);

      // Stagger a dark joint in each row so the floor never looks tiled.
      const joint = Math.floor(random() * canvas.width);
      ctx.fillStyle = 'rgba(35, 18, 8, 0.28)';
      ctx.fillRect(joint, y + 3, 3, rowHeight - 3);

      for (let line = 0; line < 26; line += 1) {
        const ly = y + 12 + random() * (rowHeight - 24);
        const alpha = 0.05 + random() * 0.1;
        ctx.strokeStyle = `rgba(40, 20, 10, ${alpha})`;
        ctx.lineWidth = 1 + random() * 2;
        ctx.beginPath();
        ctx.moveTo(-20, ly);
        for (let x = 0; x <= canvas.width + 40; x += 80) {
          ctx.quadraticCurveTo(
            x + 40,
            ly + (random() - 0.5) * 9,
            x + 80,
            ly + (random() - 0.5) * 4,
          );
        }
        ctx.stroke();
      }

      if (random() > 0.35) {
        const kx = random() * canvas.width;
        const ky = y + rowHeight * (0.3 + random() * 0.4);
        ctx.strokeStyle = 'rgba(45, 22, 10, 0.16)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(kx, ky, 14 + random() * 16, 4 + random() * 4, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    return this.fromCanvas(canvas, { repeat: [4, 8] });
  }

  /** Painted plaster with a very low-contrast grain. */
  createWall() {
    const { canvas, ctx } = createCanvas(512, 512);
    const random = createRandom(23);
    ctx.fillStyle = '#e9e1d4';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 2600; i += 1) {
      const shade = random() > 0.5 ? 255 : 90;
      ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade}, ${0.012 + random() * 0.025})`;
      ctx.fillRect(random() * 512, random() * 512, 1.5, 1.5);
    }
    for (let i = 0; i < 18; i += 1) {
      ctx.fillStyle = 'rgba(120, 100, 78, 0.02)';
      ctx.fillRect(random() * 512, 0, 1 + random() * 3, 512);
    }

    return this.fromCanvas(canvas, { repeat: [4, 2.5] });
  }

  /** Flat-woven rug: navy field, paper border, yellow medallion. */
  createRug() {
    const { canvas, ctx } = createCanvas(1024, 1024);
    const random = createRandom(37);
    ctx.fillStyle = '#12223f';
    ctx.fillRect(0, 0, 1024, 1024);

    ctx.fillStyle = '#f4f6f8';
    ctx.fillRect(38, 38, 948, 948);
    ctx.fillStyle = '#8a94a6';
    ctx.fillRect(62, 62, 900, 900);
    ctx.fillStyle = '#12223f';
    ctx.fillRect(74, 74, 876, 876);

    ctx.strokeStyle = 'rgba(138, 148, 166, 0.28)';
    ctx.lineWidth = 3;
    for (let x = -1024; x < 2048; x += 150) {
      ctx.beginPath();
      ctx.moveTo(x, 74);
      ctx.lineTo(x + 876, 950);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, 950);
      ctx.lineTo(x + 876, 74);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255, 194, 14, 0.9)';
    ctx.lineWidth = 7;
    ctx.strokeRect(124, 124, 776, 776);
    ctx.strokeStyle = 'rgba(244, 246, 248, 0.32)';
    ctx.lineWidth = 2;
    ctx.strokeRect(152, 152, 720, 720);

    ctx.fillStyle = '#ffc20e';
    ctx.beginPath();
    ctx.moveTo(512, 392);
    ctx.lineTo(632, 512);
    ctx.lineTo(512, 632);
    ctx.lineTo(392, 512);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#12223f';
    ctx.beginPath();
    ctx.moveTo(512, 444);
    ctx.lineTo(580, 512);
    ctx.lineTo(512, 580);
    ctx.lineTo(444, 512);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(244, 246, 248, 0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(512, 438);
    ctx.lineTo(586, 512);
    ctx.lineTo(512, 586);
    ctx.lineTo(438, 512);
    ctx.closePath();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(244, 246, 248, 0.55)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 80; i += 1) {
      const x = 40 + random() * 944;
      const top = random() > 0.5;
      ctx.beginPath();
      ctx.moveTo(x, top ? 22 : 1002);
      ctx.lineTo(x, top ? 50 : 974);
      ctx.stroke();
    }

    return this.fromCanvas(canvas, { clamp: true });
  }

  /** Woven navy bedding with a pair of yellow stripes. */
  createFabric() {
    const { canvas, ctx } = createCanvas(512, 512);
    ctx.fillStyle = '#12223f';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 512; i += 4) {
      ctx.fillStyle = i % 8 === 0 ? 'rgba(36, 56, 92, 0.3)' : 'rgba(8, 16, 30, 0.25)';
      ctx.fillRect(i, 0, 2, 512);
      ctx.fillRect(0, i, 512, 2);
    }
    ctx.fillStyle = '#ffc20e';
    ctx.fillRect(0, 372, 512, 18);
    ctx.fillRect(0, 414, 512, 8);

    return this.fromCanvas(canvas, { repeat: [2, 2] });
  }

  /** Cream curtain cloth with soft vertical folds. */
  createCurtain() {
    const { canvas, ctx } = createCanvas(512, 512);
    ctx.fillStyle = '#e8dfcc';
    ctx.fillRect(0, 0, 512, 512);
    for (let x = 0; x < 512; x += 1) {
      const fold = Math.sin((x / 512) * Math.PI * 9);
      ctx.fillStyle = `rgba(110, 90, 70, ${0.025 + Math.abs(fold) * 0.055})`;
      ctx.fillRect(x, 0, 1, 512);
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let x = 18; x < 512; x += 56) ctx.fillRect(x, 0, 9, 512);
    return this.fromCanvas(canvas, { clamp: true });
  }

  /** Pastel window texture with warm amber glow panes (used by casino and
   * buildings). */
  createPastelWindows() {
    const size = 256;
    const { canvas, ctx } = createCanvas(size, size);
    // Wall: vertical pastel gradient.
    const wall = ctx.createLinearGradient(0, 0, 0, size);
    wall.addColorStop(0, '#d8e0f0');
    wall.addColorStop(0.5, '#e8d8d8');
    wall.addColorStop(1, '#d8e8e0');
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, size, size);
    // Subtle wall texture.
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < 30; i += 1) {
      const x = 16 + i * 42;
      const y = 16 + (i % 5) * 40;
      ctx.fillRect(x, y, 8, 8);
    }
    // Window grid overlay: warm amber glow.
    ctx.fillStyle = 'rgba(255, 200, 100, 0.35)';
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 6; col += 1) {
        const wx = 20 + col * 38;
        const wy = 20 + row * 46;
        ctx.fillRect(wx, wy, 30, 30);
      }
    }
    return this.fromCanvas(canvas, { clamp: true });
  }

  /** Three diegetic posters, drawn in the YYVOLT broadcast language. */
  createPoster(id) {
    const { canvas, ctx } = createCanvas(768, 1024);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (id === 'yyvolt') {
      ctx.fillStyle = '#12223f';
      ctx.fillRect(0, 0, 768, 1024);
      drawCheckerBand(ctx, 0, 0, 768, 48, 16);
      drawCheckerBand(ctx, 0, 976, 768, 48, 16);

      ctx.fillStyle = '#ffc20e';
      ctx.font = 'italic 900 132px "Barlow Condensed", "Arial Narrow", sans-serif';
      ctx.fillText('YYVOLT', 384, 200);
      ctx.fillStyle = '#8a94a6';
      ctx.fillRect(184, 278, 400, 3);

      ctx.fillStyle = '#ffc20e';
      drawBolt(ctx, 384, 505, 360);

      ctx.fillStyle = '#f4f6f8';
      ctx.font = '700 54px "Barlow Condensed", "Arial Narrow", sans-serif';
      ctx.fillText('Bedroom Grand Prix', 384, 790);
      ctx.fillStyle = '#8a94a6';
      ctx.font = '500 30px "Barlow", "Segoe UI", sans-serif';
      ctx.fillText('Lights out at eight', 384, 860);
    } else if (id === 'space') {
      ctx.fillStyle = '#0b1730';
      ctx.fillRect(0, 0, 768, 1024);
      const random = createRandom(71);
      for (let i = 0; i < 180; i += 1) {
        const radius = random() > 0.9 ? 3 : 1.2;
        ctx.fillStyle = `rgba(244, 246, 248, ${0.3 + random() * 0.7})`;
        ctx.beginPath();
        ctx.arc(random() * 768, random() * 1024, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = '#ffc20e';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.ellipse(410, 470, 250, 92, -0.28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#8a94a6';
      ctx.beginPath();
      ctx.arc(410, 470, 178, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#12223f';
      ctx.beginPath();
      ctx.arc(466, 424, 150, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f4f6f8';
      ctx.font = '700 58px "Barlow Condensed", "Arial Narrow", sans-serif';
      ctx.fillText('Space camp', 384, 790);
      ctx.fillStyle = '#8a94a6';
      ctx.font = '500 28px "Barlow", "Segoe UI", sans-serif';
      ctx.fillText('Pack a lunch', 384, 850);
    } else {
      ctx.fillStyle = '#12223f';
      ctx.fillRect(0, 0, 768, 1024);
      ctx.strokeStyle = '#f4511e';
      ctx.lineWidth = 24;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(214, 690);
      ctx.bezierCurveTo(72, 510, 190, 270, 390, 316);
      ctx.bezierCurveTo(590, 362, 676, 560, 548, 690);
      ctx.bezierCurveTo(470, 770, 294, 780, 214, 690);
      ctx.stroke();
      ctx.strokeStyle = '#f4f6f8';
      ctx.lineWidth = 4;
      ctx.setLineDash([18, 22]);
      ctx.beginPath();
      ctx.moveTo(214, 690);
      ctx.bezierCurveTo(72, 510, 190, 270, 390, 316);
      ctx.bezierCurveTo(590, 362, 676, 560, 548, 690);
      ctx.bezierCurveTo(470, 770, 294, 780, 214, 690);
      ctx.stroke();
      ctx.setLineDash([]);
      drawCheckerBand(ctx, 186, 648, 72, 24, 3);
      ctx.fillStyle = '#ffc20e';
      ctx.beginPath();
      ctx.arc(390, 316, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f4f6f8';
      ctx.font = '700 62px "Barlow Condensed", "Arial Narrow", sans-serif';
      ctx.fillText('Bedroom circuit', 384, 868);
      ctx.fillStyle = '#8a94a6';
      ctx.font = '500 28px "Barlow", "Segoe UI", sans-serif';
      ctx.fillText('Three laps', 384, 924);
    }

    return this.fromCanvas(canvas, { clamp: true });
  }

  /**
   * Orange track plastic with a fine moulded grain. The canvas stays mostly
   * light grey so the material colour does the orange work; the dark flecks
   * read as the slightly porous surface of a toy track.
   */
  createTrackAsphalt() {
    const { canvas, ctx } = createCanvas(512, 512);
    const random = createRandom(29);

    ctx.fillStyle = '#d8d4ce';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 3600; i += 1) {
      const x = random() * canvas.width;
      const y = random() * canvas.height;
      const size = random() * 2.2 + 0.4;
      ctx.fillStyle = `rgba(58, 46, 38, ${random() * 0.16 + 0.03})`;
      ctx.fillRect(x, y, size, size);
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 24; i += 1) {
      const y = random() * canvas.height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y + (random() - 0.5) * 8);
      ctx.stroke();
    }

    return this.fromCanvas(canvas);
  }

  /** A single white dash on transparent black, repeated along the track. */
  createCenterLine() {
    const { canvas, ctx } = createCanvas(32, 128);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f4f6f8';
    ctx.fillRect(4, 0, 24, 64);
    return this.fromCanvas(canvas);
  }

  /** Checkered start/finish banner with the YYVOLT wordmark and bolt. */
  createStartBanner() {
    const { canvas, ctx } = createCanvas(1024, 256);

    ctx.fillStyle = '#12223f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawCheckerBand(ctx, 0, 0, canvas.width, 42, 16);
    drawCheckerBand(ctx, 0, 214, canvas.width, 42, 16);

    ctx.fillStyle = '#ffc20e';
    drawBolt(ctx, 92, 128, 148);

    ctx.fillStyle = '#f4f6f8';
    ctx.font = 'italic 700 126px "Barlow Condensed", "Arial Narrow", sans-serif';
    ctx.fillText('YYVOLT', 188, 168);
    ctx.fillStyle = '#8a94a6';
    ctx.font = '500 25px "Barlow", "Segoe UI", sans-serif';
    ctx.fillText('Bedroom circuit', 196, 204);

    return this.fromCanvas(canvas, { clamp: true });
  }

  /** Checkered strip laid flat across the track at the start line. */
  createStartLine() {
    const { canvas, ctx } = createCanvas(512, 128);
    drawCheckerBand(ctx, 0, 0, canvas.width, canvas.height, 10);
    return this.fromCanvas(canvas);
  }

  /** Round team-bolt decal applied to the car's sidepods. */
  createCarBolt() {
    const { canvas, ctx } = createCanvas(128, 128);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffc20e';
    ctx.beginPath();
    ctx.arc(64, 64, 55, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#12223f';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.fillStyle = '#12223f';
    drawBolt(ctx, 66, 64, 72);
    return this.fromCanvas(canvas, { clamp: true });
  }

  dispose() {
    for (const texture of this.textures) texture.dispose();
    this.textures.clear();
  }
}
