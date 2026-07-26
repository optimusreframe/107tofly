
DO $$
DECLARE
  aero_group uuid := gen_random_uuid();
  apo_group  uuid := gen_random_uuid();
  aero_en uuid; aero_es uuid;
  apo_en uuid;  apo_es uuid;
  c_en uuid; c_es uuid;
  next_order int;
BEGIN
  SELECT COALESCE(MAX(order_index),-1)+1 INTO next_order FROM public.learning_units WHERE locale='en';

  -- ============== AERODYNAMICS BASICS ==============
  INSERT INTO public.learning_units(slug,locale,title,summary,order_index,status,translation_group_id)
  VALUES ('aerodynamics-basics','en','Aerodynamics Basics','The four forces, lift, drag and stability.', next_order,'published', aero_group)
  RETURNING id INTO aero_en;
  INSERT INTO public.learning_units(slug,locale,title,summary,order_index,status,translation_group_id)
  VALUES ('aerodynamics-basics','es','Fundamentos de aerodinámica','Las cuatro fuerzas, sustentación, resistencia y estabilidad.', next_order,'published', aero_group)
  RETURNING id INTO aero_es;

  -- Concept 1: Four forces
  INSERT INTO public.concepts(unit_id,title,body_md,order_index,locale) VALUES
  (aero_en,'Four Forces of Flight','Lift, weight, thrust and drag act on every airplane in flight.',0,'en') RETURNING id INTO c_en;
  INSERT INTO public.concepts(unit_id,title,body_md,order_index,locale) VALUES
  (aero_es,'Las cuatro fuerzas del vuelo','Sustentación, peso, empuje y resistencia actúan en todo avión en vuelo.',0,'es') RETURNING id INTO c_es;

  INSERT INTO public.exercises(concept_id,kind,payload,answer,explanation,difficulty,locale) VALUES
  (c_en,'mcq','{"prompt":"Which force opposes lift?","options":["Thrust","Drag","Weight","Yaw"],"hint":"Points toward the center of the Earth."}','{"index":2}','Weight (gravity) opposes lift.',1,'en'),
  (c_en,'mcq','{"prompt":"Which force opposes thrust?","options":["Lift","Weight","Drag","Torque"]}','{"index":2}','Drag opposes thrust along the flight path.',1,'en'),
  (c_en,'match','{"prompt":"Match each force to what it opposes","left":["Lift","Thrust"],"right":["Drag","Weight"]}','{"pairs":{"0":1,"1":0}}','Lift↔Weight, Thrust↔Drag.',2,'en');
  INSERT INTO public.exercises(concept_id,kind,payload,answer,explanation,difficulty,locale) VALUES
  (c_es,'mcq','{"prompt":"¿Qué fuerza se opone a la sustentación?","options":["Empuje","Resistencia","Peso","Guiñada"],"hint":"Apunta al centro de la Tierra."}','{"index":2}','El peso (gravedad) se opone a la sustentación.',1,'es'),
  (c_es,'mcq','{"prompt":"¿Qué fuerza se opone al empuje?","options":["Sustentación","Peso","Resistencia","Par motor"]}','{"index":2}','La resistencia se opone al empuje.',1,'es'),
  (c_es,'match','{"prompt":"Empareja cada fuerza con la que se opone","left":["Sustentación","Empuje"],"right":["Resistencia","Peso"]}','{"pairs":{"0":1,"1":0}}','Sustentación↔Peso, Empuje↔Resistencia.',2,'es');

  -- Concept 2: Angle of attack
  INSERT INTO public.concepts(unit_id,title,body_md,order_index,locale) VALUES
  (aero_en,'Angle of Attack','AoA is the angle between the chord line and the relative wind.',1,'en') RETURNING id INTO c_en;
  INSERT INTO public.concepts(unit_id,title,body_md,order_index,locale) VALUES
  (aero_es,'Ángulo de ataque','El AoA es el ángulo entre la cuerda y el viento relativo.',1,'es') RETURNING id INTO c_es;

  INSERT INTO public.exercises(concept_id,kind,payload,answer,explanation,difficulty,locale) VALUES
  (c_en,'mcq','{"prompt":"An aerodynamic stall occurs when the wing exceeds its:","options":["Never-exceed speed","Critical angle of attack","Max weight","Service ceiling"]}','{"index":1}','A stall is defined by exceeding the critical AoA, not speed.',2,'en'),
  (c_en,'cloze','{"prompt":"Angle of attack is the angle between the chord line and the ____ wind."}','{"blanks":["relative"]}','Relative wind is the airflow the wing actually sees.',2,'en');
  INSERT INTO public.exercises(concept_id,kind,payload,answer,explanation,difficulty,locale) VALUES
  (c_es,'mcq','{"prompt":"Una pérdida aerodinámica ocurre cuando el ala supera su:","options":["Velocidad de nunca exceder","Ángulo de ataque crítico","Peso máximo","Techo de servicio"]}','{"index":1}','La pérdida se define por superar el AoA crítico, no la velocidad.',2,'es'),
  (c_es,'cloze','{"prompt":"El ángulo de ataque es el ángulo entre la cuerda y el viento ____."}','{"blanks":["relativo"]}','El viento relativo es el flujo que el ala realmente ve.',2,'es');

  -- Concept 3: Load factor
  INSERT INTO public.concepts(unit_id,title,body_md,order_index,locale) VALUES
  (aero_en,'Load Factor','Load factor increases in turns; stall speed rises with the square root of load factor.',2,'en') RETURNING id INTO c_en;
  INSERT INTO public.concepts(unit_id,title,body_md,order_index,locale) VALUES
  (aero_es,'Factor de carga','El factor de carga aumenta en virajes; la velocidad de pérdida crece con la raíz del factor de carga.',2,'es') RETURNING id INTO c_es;

  INSERT INTO public.exercises(concept_id,kind,payload,answer,explanation,difficulty,locale) VALUES
  (c_en,'mcq','{"prompt":"In a 60° bank level turn, load factor is approximately:","options":["1.0 G","1.4 G","2.0 G","3.0 G"],"hint":"1/cos(bank)."}','{"index":2}','Load factor = 1/cos(60°) = 2.0.',3,'en');
  INSERT INTO public.exercises(concept_id,kind,payload,answer,explanation,difficulty,locale) VALUES
  (c_es,'mcq','{"prompt":"En un viraje nivelado con 60° de banqueo, el factor de carga es aproximadamente:","options":["1.0 G","1.4 G","2.0 G","3.0 G"],"hint":"1/cos(banqueo)."}','{"index":2}','Factor de carga = 1/cos(60°) = 2.0.',3,'es');

  -- Concept 4: Stability
  INSERT INTO public.concepts(unit_id,title,body_md,order_index,locale) VALUES
  (aero_en,'Stability & Control','Positive static stability returns the aircraft toward its trimmed state.',3,'en') RETURNING id INTO c_en;
  INSERT INTO public.concepts(unit_id,title,body_md,order_index,locale) VALUES
  (aero_es,'Estabilidad y control','La estabilidad estática positiva devuelve la aeronave a su estado compensado.',3,'es') RETURNING id INTO c_es;

  INSERT INTO public.exercises(concept_id,kind,payload,answer,explanation,difficulty,locale) VALUES
  (c_en,'mcq','{"prompt":"An aircraft with positive static stability, once disturbed, initially tends to:","options":["Diverge","Return to trimmed state","Oscillate forever","Roll inverted"]}','{"index":1}','That is the definition of positive static stability.',2,'en');
  INSERT INTO public.exercises(concept_id,kind,payload,answer,explanation,difficulty,locale) VALUES
  (c_es,'mcq','{"prompt":"Una aeronave con estabilidad estática positiva, al ser perturbada, tiende inicialmente a:","options":["Divergir","Volver al estado compensado","Oscilar indefinidamente","Rolar invertida"]}','{"index":1}','Esa es la definición de estabilidad estática positiva.',2,'es');

  -- ============== AIRPORT OPERATIONS ==============
  next_order := next_order + 1;

  INSERT INTO public.learning_units(slug,locale,title,summary,order_index,status,translation_group_id)
  VALUES ('airport-operations','en','Airport Operations','Runway markings, traffic pattern, and radio comms.', next_order,'published', apo_group)
  RETURNING id INTO apo_en;
  INSERT INTO public.learning_units(slug,locale,title,summary,order_index,status,translation_group_id)
  VALUES ('airport-operations','es','Operaciones de aeródromo','Marcas de pista, circuito de tráfico y comunicaciones por radio.', next_order,'published', apo_group)
  RETURNING id INTO apo_es;

  -- Concept 1: Runway markings
  INSERT INTO public.concepts(unit_id,title,body_md,order_index,locale) VALUES
  (apo_en,'Runway Markings','Numbers on runways indicate magnetic heading divided by 10.',0,'en') RETURNING id INTO c_en;
  INSERT INTO public.concepts(unit_id,title,body_md,order_index,locale) VALUES
  (apo_es,'Marcas de pista','Los números en la pista indican el rumbo magnético dividido por 10.',0,'es') RETURNING id INTO c_es;

  INSERT INTO public.exercises(concept_id,kind,payload,answer,explanation,difficulty,locale) VALUES
  (c_en,'mcq','{"prompt":"Runway 27 is aligned closest to which magnetic heading?","options":["027°","270°","027° or 207°","072°"],"hint":"Multiply the number by 10."}','{"index":1}','Runway numbers = magnetic heading / 10, rounded.',1,'en'),
  (c_en,'cloze','{"prompt":"Runway numbers correspond to the magnetic heading divided by ____."}','{"blanks":["10","ten"]}','Runway numbers are heading/10.',1,'en');
  INSERT INTO public.exercises(concept_id,kind,payload,answer,explanation,difficulty,locale) VALUES
  (c_es,'mcq','{"prompt":"La pista 27 está alineada aproximadamente con qué rumbo magnético?","options":["027°","270°","027° o 207°","072°"],"hint":"Multiplica el número por 10."}','{"index":1}','Los números de pista = rumbo magnético / 10, redondeado.',1,'es'),
  (c_es,'cloze','{"prompt":"Los números de pista corresponden al rumbo magnético dividido por ____."}','{"blanks":["10","diez"]}','Los números de pista son rumbo/10.',1,'es');

  -- Concept 2: Traffic pattern
  INSERT INTO public.concepts(unit_id,title,body_md,order_index,locale) VALUES
  (apo_en,'Traffic Pattern','Standard pattern legs: upwind, crosswind, downwind, base, final (left turns unless stated).',1,'en') RETURNING id INTO c_en;
  INSERT INTO public.concepts(unit_id,title,body_md,order_index,locale) VALUES
  (apo_es,'Circuito de tráfico','Tramos estándar: viento en cola opuesta, viento cruzado, viento en cola, base, final (virajes a la izquierda salvo indicación).',1,'es') RETURNING id INTO c_es;

  INSERT INTO public.exercises(concept_id,kind,payload,answer,explanation,difficulty,locale) VALUES
  (c_en,'order','{"prompt":"Put the pattern legs in the correct order after takeoff","items":["Upwind","Crosswind","Downwind","Base","Final"]}','{"order":[0,1,2,3,4]}','Standard sequence after departure.',2,'en');
  INSERT INTO public.exercises(concept_id,kind,payload,answer,explanation,difficulty,locale) VALUES
  (c_es,'order','{"prompt":"Ordena los tramos del circuito tras el despegue","items":["Viento en cola opuesta","Viento cruzado","Viento en cola","Base","Final"]}','{"order":[0,1,2,3,4]}','Secuencia estándar tras despegue.',2,'es');

  -- Concept 3: Light gun signals
  INSERT INTO public.concepts(unit_id,title,body_md,order_index,locale) VALUES
  (apo_en,'Light-Gun Signals','ATC uses colored light signals when radio comms fail.',2,'en') RETURNING id INTO c_en;
  INSERT INTO public.concepts(unit_id,title,body_md,order_index,locale) VALUES
  (apo_es,'Señales luminosas','ATC usa señales luminosas de colores cuando falla la radio.',2,'es') RETURNING id INTO c_es;

  INSERT INTO public.exercises(concept_id,kind,payload,answer,explanation,difficulty,locale) VALUES
  (c_en,'mcq','{"prompt":"Steady green light to an aircraft in flight means:","options":["Return for landing","Cleared to land","Airport unsafe, do not land","Give way to other aircraft"]}','{"index":1}','Steady green in flight = cleared to land.',2,'en'),
  (c_en,'match','{"prompt":"Match each in-flight signal","left":["Steady green","Steady red","Flashing red"],"right":["Cleared to land","Give way, continue circling","Airport unsafe, do not land"]}','{"pairs":{"0":0,"1":1,"2":2}}','Standard AIM signals.',3,'en');
  INSERT INTO public.exercises(concept_id,kind,payload,answer,explanation,difficulty,locale) VALUES
  (c_es,'mcq','{"prompt":"Luz verde continua a una aeronave en vuelo significa:","options":["Regrese a aterrizar","Autorizado a aterrizar","Aeródromo inseguro, no aterrice","Ceda el paso a otras aeronaves"]}','{"index":1}','Verde continua en vuelo = autorizado a aterrizar.',2,'es'),
  (c_es,'match','{"prompt":"Empareja cada señal en vuelo","left":["Verde continua","Roja continua","Roja intermitente"],"right":["Autorizado a aterrizar","Ceda el paso, siga circulando","Aeródromo inseguro, no aterrice"]}','{"pairs":{"0":0,"1":1,"2":2}}','Señales estándar AIM.',3,'es');

  -- Concept 4: Radio comms
  INSERT INTO public.concepts(unit_id,title,body_md,order_index,locale) VALUES
  (apo_en,'Radio Communication','Standard format: who you are calling, who you are, where you are, what you want.',3,'en') RETURNING id INTO c_en;
  INSERT INTO public.concepts(unit_id,title,body_md,order_index,locale) VALUES
  (apo_es,'Comunicaciones por radio','Formato estándar: a quién llamas, quién eres, dónde estás, qué solicitas.',3,'es') RETURNING id INTO c_es;

  INSERT INTO public.exercises(concept_id,kind,payload,answer,explanation,difficulty,locale) VALUES
  (c_en,'cloze','{"prompt":"Radio call structure: who you are calling, who you are, where you are, and what you ____."}','{"blanks":["want","intend"]}','Four W''s of radio communication.',2,'en');
  INSERT INTO public.exercises(concept_id,kind,payload,answer,explanation,difficulty,locale) VALUES
  (c_es,'cloze','{"prompt":"Estructura de llamada de radio: a quién llamas, quién eres, dónde estás, y qué ____."}','{"blanks":["solicitas","quieres"]}','Las cuatro W de la radio.',2,'es');
END $$;
