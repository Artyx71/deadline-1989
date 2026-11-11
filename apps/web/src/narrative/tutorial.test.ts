import { describe, expect, it } from 'vitest';
import { tutorialSteps, type TutorialStep } from '@deadline/shared';
import { DIALOGUES } from './dialogue';
import { nextTutorialStep, reduceTutorialStep, skipTutorial, TUTORIAL_HINTS, type TutorialAction } from './tutorial';

describe('FIRST CALL guided progression', () => {
  it('advances through every step only after its required action', () => {
    const events: TutorialAction[] = ['moved', 'moved', 'first-call', 'computer', 'task-created', 'training', 'training', 'aimed', 'shot', 'reloaded', 'melee', 'second-call'];
    let current: TutorialStep = 'wake';
    const visited: TutorialStep[] = [current];
    for (const event of events) {
      current = reduceTutorialStep(current, event);
      visited.push(current);
    }
    expect(visited).toEqual([...tutorialSteps]);
    expect(current).toBe('complete');
  });
  it('does not bypass the phone, real task creation, or ordered training', () => {
    const cases: [TutorialStep, TutorialAction][] = [
      ['movement', 'first-call'], ['first-call', 'computer'], ['computer', 'task-created'],
      ['create-task', 'shot'], ['rewards', 'reloaded'], ['training', 'shot'],
      ['aim', 'shot'], ['shoot', 'reloaded'], ['reload', 'melee'], ['melee', 'second-call'],
    ];
    for (const [step, event] of cases) expect(reduceTutorialStep(step, event)).toBe(step);
  });
  it('resumes from a persisted training step without replaying completed instructions', () => {
    const restored: TutorialStep = 'reload';
    expect(reduceTutorialStep(restored, 'shot')).toBe('reload');
    expect(reduceTutorialStep(restored, 'reloaded')).toBe('melee');
    expect(reduceTutorialStep('melee', 'melee')).toBe('second-call');
    expect(reduceTutorialStep('second-call', 'second-call')).toBe('complete');
  });
  it('clamps completion and skips explicitly without fake task/resource changes', () => {
    expect(nextTutorialStep('complete')).toBe('complete');
    expect(reduceTutorialStep('complete', 'moved')).toBe('complete');
    const skipped = skipTutorial();
    expect(skipped).toEqual({ step: 'complete', completed: true, skipped: true });
    expect(Object.keys(skipped).sort()).toEqual(['completed', 'skipped', 'step']);
    expect(reduceTutorialStep(skipped.step, 'first-call')).toBe('complete');
  });
  it('provides a usable hint at every cursor, including isolated training and task honesty', () => {
    expect(Object.keys(TUTORIAL_HINTS).sort()).toEqual([...tutorialSteps].sort());
    expect(TUTORIAL_HINTS['create-task']).toContain('только после настоящей работы');
    expect(TUTORIAL_HINTS.training).toContain('сохранённый запас хранится отдельно');
  });
});

describe('original caller content contracts', () => {
  it('covers every server trigger with readable caller lines and a valid portrait', () => {
    expect(Object.keys(DIALOGUES).sort()).toEqual([
      'first-call', 'second-call', 'first-death', 'death-streak', 'no-kills', 'empty-magazine',
      'near-victory', 'silent-victory', 'productive', 'first-victory',
    ].sort());
    for (const dialogue of Object.values(DIALOGUES)) {
      expect(dialogue.speaker).toBe('№ 9');
      expect(dialogue.portrait).toBe(1);
      expect(dialogue.lines.length).toBeGreaterThanOrEqual(3);
      expect(dialogue.lines.every(line => line.trim().length > 0 && line.length <= 240)).toBe(true);
    }
  });
  it('explains product invariants and optional training without reading private task text', () => {
    const briefing = DIALOGUES['first-call']?.lines.join(' ') ?? '';
    expect(briefing).toContain('патроны и XP — один раз за задачу');
    expect(briefing).toContain('Смерть тоже не отменяет сделанного');
    expect(briefing).toContain('пропусти');
    expect(briefing).toContain('твой запас они не затрагивают');
    expect(DIALOGUES['second-call']?.lines.join(' ')).toContain('ПЕРВАЯ СМЕНА открыта');
  });
});
