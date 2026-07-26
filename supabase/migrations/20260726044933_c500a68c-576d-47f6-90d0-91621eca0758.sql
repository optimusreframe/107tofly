
DO $$
DECLARE
  tg uuid := gen_random_uuid();
  u_en uuid; u_es uuid;
  c1_en uuid; c2_en uuid; c3_en uuid; c4_en uuid; c5_en uuid;
  c1_es uuid; c2_es uuid; c3_es uuid; c4_es uuid; c5_es uuid;
BEGIN
  -- Skip if already seeded
  IF EXISTS (SELECT 1 FROM public.learning_units WHERE slug = 'airspace') THEN
    RETURN;
  END IF;

  INSERT INTO public.learning_units (slug, locale, title, summary, order_index, status, translation_group_id)
  VALUES ('airspace','en','Airspace Classification',
    'Understand US airspace classes A–G, VFR weather minimums, and entry requirements.',
    1,'published',tg) RETURNING id INTO u_en;

  INSERT INTO public.learning_units (slug, locale, title, summary, order_index, status, translation_group_id)
  VALUES ('airspace','es','Clasificación del Espacio Aéreo',
    'Comprende las clases de espacio aéreo A–G, mínimos VFR y requisitos de entrada.',
    1,'published',tg) RETURNING id INTO u_es;

  -- EN concepts
  INSERT INTO public.concepts (unit_id, order_index, title, body_md, locale) VALUES
    (u_en,0,'Class A','Class A airspace extends from 18,000 ft MSL up to FL600. IFR only. ATC clearance required.','en') RETURNING id INTO c1_en;
  INSERT INTO public.concepts (unit_id, order_index, title, body_md, locale) VALUES
    (u_en,1,'Class B','Surrounds the busiest airports. Shaped like an upside-down wedding cake. ATC clearance required before entry.','en') RETURNING id INTO c2_en;
  INSERT INTO public.concepts (unit_id, order_index, title, body_md, locale) VALUES
    (u_en,2,'Class C','Surrounds airports with an operational control tower and radar approach control. Two-way radio communication required.','en') RETURNING id INTO c3_en;
  INSERT INTO public.concepts (unit_id, order_index, title, body_md, locale) VALUES
    (u_en,3,'Class D','Surrounds airports with an operational control tower. Two-way radio communication required.','en') RETURNING id INTO c4_en;
  INSERT INTO public.concepts (unit_id, order_index, title, body_md, locale) VALUES
    (u_en,4,'Class E & G','Class E is controlled airspace not A/B/C/D. Class G is uncontrolled airspace.','en') RETURNING id INTO c5_en;

  -- ES concepts
  INSERT INTO public.concepts (unit_id, order_index, title, body_md, locale) VALUES
    (u_es,0,'Clase A','Espacio Clase A: desde 18,000 ft MSL hasta FL600. Solo IFR. Requiere autorización ATC.','es') RETURNING id INTO c1_es;
  INSERT INTO public.concepts (unit_id, order_index, title, body_md, locale) VALUES
    (u_es,1,'Clase B','Rodea los aeropuertos más concurridos. Forma de pastel invertido. Requiere autorización ATC.','es') RETURNING id INTO c2_es;
  INSERT INTO public.concepts (unit_id, order_index, title, body_md, locale) VALUES
    (u_es,2,'Clase C','Rodea aeropuertos con torre y radar de aproximación. Requiere comunicación bilateral.','es') RETURNING id INTO c3_es;
  INSERT INTO public.concepts (unit_id, order_index, title, body_md, locale) VALUES
    (u_es,3,'Clase D','Rodea aeropuertos con torre operativa. Requiere comunicación bilateral.','es') RETURNING id INTO c4_es;
  INSERT INTO public.concepts (unit_id, order_index, title, body_md, locale) VALUES
    (u_es,4,'Clase E y G','Clase E es espacio controlado que no es A/B/C/D. Clase G es no controlado.','es') RETURNING id INTO c5_es;

  -- EN exercises (MCQ)
  INSERT INTO public.exercises (concept_id, kind, payload, answer, explanation, difficulty, locale) VALUES
    (c1_en,'mcq','{"prompt":"Class A airspace extends from which altitude?","options":["10,000 ft MSL to FL600","18,000 ft MSL to FL600","Surface to 10,000 ft","FL180 to unlimited"]}','{"correct_index":1}','Class A: 18,000 ft MSL up to and including FL600.',1,'en'),
    (c1_en,'mcq','{"prompt":"Which flight rules are allowed in Class A?","options":["VFR only","IFR only","Both VFR and IFR","SVFR only"]}','{"correct_index":1}','Class A is IFR only.',1,'en'),
    (c2_en,'mcq','{"prompt":"What is required to enter Class B airspace?","options":["Two-way radio","ATC clearance","Transponder only","Nothing"]}','{"correct_index":1}','Explicit ATC clearance is required before entering Class B.',2,'en'),
    (c2_en,'cloze','{"prompt":"Class B airspace is shaped like an ___ wedding cake.","blanks":1}','{"answers":["upside-down"]}','Layered structure resembles an upside-down wedding cake.',2,'en'),
    (c3_en,'mcq','{"prompt":"Class C requires:","options":["Clearance","Two-way radio communication","Nothing","VFR only"]}','{"correct_index":1}','Two-way radio contact must be established before entry.',1,'en'),
    (c4_en,'mcq','{"prompt":"Class D exists around airports with:","options":["Radar only","Operational control tower","Class B primary","No tower"]}','{"correct_index":1}','Class D surrounds airports with an operational control tower.',1,'en'),
    (c5_en,'mcq','{"prompt":"Class G airspace is:","options":["Controlled","Uncontrolled","IFR only","Prohibited"]}','{"correct_index":1}','Class G is uncontrolled airspace.',1,'en');

  -- ES exercises
  INSERT INTO public.exercises (concept_id, kind, payload, answer, explanation, difficulty, locale) VALUES
    (c1_es,'mcq','{"prompt":"¿Desde qué altitud se extiende el espacio Clase A?","options":["10,000 ft MSL a FL600","18,000 ft MSL a FL600","Superficie a 10,000 ft","FL180 a ilimitado"]}','{"correct_index":1}','Clase A: 18,000 ft MSL hasta FL600.',1,'es'),
    (c1_es,'mcq','{"prompt":"¿Qué reglas de vuelo se permiten en Clase A?","options":["Solo VFR","Solo IFR","Ambas","Solo SVFR"]}','{"correct_index":1}','Clase A es solo IFR.',1,'es'),
    (c2_es,'mcq','{"prompt":"¿Qué se requiere para entrar a Clase B?","options":["Radio bilateral","Autorización ATC","Solo transpondedor","Nada"]}','{"correct_index":1}','Se requiere autorización ATC explícita.',2,'es'),
    (c2_es,'cloze','{"prompt":"El espacio Clase B tiene forma de pastel de bodas ___.","blanks":1}','{"answers":["invertido"]}','La estructura por capas se asemeja a un pastel de bodas invertido.',2,'es'),
    (c3_es,'mcq','{"prompt":"Clase C requiere:","options":["Autorización","Comunicación bilateral por radio","Nada","Solo VFR"]}','{"correct_index":1}','Se debe establecer contacto bilateral antes de entrar.',1,'es'),
    (c4_es,'mcq','{"prompt":"Clase D existe alrededor de aeropuertos con:","options":["Solo radar","Torre operativa","Clase B primaria","Sin torre"]}','{"correct_index":1}','Clase D rodea aeropuertos con torre operativa.',1,'es'),
    (c5_es,'mcq','{"prompt":"El espacio Clase G es:","options":["Controlado","No controlado","Solo IFR","Prohibido"]}','{"correct_index":1}','Clase G es espacio aéreo no controlado.',1,'es');
END $$;
