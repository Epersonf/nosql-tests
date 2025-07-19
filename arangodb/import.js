const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const readline = require('readline');
const { Database } = require('arangojs');

const TMP = path.resolve('tmp');
const DOWNLOADS = path.resolve(TMP, 'downloads');

const PROFILES_IN = path.resolve(DOWNLOADS, 'soc-pokec-profiles.txt.gz');
const RELATIONS_IN = path.resolve(DOWNLOADS, 'soc-pokec-relationships.txt.gz');

(async () => {
  const db = new Database({ url: 'http://127.0.0.1:8529' });

  const profiles = db.collection('profiles');
  const relations = db.edgeCollection('relations');

  console.log('Dropping collections if they exist...');
  try { await profiles.drop(); } catch (_) {}
  try { await relations.drop(); } catch (_) {}

  console.log('Creating collections...');
  await profiles.create();
  await relations.create({ type: 3 }); // type 3 = edge

  console.log('Importing profiles...');
  const gzStreamProfiles = fs.createReadStream(PROFILES_IN).pipe(zlib.createGunzip());
  const rlProfiles = readline.createInterface({ input: gzStreamProfiles });

  let size = rlProfiles.length;
  let count = 0;
  for await (const line of rlProfiles) {
    count++;
    const fields = line.split('\t');
    const key = 'P' + fields[0];
    const doc = { _key: key };

    const keys = [
      'public','completion_percentage','gender','region','last_login','registration','AGE','body',
      'I_am_working_in_field','spoken_languages','hobbies','I_most_enjoy_good_food','pets','body_type','my_eyesight','eye_color','hair_color','hair_type',
      'completed_level_of_education','favourite_color','relation_to_smoking','relation_to_alcohol','sign_in_zodiac','on_pokec_i_am_looking_for','love_is_for_me',
      'relation_to_casual_sex','my_partner_should_be','marital_status','children','relation_to_children','I_like_movies','I_like_watching_movie','I_like_music',
      'I_mostly_like_listening_to_music','the_idea_of_good_evening','I_like_specialties_from_kitchen','fun','I_am_going_to_concerts','my_active_sports',
      'my_passive_sports','profession','I_like_books','life_style','music','cars','politics','relationships','art_culture','hobbies_interests',
      'science_technologies','computers_internet','education','sport','movies','travelling','health','companies_brands','more'
    ];

    for (let i = 0; i < keys.length; i++) {
      const value = fields[i + 1]?.replace(/null/g, '') ?? null;
      doc[keys[i]] = value;
    }

    await profiles.save(doc).catch(e => console.error('Profile save error:', e));
  }

  console.log('Importing relations...');
  const gzStreamRelations = fs.createReadStream(RELATIONS_IN).pipe(zlib.createGunzip());
  const rlRelations = readline.createInterface({ input: gzStreamRelations });

  for await (const line of rlRelations) {
    const [from, to] = line.split('\t');
    await relations.save({ _from: 'profiles/P' + from, _to: 'profiles/P' + to })
      .catch(e => console.error('Relation save error:', e));
  }

  console.log('Importação finalizada com sucesso.');
})();
