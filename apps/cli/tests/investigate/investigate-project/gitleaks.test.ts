import { describe, test } from 'vitest';
import { detect } from '../../../src/investigate/investigate-project/gitleaks';

describe.skip('gitleaks', () => {
  test('detect', () => {
    const report = detect('/workspaces/temp/http_ultimateorb.com');
    console.log(report);
  });
});
