import { ellipsePoints, roughRect, seededRandom, stroke, type Point, type Stroke } from './brush';

/** Project thumbnails, drawn in a 240×160 box. */
export const projectSketches: Record<string, Stroke[]> = {
  nanquim: [
    stroke([[120, 22], [104, 58], [106, 80], [120, 88], [134, 80], [136, 58], [120, 22]], 3, { seed: 161, start: 0.02, end: 0.05 }),
    stroke([[112, 66], [118, 80]], 5, { tone: 'wash', seed: 162 }),
    stroke([[40, 118], [76, 118]], 26, { seed: 163, start: 0.02, end: 0.08 }),
    stroke([[86, 118], [122, 118]], 26, { tone: 'wash', seed: 164, start: 0.02, end: 0.08, filter: 'wash' }),
    stroke([[132, 118], [168, 118]], 26, { tone: 'mist', seed: 165, start: 0.02, end: 0.08, filter: 'wash' }),
    ...roughRect(178, 105, 26, 26, 1.4, 166),
  ],
  aer: [
    stroke([[52, 92], [120, 38], [190, 92]], 4.4, { seed: 121, start: 0.04 }),
    stroke([[70, 80], [70, 132]], 2.2, { seed: 122 }),
    stroke([[170, 80], [170, 132]], 2.2, { seed: 123 }),
    stroke([[108, 132], [108, 102], [132, 102], [132, 132]], 2, { seed: 124 }),
    stroke([[36, 134], [120, 131], [204, 135]], 2.6, { seed: 125, dry: true }),
    stroke([[150, 60], [150, 40], [162, 40], [162, 70]], 2, { seed: 126 }),
    stroke([[60, 140], [180, 142]], 14, { tone: 'mist', filter: 'wash', seed: 127 }),
  ],
  loquei: [
    ...roughRect(34, 26, 172, 108, 1.8, 140),
    stroke([[74, 30], [74, 130]], 1.4, { seed: 145 }),
    stroke([[44, 44], [64, 44]], 3, { seed: 146 }),
    stroke([[44, 58], [60, 58]], 3, { seed: 147 }),
    stroke([[44, 72], [62, 72]], 3, { seed: 148 }),
    stroke([[98, 120], [98, 92]], 10, { seed: 149, start: 0.02, end: 0.1 }),
    stroke([[122, 120], [122, 72]], 10, { seed: 150, start: 0.02, end: 0.1, tone: 'wash' }),
    stroke([[146, 120], [146, 84]], 10, { seed: 151, start: 0.02, end: 0.1 }),
    stroke([[170, 120], [170, 56]], 10, { seed: 152, start: 0.02, end: 0.1, dry: true }),
    stroke([[88, 62], [116, 48], [140, 56], [188, 40]], 1.6, { seed: 153 }),
  ],
  rag: [
    stroke([[40, 34], [128, 30], [132, 70], [74, 72], [58, 88], [60, 72], [42, 72], [40, 34]], 2.2, { seed: 181, start: 0.02, end: 0.05 }),
    stroke([[54, 46], [114, 44]], 1.6, { seed: 182 }),
    stroke([[54, 58], [96, 57]], 1.6, { seed: 183 }),
    stroke([[120, 128], [156, 112], [196, 124]], 2.6, { seed: 184 }),
    stroke([[120, 128], [156, 118], [196, 130]], 1.4, { seed: 185 }),
    stroke([[120, 128], [120, 96], [156, 84], [196, 96], [196, 128]], 2.4, { seed: 186, start: 0.02, end: 0.05 }),
    stroke([[156, 84], [156, 116]], 1.6, { seed: 187 }),
    stroke([[164, 98], [188, 94]], 1.2, { seed: 188 }),
    stroke([[164, 106], [184, 103]], 1.2, { seed: 189 }),
    stroke([[136, 72], [150, 82]], 1.4, { seed: 190 }),
  ],
  advocacia: [
    stroke([[120, 34], [120, 122]], 3.4, { seed: 101 }),
    stroke([[76, 52], [120, 47], [164, 52]], 3, { seed: 102 }),
    stroke([[78, 52], [66, 88]], 1.2, { seed: 103 }),
    stroke([[78, 52], [92, 88]], 1.2, { seed: 104 }),
    stroke([[162, 52], [148, 88]], 1.2, { seed: 105 }),
    stroke([[162, 52], [176, 88]], 1.2, { seed: 106 }),
    stroke([[62, 88], [79, 100], [96, 88]], 3, { seed: 107 }),
    stroke([[144, 88], [162, 100], [180, 88]], 3, { seed: 108 }),
    stroke([[96, 126], [120, 122], [146, 126]], 6, { seed: 109 }),
    stroke([[40, 140], [200, 138]], 12, { tone: 'mist', filter: 'wash', seed: 110 }),
  ],
  saideira: [
    stroke([[88, 40], [94, 126], [146, 126], [152, 40]], 2.6, { seed: 201, start: 0.02, end: 0.05 }),
    stroke([[92, 66], [148, 66]], 1.4, { seed: 202 }),
    stroke([[96, 76], [100, 120], [140, 120], [144, 76]], 16, { tone: 'wash', filter: 'wash', seed: 203 }),
    stroke(ellipsePoints(108, 38, 16, 10, { seed: 204, count: 10 }), 5, { tone: 'mist', seed: 204 }),
    stroke(ellipsePoints(132, 34, 18, 11, { seed: 205, count: 10 }), 5, { tone: 'mist', seed: 205 }),
    stroke([[152, 60], [172, 64], [172, 96], [150, 102]], 2.6, { seed: 206 }),
    stroke([[60, 136], [180, 138]], 12, { tone: 'mist', filter: 'wash', seed: 207 }),
  ],
};

export const decorations = {
  underline: [stroke([[2, 9], [90, 6], [186, 10]], 4.5, { seed: 10, dry: true, start: 0.04, end: 0.3 })],
  arrow: [stroke([[4, 6], [30, 10], [58, 26]], 2, { seed: 5 }), stroke([[46, 27], [59, 27], [56, 15]], 2, { seed: 6 })],
  swash: [stroke([[4, 20], [120, 14], [296, 18]], 13, { tone: 'mist', seed: 7, dry: true, start: 0.05, end: 0.2 })],
  seal: [
    ...roughRect(4, 4, 36, 36, 2.6, 50),
    stroke([[12, 32], [17, 12], [22, 32]], 2.4, { seed: 55 }),
    stroke([[14, 24], [20, 24]], 1.8, { seed: 56 }),
    stroke([[27, 12], [27, 32], [34, 32]], 2.4, { seed: 57 }),
  ],
} satisfies Record<string, Stroke[]>;

export const metaphorIcons: Record<string, Stroke[]> = {
  caderno: [
    stroke([[6, 8], [6, 30], [20, 27], [34, 30], [34, 8], [20, 5], [6, 8]], 1.8, { seed: 601, start: 0.02, end: 0.04 }),
    stroke([[20, 5], [20, 27]], 1.4, { seed: 602 }),
  ],
  mesa: [
    stroke([[3, 18], [37, 18]], 2.4, { seed: 611 }),
    stroke([[7, 18], [6, 34]], 1.8, { seed: 612 }),
    stroke([[33, 18], [34, 34]], 1.8, { seed: 613 }),
    stroke([[12, 16], [12, 8], [20, 8], [20, 16]], 1.6, { seed: 614 }),
    stroke([[26, 16], [30, 4]], 1.6, { seed: 615 }),
  ],
  mundo: [
    stroke([[2, 30], [12, 18], [18, 24], [27, 12], [38, 30]], 2, { seed: 621 }),
    stroke(ellipsePoints(31, 7, 4, 4, { seed: 622, count: 8 }), 1.6, { seed: 622 }),
    stroke([[2, 32], [38, 32]], 1.4, { seed: 623, dry: true }),
  ],
};

export function attributeBar(value: number, seed: number): Stroke[] {
  const end = 6 + 288 * value;
  return [
    stroke([[4, 9], [150, 8], [296, 9]], 1, { tone: 'mist', seed: seed, start: 0.01, end: 0.02 }),
    stroke([[6, 9], [end / 2, 7], [end, 9]], 10, { seed: seed + 10, dry: true, start: 0.03, end: 0.2 }),
  ];
}

/** A ridge line across `width`, used for mountain and hill layers in the paper world. */
export function ridge(width: number, height: number, { peaks = 6, amplitude = 0.5, seed = 1, base = 0.9 } = {}): Point[] {
  const random = seededRandom(seed);
  const points: Point[] = [];
  const steps = peaks * 2;
  for (let i = 0; i <= steps; i++) {
    const x = (width * i) / steps;
    const high = i % 2 === 1;
    const y = height * (base - (high ? amplitude * (0.55 + random() * 0.45) : amplitude * random() * 0.25));
    points.push([x, y]);
  }
  return points;
}

export function grassTufts(width: number, y: number, count: number, seed = 1): Stroke[] {
  const random = seededRandom(seed);
  const strokes: Stroke[] = [];
  for (let i = 0; i < count; i++) {
    const x = random() * width;
    const blades = 2 + Math.floor(random() * 3);
    for (let b = 0; b < blades; b++) {
      const lean = (random() - 0.5) * 16;
      const tall = 8 + random() * 16;
      strokes.push(stroke([[x + b * 3, y], [x + b * 3 + lean * 0.4, y - tall * 0.6], [x + b * 3 + lean, y - tall]], 1.8, { seed: seed * 100 + i * 7 + b, start: 0.05, end: 0.7 }));
    }
  }
  return strokes;
}

export const deskObjects = {
  notebook: [
    stroke([[14, 20], [226, 14], [232, 286], [20, 292], [14, 20]], 3, { seed: 701, start: 0.01, end: 0.02 }),
    stroke([[34, 18], [38, 290]], 2, { seed: 702 }),
    stroke([[26, 30], [26, 280]], 10, { tone: 'wash', filter: 'wash', seed: 703 }),
    stroke([[200, 14], [204, 120], [214, 108], [222, 122], [218, 14]], 2, { seed: 704, start: 0.01, end: 0.02 }),
    stroke([[60, 150], [200, 146]], 14, { tone: 'mist', filter: 'wash', seed: 705 }),
  ],
  card: [
    ...roughRect(10, 10, 220, 150, 2.2, 720),
    stroke([[24, 40], [110, 38]], 1, { tone: 'wash', seed: 726 }),
    stroke([[24, 132], [210, 130]], 1, { tone: 'wash', seed: 727 }),
  ],
  inkBottle: [
    stroke([[34, 40], [30, 92], [40, 104], [92, 104], [102, 92], [98, 40]], 3, { seed: 731, start: 0.02, end: 0.04 }),
    stroke([[34, 40], [66, 32], [98, 40]], 2.4, { seed: 732 }),
    stroke([[48, 34], [48, 14], [84, 14], [84, 34]], 2.6, { seed: 733 }),
    stroke([[44, 14], [88, 14]], 6, { seed: 734 }),
    stroke([[38, 70], [94, 70], [92, 98], [40, 98]], 22, { seed: 735, start: 0.02, end: 0.05 }),
    stroke([[48, 50], [52, 62]], 4, { tone: 'mist', seed: 736 }),
  ],
  brush: [
    stroke([[16, 150], [130, 30]], 7, { seed: 741, start: 0.02, end: 0.05 }),
    stroke([[130, 30], [140, 20]], 10, { tone: 'soft', seed: 742, start: 0.02, end: 0.1 }),
    stroke([[140, 20], [158, 6], [166, 2]], 12, { seed: 743, start: 0.05, end: 0.95, dry: true }),
    stroke([[30, 136], [40, 126]], 9, { tone: 'wash', seed: 744 }),
  ],
  cup: [
    stroke(ellipsePoints(70, 50, 46, 13, { seed: 751 }), 2.4, { seed: 751, start: 0.02, end: 0.08 }),
    stroke([[24, 52], [30, 104], [50, 120], [90, 120], [110, 104], [116, 52]], 2.8, { seed: 752, start: 0.02, end: 0.1 }),
    stroke(ellipsePoints(120, 76, 14, 14, { from: -1.6, sweep: 3.4, count: 8, seed: 753 }), 2.6, { seed: 753 }),
    stroke([[34, 52], [106, 54]], 8, { tone: 'wash', seed: 754 }),
  ],
  steam: [
    stroke([[56, 40], [50, 24], [60, 12], [54, -2]], 1.4, { seed: 761, filter: 'boil' }),
    stroke([[80, 38], [86, 22], [76, 8], [84, -6]], 1.2, { seed: 762, filter: 'boil' }),
  ],
  tape: [stroke([[0, 10], [70, 8]], 18, { tone: 'mist', seed: 771, start: 0.01, end: 0.01, filter: 'wash' })],
};

export const worldProps = {
  signpost: (seed: number): Stroke[] => [
    stroke([[60, 30], [62, 180]], 5, { seed, start: 0.02, end: 0.05 }),
    stroke([[10, 40], [150, 34], [170, 54], [150, 74], [14, 78], [10, 40]], 2.6, { seed: seed + 1, start: 0.01, end: 0.03 }),
    stroke([[40, 178], [84, 180]], 4, { seed: seed + 2, dry: true }),
  ],
  pole: (seed: number, height: number): Stroke[] => [
    stroke([[10, 0], [12, height]], 4.5, { seed, start: 0.02, end: 0.05 }),
    stroke([[0, 8], [24, 6]], 3, { seed: seed + 1 }),
  ],
  rock: (seed: number): Stroke[] => [
    stroke([[0, 30], [8, 12], [26, 4], [44, 10], [52, 30]], 3, { seed, start: 0.02, end: 0.05 }),
    stroke([[8, 24], [40, 22]], 9, { tone: 'wash', filter: 'wash', seed: seed + 1 }),
  ],
  house: (seed: number): Stroke[] => [
    stroke([[10, 110], [130, 20], [250, 110]], 4.4, { seed, start: 0.02 }),
    stroke([[34, 94], [34, 230]], 3, { seed: seed + 1 }),
    stroke([[226, 94], [226, 230]], 3, { seed: seed + 2 }),
    stroke([[110, 230], [110, 160], [150, 160], [150, 230]], 2.6, { seed: seed + 3 }),
    stroke([[180, 60], [180, 30], [200, 30], [200, 76]], 2.6, { seed: seed + 4 }),
    stroke([[60, 120], [200, 116]], 20, { tone: 'mist', filter: 'wash', seed: seed + 5 }),
    stroke([[0, 232], [260, 230]], 3, { seed: seed + 6, dry: true }),
  ],
  enso: (seed: number): Stroke[] => [
    stroke(ellipsePoints(60, 60, 50, 48, { from: -0.6, sweep: 5.9, count: 22, seed }), 9, { seed, dry: true, start: 0.05, end: 0.5 }),
  ],
  cloud: (seed: number): Stroke[] => [stroke([[0, 20], [60, 12], [130, 18], [200, 14]], 16, { tone: 'mist', filter: 'wash', seed })],
  bird: (seed: number): Stroke[] => [stroke([[0, 8], [8, 2], [14, 8], [20, 2], [28, 8]], 1.4, { seed })],
  lectern: (seed: number): Stroke[] => [
    stroke([[10, 254], [150, 256]], 14, { tone: 'mist', filter: 'wash', seed: seed + 1 }),
    stroke([[18, 250], [142, 250]], 4, { seed: seed + 2, start: 0.01, end: 0.02 }),
    stroke([[18, 250], [22, 240], [138, 240], [142, 250]], 2.6, { seed: seed + 3, start: 0.02, end: 0.04 }),
    stroke([[30, 240], [36, 230], [124, 230], [130, 240]], 2.4, { seed: seed + 4, start: 0.02, end: 0.04 }),
    stroke([[80, 100], [80, 230]], 30, { tone: 'mist', filter: 'wash', seed: seed + 5, start: 0.01, end: 0.01 }),
    stroke([[64, 230], [65, 96]], 3.4, { seed: seed + 6, start: 0.02, end: 0.05 }),
    stroke([[96, 230], [95, 96]], 3.4, { seed: seed + 7, start: 0.02, end: 0.05 }),
    stroke([[88, 228], [87, 104]], 6, { tone: 'wash', seed: seed + 8, dry: true }),
    stroke(ellipsePoints(80, 150, 9, 10, { seed: seed + 9, count: 12 }), 2.2, { seed: seed + 9 }),
    stroke([[76, 145], [76, 156], [80, 152], [84, 156], [84, 145]], 1.4, { seed: seed + 10 }),
    stroke([[26, 92], [134, 88]], 3, { seed: seed + 11, start: 0.02, end: 0.04 }),
    stroke([[20, 86], [40, 80], [60, 85], [80, 79], [100, 84], [120, 78], [140, 82]], 4, { seed: seed + 12, start: 0.01, end: 0.02 }),
    stroke([[20, 86], [34, 58]], 2.6, { seed: seed + 13 }),
    stroke([[140, 82], [126, 50]], 2.6, { seed: seed + 14 }),
    stroke([[34, 58], [126, 50]], 2.6, { seed: seed + 15, start: 0.02, end: 0.04 }),
    stroke([[38, 74], [58, 62], [80, 66]], 14, { tone: 'paper', filter: 'none', seed: seed + 16, start: 0.02, end: 0.05 }),
    stroke([[80, 66], [102, 56], [124, 58]], 14, { tone: 'paper', filter: 'none', seed: seed + 17, start: 0.02, end: 0.05 }),
    stroke([[34, 78], [58, 62], [80, 64]], 2.2, { seed: seed + 18, start: 0.02, end: 0.05 }),
    stroke([[80, 64], [104, 52], [128, 56]], 2.2, { seed: seed + 19, start: 0.02, end: 0.05 }),
    stroke([[34, 78], [80, 72], [128, 62]], 1.8, { seed: seed + 20, tone: 'soft' }),
    stroke([[80, 62], [80, 72]], 2, { seed: seed + 21 }),
    stroke([[46, 70], [70, 66]], 1.1, { seed: seed + 22, tone: 'wash' }),
    stroke([[92, 64], [116, 60]], 1.1, { seed: seed + 23, tone: 'wash' }),
    stroke([[108, 70], [110, 98], [104, 106]], 4, { seed: seed + 24, start: 0.1, end: 0.6 }),
  ],
  lecternPage: (seed: number): Stroke[] => [
    stroke([[4, 40], [26, 14], [56, 18]], 10, { tone: 'paper', seed: seed + 1, start: 0.02, end: 0.05, filter: 'none' }),
    stroke([[2, 40], [24, 12], [56, 16]], 1.8, { seed, start: 0.02, end: 0.05 }),
  ],
  desk: (seed: number): Stroke[] => [
    stroke([[0, 196], [260, 198]], 12, { tone: 'mist', filter: 'wash', seed: seed + 1 }),
    stroke([[8, 96], [252, 92]], 6, { seed: seed + 2, start: 0.01, end: 0.02 }),
    stroke([[16, 104], [244, 100]], 2, { seed: seed + 3, tone: 'soft' }),
    stroke([[28, 100], [24, 196]], 4, { seed: seed + 4, start: 0.02, end: 0.05 }),
    stroke([[232, 98], [238, 196]], 4, { seed: seed + 5, start: 0.02, end: 0.05 }),
    stroke([[60, 112], [200, 110]], 1.4, { seed: seed + 6 }),
    stroke([[60, 112], [62, 136], [198, 134], [200, 110]], 1.6, { seed: seed + 7, start: 0.02, end: 0.05 }),
    stroke([[122, 122], [138, 122]], 3, { seed: seed + 8 }),
    stroke([[30, 90], [36, 70], [110, 66], [112, 88]], 1.6, { seed: seed + 9, tone: 'wash' }),
  ],
};
