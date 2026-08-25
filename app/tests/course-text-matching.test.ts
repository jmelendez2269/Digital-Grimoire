import assert from 'node:assert/strict';
import test from 'node:test';
import { attachTextIdsToReadings } from '../src/lib/courses/match-course-texts';

test('structural section labels cannot cause unrelated library matches', () => {
  const content = {
    weeks: [{ readings: [{ title: 'Yoga Sutras', author: 'Patanjali', section: 'Book I' }] }],
  };
  const tarot = [{
    id: 'tarot-id',
    title: 'The Tarot of the Bohemians: The Most Ancient Book in the World. For the Exclusive Use of Initiates',
    author: 'Papus',
    cover_image_url: null,
  }];

  const result = attachTextIdsToReadings(content, tarot);
  assert.equal((result.weeks[0].readings[0] as { text_id?: string }).text_id, undefined);
});

test('an exact reading title still receives its library text id', () => {
  const content = {
    weeks: [{ readings: [{ title: 'Yoga Sutras', author: 'Patanjali', section: 'Book I' }] }],
  };
  const yogaSutras = [{
    id: 'yoga-id',
    title: 'Yoga Sutras',
    author: 'Patanjali',
    cover_image_url: null,
  }];

  const result = attachTextIdsToReadings(content, yogaSutras);
  assert.equal((result.weeks[0].readings[0] as { text_id?: string }).text_id, 'yoga-id');
});

test('reviewed FD01 section titles resolve to their parent library works', () => {
  const content = {
    weeks: [{ readings: [
      { title: 'Perseus', author: 'E. M. Berens' },
      { title: 'Perseus and Medusa', author: 'E. M. Berens' },
      { title: 'Perseus and the Gorgon', author: 'Thomas Bulfinch' },
    ] }],
  };
  const library = [
    {
      id: 'berens-id',
      title: 'Myths and Legends of Ancient Greece and Rome',
      author: 'E. M. Berens',
      cover_image_url: null,
    },
    {
      id: 'bulfinch-id',
      title: "Bulfinch's Mythology: The Age of Fable",
      author: 'Thomas Bulfinch',
      cover_image_url: null,
    },
  ];

  const result = attachTextIdsToReadings(content, library);
  assert.deepEqual(
    result.weeks[0].readings.map((reading) => (reading as { text_id?: string }).text_id),
    ['berens-id', 'berens-id', 'bulfinch-id']
  );
});
