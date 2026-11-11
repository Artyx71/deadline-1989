export const interactionLabels: Record<string, string> = {
  computer: 'ОТКРЫТЬ КОМПЬЮТЕР', telephone: 'ОТВЕТИТЬ НА ЗВОНОК',
  cabinet: 'ПРОВЕРИТЬ СНАРЯЖЕНИЕ', television: 'СМОТРЕТЬ ТЕЛЕВИЗОР',
  exit: 'ПОКИНУТЬ КВАРТИРУ', training: 'ТРЕНИРОВКА',
};

const legacyLabels: Record<string, string> = {
  'USE COMPUTER': interactionLabels.computer!,
  'ANSWER TELEPHONE': interactionLabels.telephone!,
  'CHECK EQUIPMENT': interactionLabels.cabinet!,
  'WATCH TELEVISION': interactionLabels.television!,
  'LEAVE APARTMENT': interactionLabels.exit!,
  'ENTER TRAINING': interactionLabels.training!,
  'RETURN TO APARTMENT': 'ВЕРНУТЬСЯ В КВАРТИРУ',
};

// Localize prompts from an already mounted game instance during a dev refresh.
export function interactionText(label: string): string { return legacyLabels[label] ?? label; }
