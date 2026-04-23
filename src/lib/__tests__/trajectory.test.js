const {
  describeTrajectory,
  stationTrajectorySecondary,
  TRAJECTORY_ARROW,
  TRAJECTORY_TONE,
} = require('../trajectory');

describe('describeTrajectory', () => {
  test('null / non-object → null', () => {
    expect(describeTrajectory(null)).toBeNull();
    expect(describeTrajectory(undefined)).toBeNull();
    expect(describeTrajectory('foo')).toBeNull();
  });

  test('unknown direction → null', () => {
    expect(describeTrajectory({ direction: 'sideways' })).toBeNull();
  });

  test('rising produces amber/warning label with delta', () => {
    const d = describeTrajectory({
      direction: 'rising',
      delta_pence_per_l_7d: 2.4,
      confidence: 'high',
    });
    expect(d.tone).toBe('warning');
    expect(d.arrow).toBe(TRAJECTORY_ARROW.rising);
    expect(d.label).toContain('Rising');
    expect(d.label).toContain('+2.4p/L');
    expect(d.label).toContain('(7d)');
  });

  test('falling produces green/positive label with en-dash minus', () => {
    const d = describeTrajectory({
      direction: 'falling',
      delta_pence_per_l_7d: -1.8,
      confidence: 'high',
    });
    expect(d.tone).toBe('positive');
    expect(d.label).toContain('Falling');
    expect(d.label).toContain('1.8p/L');
    // uses en-dash minus \u2212, not hyphen
    expect(d.label).toContain('\u2212');
  });

  test('stable always neutral', () => {
    const d = describeTrajectory({ direction: 'stable', delta_pence_per_l_7d: 0.1 });
    expect(d.tone).toBe('neutral');
    expect(d.label).toContain('Stable');
  });

  test('station scope with low confidence + non-stable → null', () => {
    expect(
      describeTrajectory(
        { direction: 'rising', delta_pence_per_l_7d: 1, confidence: 'low' },
        { scope: 'station' }
      )
    ).toBeNull();
  });

  test('station scope with low confidence + stable still returns', () => {
    const d = describeTrajectory(
      { direction: 'stable', confidence: 'low' },
      { scope: 'station' }
    );
    expect(d).not.toBeNull();
    expect(d.tone).toBe('neutral');
  });

  test('national scope keeps low-confidence values', () => {
    const d = describeTrajectory(
      { direction: 'rising', delta_pence_per_l_7d: 0.5, confidence: 'low' },
      { scope: 'national' }
    );
    expect(d).not.toBeNull();
  });

  test('TONE maps covers all three directions', () => {
    expect(Object.keys(TRAJECTORY_TONE).sort()).toEqual(['falling', 'rising', 'stable']);
  });
});

describe('stationTrajectorySecondary', () => {
  test('hidden for stable direction', () => {
    expect(stationTrajectorySecondary({ direction: 'stable', confidence: 'high' })).toBeNull();
  });

  test('hidden for low confidence', () => {
    expect(
      stationTrajectorySecondary({
        direction: 'rising',
        delta_pence_per_l_7d: 2.1,
        confidence: 'low',
      })
    ).toBeNull();
  });

  test('rising with high confidence includes delta in line', () => {
    expect(
      stationTrajectorySecondary({
        direction: 'rising',
        delta_pence_per_l_7d: 2.1,
        confidence: 'high',
      })
    ).toBe('Prices rising at this station (+2.1p/L 7d)');
  });

  test('falling with medium confidence', () => {
    expect(
      stationTrajectorySecondary({
        direction: 'falling',
        delta_pence_per_l_7d: -1.3,
        confidence: 'medium',
      })
    ).toBe('Prices falling at this station (\u22121.3p/L 7d)');
  });

  test('missing delta gracefully omits it', () => {
    expect(
      stationTrajectorySecondary({ direction: 'rising', confidence: 'high' })
    ).toBe('Prices rising at this station');
  });
});
