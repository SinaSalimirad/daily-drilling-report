import { describe, expect, it } from 'bun:test';
import { blankSample, payloadOf } from './sample-draft';

describe('payloadOf', () => {
  it('turns typed text into numbers and empty fields into null', () => {
    const draft = blankSample('a');
    draft.sampleTime = '08:00';
    draft.plain.r600 = '84';
    draft.plain.r300 = '48,5';
    draft.quantities.mudWeight = 2082.4;
    draft.extras = { pH: '9.6', Note: 'clean', Empty: ' ' };
    const payload = payloadOf(draft);
    expect(payload).toMatchObject({
      sampleSourceId: null,
      sampleTime: '08:00',
      r600: 84,
      r300: 48.5,
      r200: null,
      mudWeight: 2082.4,
      chlorides: null,
      otherProperties: { pH: 9.6, Note: 'clean' },
    });
  });
});
