
DO $$
DECLARE
  u_weather_en uuid; u_weather_es uuid;
  u_regs_en uuid;    u_regs_es uuid;
  c uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.learning_units WHERE slug IN ('weather-basics','regulations-basics')) THEN
    RAISE NOTICE 'Seed already applied; skipping.';
    RETURN;
  END IF;

  -- ============ WEATHER BASICS EN ============
  INSERT INTO public.learning_units (slug, locale, title, summary, order_index, status, translation_group_id)
  VALUES ('weather-basics','en','Weather Basics','Read METAR/TAF, understand wind, density altitude and thunderstorm hazards.',2,'published', gen_random_uuid())
  RETURNING id INTO u_weather_en;

  -- METAR
  INSERT INTO public.concepts (unit_id, order_index, title, body_md, locale)
  VALUES (u_weather_en, 1, 'METAR basics', 'METAR is a routine surface weather report. Read wind, visibility, sky, temp/dew, altimeter.', 'en')
  RETURNING id INTO c;
  INSERT INTO public.exercises (concept_id, kind, payload, answer, explanation, difficulty, locale) VALUES
   (c,'mcq','{"prompt":"In a METAR, what does 27015G25KT mean?","options":["Wind 270° at 15 kt gusting 25 kt","Wind 015° at 27 kt","Visibility 27015 meters","Altimeter 27.015 inHg"]}','{"index":0}','270° at 15 kt gusting 25 kt.',1,'en'),
   (c,'cloze','{"prompt":"METAR visibility of ____ SM means 10 statute miles or more."}','{"text":"10"}','10SM = 10 statute miles or greater.',1,'en');

  -- TAF
  INSERT INTO public.concepts (unit_id, order_index, title, body_md, locale)
  VALUES (u_weather_en, 2, 'TAF basics', 'Terminal Aerodrome Forecast — expected conditions within ~5 SM of the airport.', 'en')
  RETURNING id INTO c;
  INSERT INTO public.exercises (concept_id, kind, payload, answer, explanation, difficulty, locale) VALUES
   (c,'mcq','{"prompt":"A TAF covers conditions within approximately what distance of the airport?","options":["1 SM","5 SM","25 SM","50 SM"]}','{"index":1}','TAFs describe expected conditions within ~5 SM of the runway complex.',1,'en'),
   (c,'cloze','{"prompt":"In a TAF, ____ introduces a temporary change expected less than half the period."}','{"text":"TEMPO"}','TEMPO = temporary condition, <1 hour and <50% of the period.',2,'en');

  -- Wind & DA
  INSERT INTO public.concepts (unit_id, order_index, title, body_md, locale)
  VALUES (u_weather_en, 3, 'Wind and density altitude', 'High DA reduces performance; headwind shortens takeoff, tailwind lengthens it.', 'en')
  RETURNING id INTO c;
  INSERT INTO public.exercises (concept_id, kind, payload, answer, explanation, difficulty, locale) VALUES
   (c,'mcq','{"prompt":"Density altitude increases when…","options":["Temperature and humidity increase","Pressure increases","Temperature drops","Altitude decreases"]}','{"index":0}','Hot, humid, high = high DA = worse performance.',2,'en'),
   (c,'cloze','{"prompt":"A ____ wind on takeoff shortens the ground roll."}','{"text":"headwind"}','Headwind reduces groundspeed needed for liftoff.',1,'en');

  -- Thunderstorms
  INSERT INTO public.concepts (unit_id, order_index, title, body_md, locale)
  VALUES (u_weather_en, 4, 'Thunderstorm hazards', 'Avoid TS by at least 20 NM; expect wind shear, hail, turbulence, icing.', 'en')
  RETURNING id INTO c;
  INSERT INTO public.exercises (concept_id, kind, payload, answer, explanation, difficulty, locale) VALUES
   (c,'mcq','{"prompt":"Minimum recommended lateral distance from a severe thunderstorm?","options":["5 NM","10 NM","20 NM","50 NM"]}','{"index":2}','FAA recommends avoiding severe TS by at least 20 NM.',2,'en'),
   (c,'cloze','{"prompt":"The most severe wind shear near a thunderstorm is called a ____ ."}','{"text":"microburst"}','Microbursts produce extreme downdrafts and shear.',2,'en');

  -- ============ WEATHER BASICS ES ============
  INSERT INTO public.learning_units (slug, locale, title, summary, order_index, status, translation_group_id)
  VALUES ('weather-basics','es','Meteorología básica','Leer METAR/TAF, entender viento, altitud densidad y peligros de tormentas.',2,'published',
    (SELECT translation_group_id FROM public.learning_units WHERE id = u_weather_en))
  RETURNING id INTO u_weather_es;

  INSERT INTO public.concepts (unit_id, order_index, title, body_md, locale)
  VALUES (u_weather_es, 1, 'METAR básico', 'METAR: reporte rutinario de superficie. Viento, visibilidad, cielo, T/Td, altímetro.', 'es')
  RETURNING id INTO c;
  INSERT INTO public.exercises (concept_id, kind, payload, answer, explanation, difficulty, locale) VALUES
   (c,'mcq','{"prompt":"En un METAR, ¿qué significa 27015G25KT?","options":["Viento 270° a 15 kt con ráfagas de 25 kt","Viento 015° a 27 kt","Visibilidad 27015 metros","Altímetro 27.015 inHg"]}','{"index":0}','270° a 15 kt con ráfagas a 25 kt.',1,'es'),
   (c,'cloze','{"prompt":"Visibilidad METAR de ____ SM indica 10 millas estatutas o más."}','{"text":"10"}','10SM = 10 SM o más.',1,'es');

  INSERT INTO public.concepts (unit_id, order_index, title, body_md, locale)
  VALUES (u_weather_es, 2, 'TAF básico', 'Pronóstico terminal — condiciones esperadas a ~5 SM del aeródromo.', 'es')
  RETURNING id INTO c;
  INSERT INTO public.exercises (concept_id, kind, payload, answer, explanation, difficulty, locale) VALUES
   (c,'mcq','{"prompt":"Un TAF cubre condiciones dentro de aproximadamente qué distancia del aeropuerto?","options":["1 SM","5 SM","25 SM","50 SM"]}','{"index":1}','~5 SM del complejo de pista.',1,'es'),
   (c,'cloze','{"prompt":"En un TAF, ____ introduce un cambio temporal esperado menos de la mitad del período."}','{"text":"TEMPO"}','TEMPO = temporal, <1h y <50% del período.',2,'es');

  INSERT INTO public.concepts (unit_id, order_index, title, body_md, locale)
  VALUES (u_weather_es, 3, 'Viento y altitud densidad', 'DA alta reduce performance; viento en cara acorta despegue.', 'es')
  RETURNING id INTO c;
  INSERT INTO public.exercises (concept_id, kind, payload, answer, explanation, difficulty, locale) VALUES
   (c,'mcq','{"prompt":"La altitud densidad aumenta cuando…","options":["Sube la temperatura y humedad","Sube la presión","Baja la temperatura","Baja la altitud"]}','{"index":0}','Caliente, húmedo y alto = DA alta = peor performance.',2,'es'),
   (c,'cloze','{"prompt":"Un viento de ____ al despegue acorta el rodaje."}','{"text":"cara"}','Viento en cara reduce la velocidad de suelo necesaria.',1,'es');

  INSERT INTO public.concepts (unit_id, order_index, title, body_md, locale)
  VALUES (u_weather_es, 4, 'Peligros de tormenta', 'Evitar TS al menos 20 NM; cizalladura, granizo, turbulencia, engelamiento.', 'es')
  RETURNING id INTO c;
  INSERT INTO public.exercises (concept_id, kind, payload, answer, explanation, difficulty, locale) VALUES
   (c,'mcq','{"prompt":"Distancia lateral mínima recomendada de una tormenta severa?","options":["5 NM","10 NM","20 NM","50 NM"]}','{"index":2}','FAA recomienda al menos 20 NM de tormentas severas.',2,'es'),
   (c,'cloze','{"prompt":"La cizalladura más severa cerca de una tormenta se llama ____ ."}','{"text":"microburst"}','Microburst: descendente extrema y cizalladura.',2,'es');

  -- ============ REGULATIONS BASICS EN ============
  INSERT INTO public.learning_units (slug, locale, title, summary, order_index, status, translation_group_id)
  VALUES ('regulations-basics','en','Regulations Basics','Certificates, medicals, right-of-way and VFR weather minimums.',3,'published', gen_random_uuid())
  RETURNING id INTO u_regs_en;

  INSERT INTO public.concepts (unit_id, order_index, title, body_md, locale)
  VALUES (u_regs_en, 1, 'Pilot certificates', 'Student, Sport, Recreational, Private, Commercial, ATP.', 'en')
  RETURNING id INTO c;
  INSERT INTO public.exercises (concept_id, kind, payload, answer, explanation, difficulty, locale) VALUES
   (c,'mcq','{"prompt":"Minimum age to hold a Private Pilot certificate (airplane)?","options":["14","16","17","18"]}','{"index":2}','Private pilot minimum age is 17 (14 for solo glider/balloon).',1,'en'),
   (c,'cloze','{"prompt":"A ____ pilot certificate is required to be compensated for flying."}','{"text":"commercial"}','Commercial certificate needed to be paid to fly.',1,'en');

  INSERT INTO public.concepts (unit_id, order_index, title, body_md, locale)
  VALUES (u_regs_en, 2, 'Medical certificates', 'First-, Second-, Third-class and BasicMed have different privileges and durations.', 'en')
  RETURNING id INTO c;
  INSERT INTO public.exercises (concept_id, kind, payload, answer, explanation, difficulty, locale) VALUES
   (c,'mcq','{"prompt":"Which medical class is required to exercise ATP privileges?","options":["Third-class","Second-class","First-class","BasicMed"]}','{"index":2}','ATP requires a First-class medical.',2,'en'),
   (c,'cloze','{"prompt":"A ____ medical is required for commercial (non-ATP) operations."}','{"text":"second-class"}','Second-class medical for commercial ops.',2,'en');

  INSERT INTO public.concepts (unit_id, order_index, title, body_md, locale)
  VALUES (u_regs_en, 3, 'Right of way', 'Basic rules: distress, balloon, glider, airship, powered, then approaching head-on both turn right.', 'en')
  RETURNING id INTO c;
  INSERT INTO public.exercises (concept_id, kind, payload, answer, explanation, difficulty, locale) VALUES
   (c,'mcq','{"prompt":"Two aircraft converging at the same altitude (not head-on) — who has the right of way?","options":["The larger aircraft","The aircraft on the right","The faster aircraft","The aircraft descending"]}','{"index":1}','Aircraft on the right has right of way (converging).',2,'en'),
   (c,'cloze','{"prompt":"When approaching head-on, both aircraft alter course to the ____ ."}','{"text":"right"}','Head-on: both turn right.',1,'en');

  INSERT INTO public.concepts (unit_id, order_index, title, body_md, locale)
  VALUES (u_regs_en, 4, 'VFR weather minimums', 'Class E below 10,000 MSL day: 3 SM, 500 below/1000 above/2000 horizontal.', 'en')
  RETURNING id INTO c;
  INSERT INTO public.exercises (concept_id, kind, payload, answer, explanation, difficulty, locale) VALUES
   (c,'mcq','{"prompt":"VFR minimum visibility in Class E below 10,000 MSL (day)?","options":["1 SM","3 SM","5 SM","1/2 SM"]}','{"index":1}','Class E below 10,000 MSL day: 3 SM.',2,'en'),
   (c,'cloze','{"prompt":"In Class E below 10,000 MSL, cloud clearance is 500 below, 1000 above, ____ horizontal (feet)."}','{"text":"2000"}','Standard 500/1000/2000 rule.',2,'en');

  -- ============ REGULATIONS BASICS ES ============
  INSERT INTO public.learning_units (slug, locale, title, summary, order_index, status, translation_group_id)
  VALUES ('regulations-basics','es','Regulaciones básicas','Certificados, médicos, derecho de paso y mínimos VFR.',3,'published',
    (SELECT translation_group_id FROM public.learning_units WHERE id = u_regs_en))
  RETURNING id INTO u_regs_es;

  INSERT INTO public.concepts (unit_id, order_index, title, body_md, locale)
  VALUES (u_regs_es, 1, 'Certificados de piloto', 'Estudiante, Sport, Recreativo, Privado, Comercial, ATP.', 'es')
  RETURNING id INTO c;
  INSERT INTO public.exercises (concept_id, kind, payload, answer, explanation, difficulty, locale) VALUES
   (c,'mcq','{"prompt":"Edad mínima para Piloto Privado (avión)?","options":["14","16","17","18"]}','{"index":2}','17 años (14 para solo en planeador/globo).',1,'es'),
   (c,'cloze','{"prompt":"Se requiere un certificado ____ para ser remunerado por volar."}','{"text":"comercial"}','Comercial para cobrar por volar.',1,'es');

  INSERT INTO public.concepts (unit_id, order_index, title, body_md, locale)
  VALUES (u_regs_es, 2, 'Certificados médicos', 'Primera, segunda y tercera clase, y BasicMed.', 'es')
  RETURNING id INTO c;
  INSERT INTO public.exercises (concept_id, kind, payload, answer, explanation, difficulty, locale) VALUES
   (c,'mcq','{"prompt":"¿Qué clase de médico se requiere para ejercer privilegios ATP?","options":["Tercera","Segunda","Primera","BasicMed"]}','{"index":2}','ATP requiere médico de primera clase.',2,'es'),
   (c,'cloze','{"prompt":"Se requiere un médico de ____ clase para operaciones comerciales (no ATP)."}','{"text":"segunda"}','Segunda clase para comercial.',2,'es');

  INSERT INTO public.concepts (unit_id, order_index, title, body_md, locale)
  VALUES (u_regs_es, 3, 'Derecho de paso', 'Emergencia, globo, planeador, dirigible, motor; frente a frente ambos giran a la derecha.', 'es')
  RETURNING id INTO c;
  INSERT INTO public.exercises (concept_id, kind, payload, answer, explanation, difficulty, locale) VALUES
   (c,'mcq','{"prompt":"Dos aeronaves convergen a igual altitud (no frente a frente). ¿Quién tiene el derecho de paso?","options":["La más grande","La que está a la derecha","La más rápida","La que desciende"]}','{"index":1}','La aeronave a la derecha.',2,'es'),
   (c,'cloze','{"prompt":"Al aproximarse frente a frente, ambas aeronaves giran a la ____ ."}','{"text":"derecha"}','Frente a frente: ambas a la derecha.',1,'es');

  INSERT INTO public.concepts (unit_id, order_index, title, body_md, locale)
  VALUES (u_regs_es, 4, 'Mínimos VFR', 'Clase E bajo 10,000 MSL diurno: 3 SM y 500/1000/2000.', 'es')
  RETURNING id INTO c;
  INSERT INTO public.exercises (concept_id, kind, payload, answer, explanation, difficulty, locale) VALUES
   (c,'mcq','{"prompt":"Visibilidad mínima VFR en Clase E bajo 10,000 MSL (día)?","options":["1 SM","3 SM","5 SM","1/2 SM"]}','{"index":1}','Clase E bajo 10,000 MSL día: 3 SM.',2,'es'),
   (c,'cloze','{"prompt":"En Clase E bajo 10,000 MSL, separación de nubes: 500 abajo, 1000 arriba y ____ horizontal (pies)."}','{"text":"2000"}','Regla 500/1000/2000.',2,'es');
END $$;
