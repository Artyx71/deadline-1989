import type Phaser from 'phaser';

/** In-world range signage, using the same character atlas as a reusable dummy. */
export function addTrainingRange(scene: Phaser.Scene) {
  const markings = scene.add.graphics().setDepth(1);
  markings.lineStyle(1, 0x74d9c9, .5);
  markings.strokeCircle(604, 290, 21);
  markings.strokeCircle(604, 290, 12);
  markings.lineBetween(577, 290, 631, 290);
  markings.lineBetween(604, 263, 604, 317);
  for (let x = 506; x < 560; x += 8) markings.lineBetween(x, 309, x + 4, 309);
  const style = { fontFamily: 'monospace', fontSize: '7px', color: '#9ce9dc', backgroundColor: '#091a22', padding: { x: 4, y: 3 }, resolution: 1 };
  scene.add.text(500, 335, 'БЕСПЛАТНАЯ ТРЕНИРОВКА', style).setDepth(25);
  scene.add.text(580, 260, 'МИШЕНЬ', style).setDepth(25);
  scene.add.text(500, 350, 'ЛКМ: ВЫСТРЕЛ · F: УДАР НОЖОМ · R: ЗАРЯДИТЬ', { ...style, fontSize: '6px' }).setDepth(25);
}
