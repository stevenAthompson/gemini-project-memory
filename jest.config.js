/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js'],
  transform: {
    '^.+\.ts$': ['ts-jest', { useESM: true }],
  },
  extensionsToTreatAsEsm: ['.ts'],
};
