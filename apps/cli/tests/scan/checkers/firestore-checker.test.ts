import { describe, test, expect } from 'vitest';
import { firestoreChecker } from '../../../src/scan/checkers/firestore-checker';
import axios from 'axios';

//todo finish this check
describe.skip('firestore-checker', () => {
  test('https://vuejsexamples.com contains firebase, should find public credentials', async () => {
    const response = await axios.get('https://vuejsexamples.com');

    const result = await firestoreChecker({
      body: response.data,
      url: 'https://vuejsexamples.com',
    });

    expect(result.success).toBe(true);
  }, 9999999);
});
