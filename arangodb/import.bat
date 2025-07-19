@echo off
setlocal ENABLEDELAYEDEXPANSION

:: ==== CONFIGURAÇÃO ====
set DBNAME=pokec
set ARANGODB=databases\arangodb
set BENCHMARK=%cd%
set TMP=tmp
set DOWNLOADS=%TMP%\downloads

set PROFILES_IN=%DOWNLOADS%\soc-pokec-profiles.txt.gz
set PROFILES_OUT=%DOWNLOADS%\soc-pokec-profiles-arangodb.txt
set RELATIONS_IN=%DOWNLOADS%\soc-pokec-relationships.txt.gz
set RELATIONS_OUT=%DOWNLOADS%\soc-pokec-relationships-arangodb.txt

set ARANGOSH=%ARANGODB%\usr\bin\arangosh.exe
set ARANGOSH_CONF=%ARANGODB%\etc\arangodb3\arangosh.conf
set ARANGOIMP=%ARANGODB%\usr\bin\arangoimp.exe
set ARANGOIMP_CONF=%ARANGODB%\etc\arangodb3\arangoimp.conf

echo DATABASE: %DBNAME%
echo ARANGODB DIRECTORY: %ARANGODB%
echo BENCHMARK DIRECTORY: %BENCHMARK%
echo DOWNLOAD DIRECTORY: %DOWNLOADS%

:: ==== CRIA OUTPUT DIRECTORY ====
if not exist "%TMP%" mkdir "%TMP%"
if not exist "%DOWNLOADS%" mkdir "%DOWNLOADS%"

:: ==== CONVERTE PROFILES ====
if not exist "%PROFILES_OUT%" (
  echo Converting PROFILES
  echo _key	public	completion_percentage	gender	region	last_login	registration	AGE	body	I_am_working_in_field	spoken_languages	hobbies	I_most_enjoy_good_food	pets	body_type	my_eyesight	eye_color	hair_color	hair_type	completed_level_of_education	favourite_color	relation_to_smoking	relation_to_alcohol	sign_in_zodiac	on_pokec_i_am_looking_for	love_is_for_me	relation_to_casual_sex	my_partner_should_be	marital_status	children	relation_to_children	I_like_movies	I_like_watching_movie	I_like_music	I_mostly_like_listening_to_music	the_idea_of_good_evening	I_like_specialties_from_kitchen	fun	I_am_going_to_concerts	my_active_sports	my_passive_sports	profession	I_like_books	life_style	music	cars	politics	relationships	art_culture	hobbies_interests	science_technologies	computers_internet	education	sport	movies	travelling	health	companies_brands	more > "%PROFILES_OUT%"
  gzip -dc "%PROFILES_IN%" | sed "s/null//g" | sed "s/^/P/" >> "%PROFILES_OUT%"
)

:: ==== CONVERTE RELATIONS ====
if not exist "%RELATIONS_OUT%" (
  echo Converting RELATIONS
  echo _from	_to > "%RELATIONS_OUT%"
  gzip -dc "%RELATIONS_IN%" | awk "BEGIN {FS=\"\t\"} {print \"profiles/P\" $1 \"\tprofiles/P\" $2}" >> "%RELATIONS_OUT%"
)

:: ==== CRIA COLLECTIONS ====
echo Creating collections in ArangoDB...
echo var db = require(\"@arangodb\").db; > create_collections.js
echo try { db._drop(\"profiles\"); } catch(e) {} >> create_collections.js
echo try { db._drop(\"relations\"); } catch(e) {} >> create_collections.js
echo db._create(\"profiles\"); >> create_collections.js
echo db._createEdgeCollection(\"relations\", {keyOptions: { type: \"autoincrement\", offset: 0 }}); >> create_collections.js

%ARANGOSH% -c "%ARANGOSH_CONF%" --javascript.execute create_collections.js
del create_collections.js

:: ==== IMPORTA DADOS ====
echo Importando profiles...
%ARANGOIMP% -c "%ARANGOIMP_CONF%" --server.authentication false --type tsv --collection profiles --file "%PROFILES_OUT%" --threads 8

echo Importando relations...
%ARANGOIMP% -c "%ARANGOIMP_CONF%" --server.authentication false --type tsv --collection relations --file "%RELATIONS_OUT%" --threads 8

echo Importação finalizada com sucesso.
