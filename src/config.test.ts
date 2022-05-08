import {
  DEFAULT_FREQUENCY,
  DEFAULT_LENGTH,
  NOTE_DELIMITER,
  PARAMETER_DELIMITER,
} from './config'

test('Default config', () => {
  expect(DEFAULT_FREQUENCY).toBeTruthy()
  expect(DEFAULT_LENGTH).toBeCloseTo(DEFAULT_LENGTH)
  expect(NOTE_DELIMITER.length).toBe(1)
  expect(PARAMETER_DELIMITER.length).toBe(1)
})
