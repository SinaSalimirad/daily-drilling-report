import { describe, expect, it } from 'bun:test';
import { isRecognisedTool, needsToolPressureLoss } from './bha';

describe('tool recognition (BHA!B32:B57)', () => {
  it('knows the workbook spellings, ignoring case and edge spaces', () => {
    for (const name of [
      'Motor',
      ' Motor ',
      'mud motor',
      'DHT',
      'Down Hole tools',
      'Bit & NB STB',
    ]) {
      expect(isRecognisedTool(name)).toBe(true);
    }
  });
  it('does not know a plain string component', () => {
    for (const name of ['5" HWDP', 'Whip Stock 9 5/8"', '']) {
      expect(isRecognisedTool(name)).toBe(false);
    }
  });
});

describe('needsToolPressureLoss', () => {
  it('a motor of another diameter than the bit needs a pressure loss', () => {
    expect(needsToolPressureLoss({ name: 'Mud Motor', odIn: 6.75 }, 8.5)).toBe(true);
  });
  it('a recognised name with the bit size is the bit itself', () => {
    expect(needsToolPressureLoss({ name: 'Bit', odIn: 8.5 }, 8.5)).toBe(false);
  });
  it('an unrecognised component never needs one', () => {
    expect(needsToolPressureLoss({ name: '5" HWDP', odIn: 5 }, 8.5)).toBe(false);
  });
});
