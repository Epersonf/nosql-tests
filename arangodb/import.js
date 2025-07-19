const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const readline = require('readline');
const { Database } = require('arangojs');

const TMP = path.resolve('tmp');
const DOWNLOADS = path.resolve(TMP, 'downloads');
const PROFILES_IN = path.resolve(DOWNLOADS, 'soc-pokec-profiles.txt.gz');
const RELATIONS_IN = path.resolve(DOWNLOADS, 'soc-pokec-relationships.txt.gz');
const BATCH_SIZE = 100;

const PROFILE_KEYS = [
  'public','completion_percentage','gender','region','last_login','registration','AGE','body',
  'I_am_working_in_field','spoken_languages','hobbies','I_most_enjoy_good_food','pets','body_type','my_eyesight','eye_color','hair_color','hair_type',
  'completed_level_of_education','favourite_color','relation_to_smoking','relation_to_alcohol','sign_in_zodiac','on_pokec_i_am_looking_for','love_is_for_me',
  'relation_to_casual_sex','my_partner_should_be','marital_status','children','relation_to_children','I_like_movies','I_like_watching_movie','I_like_music',
  'I_mostly_like_listening_to_music','the_idea_of_good_evening','I_like_specialties_from_kitchen','fun','I_am_going_to_concerts','my_active_sports',
  'my_passive_sports','profession','I_like_books','life_style','music','cars','politics','relationships','art_culture','hobbies_interests',
  'science_technologies','computers_internet','education','sport','movies','travelling','health','companies_brands','more'
];

async function promptInput(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (value) => {
      rl.close();
      resolve(parseInt(value.trim(), 10) || 0);
    });
  });
}

async function batchInsert(lines, builder, saver, maxCount) {
  const batch = [];
  let count = 0;
  for await (const line of lines) {
    if (maxCount && count >= maxCount) break;
    batch.push(builder(line));
    count++;
    if (batch.length === BATCH_SIZE) {
      await Promise.all(batch.map(saver));
      batch.length = 0;
    }
  }
  if (batch.length > 0) await Promise.all(batch.map(saver));
}

(async () => {
  const MAX_PROFILES = await promptInput('Qtd perfis (0 = all): ');
  const MAX_RELATIONS = await promptInput('Qtd relações (0 = all): ');

  const db = new Database({ url: 'http://127.0.0.1:8529' });
  const profiles = db.collection('profiles');
  const relations = db.edgeCollection('relations');

  console.log('Resetting collections...');
  try { await profiles.drop(); } catch {}
  try { await relations.drop(); } catch {}
  await profiles.create();
  await relations.create({ type: 3 });

  console.log(`Importing up to ${MAX_PROFILES || '∞'} profiles...`);
  const profileStream = fs.createReadStream(PROFILES_IN).pipe(zlib.createGunzip());
  const rlProfiles = readline.createInterface({ input: profileStream });

  await batchInsert(
    rlProfiles,
    (line) => {
      const fields = line.split('\t');
      const doc = { _key: 'P' + fields[0] };
      for (let i = 0; i < PROFILE_KEYS.length; i++) {
        doc[PROFILE_KEYS[i]] = fields[i + 1]?.replace(/null/g, '') ?? null;
      }
      return doc;
    },
    (doc) => profiles.save(doc).catch(e => console.error('Profile save error:', e.message)),
    MAX_PROFILES
  );

  console.log(`Importing up to ${MAX_RELATIONS || '∞'} relations...`);
  const relationStream = fs.createReadStream(RELATIONS_IN).pipe(zlib.createGunzip());
  const rlRelations = readline.createInterface({ input: relationStream });

  await batchInsert(
    rlRelations,
    (line) => {
      const [from, to] = line.split('\t');
      return {
        _from: 'profiles/P' + from,
        _to: 'profiles/P' + to
      };
    },
    (doc) => relations.save(doc).catch(e => console.error('Relation save error:', e.message)),
    MAX_RELATIONS
  );

  console.log('Importação finalizada com sucesso.');
})();
