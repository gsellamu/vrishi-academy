-- 003_zoom_copilot_schema.sql
-- Zoom Room AI Co-Pilot: analyses, photos, layouts, equipment catalog

-- Room analyses from AI vision
CREATE TABLE IF NOT EXISTS zoom_analyses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES academy_users(id) ON DELETE SET NULL,
  room_dimensions JSONB,        -- {width_m, depth_m, height_m}
  scores      JSONB,            -- {video:"B", audio:"C", lighting:"D", background:"A", privacy:"A"}
  issues      JSONB,            -- [{category, severity, description, fix}]
  overall_grade VARCHAR(2),
  notes       TEXT,
  photo_count INT DEFAULT 0,
  created_at  TIMESTAMP DEFAULT now()
);

-- Uploaded photos linked to analyses
CREATE TABLE IF NOT EXISTS zoom_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES zoom_analyses(id) ON DELETE CASCADE,
  minio_key   VARCHAR(512) NOT NULL,
  photo_type  VARCHAR(32),      -- front, left, right, behind, overhead
  ai_annotations JSONB,         -- bounding boxes, detected objects
  created_at  TIMESTAMP DEFAULT now()
);

-- Saved room layouts (2D/3D)
CREATE TABLE IF NOT EXISTS zoom_layouts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES academy_users(id) ON DELETE SET NULL,
  analysis_id UUID REFERENCES zoom_analyses(id) ON DELETE SET NULL,
  name        VARCHAR(128) NOT NULL,
  room        JSONB NOT NULL,   -- {width_m, depth_m, height_m}
  placements  JSONB NOT NULL DEFAULT '[]'::jsonb,
  source      VARCHAR(32) DEFAULT 'manual',  -- manual | ai_recommended | imported
  validation  JSONB,            -- gate results: [{rule, verdict, detail}]
  thumbnail_key VARCHAR(512),
  created_at  TIMESTAMP DEFAULT now(),
  updated_at  TIMESTAMP DEFAULT now()
);

-- Equipment catalog (seed data below)
CREATE TABLE IF NOT EXISTS zoom_equipment (
  id          VARCHAR(64) PRIMARY KEY,
  name        VARCHAR(128) NOT NULL,
  category    VARCHAR(32) NOT NULL,  -- camera, mic, light, furniture, accessory, session
  models      JSONB,                 -- [{brand, model, price}]
  dimensions  JSONB,                 -- {width_cm, depth_cm, height_cm}
  icon        VARCHAR(8),
  priority    VARCHAR(16),           -- essential, recommended, optional
  sort_order  INT DEFAULT 0
);

-- Chat history per analysis
CREATE TABLE IF NOT EXISTS zoom_copilot_chats (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES zoom_analyses(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES academy_users(id) ON DELETE SET NULL,
  role        VARCHAR(16) NOT NULL,  -- user | assistant
  content     TEXT NOT NULL,
  created_at  TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zoom_analyses_user ON zoom_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_zoom_photos_analysis ON zoom_photos(analysis_id);
CREATE INDEX IF NOT EXISTS idx_zoom_layouts_user ON zoom_layouts(user_id);
CREATE INDEX IF NOT EXISTS idx_zoom_chats_analysis ON zoom_copilot_chats(analysis_id);

-- Seed equipment catalog
INSERT INTO zoom_equipment (id, name, category, models, dimensions, icon, priority, sort_order) VALUES
('desk_standard', 'Standard Desk', 'furniture', '[{"brand":"IKEA","model":"BEKANT","price":200}]', '{"width_cm":120,"depth_cm":60,"height_cm":75}', null, 'essential', 1),
('chair_office', 'Office Chair', 'furniture', '[{"brand":"HON","model":"Ignition 2.0","price":250}]', '{"width_cm":60,"depth_cm":60,"height_cm":100}', null, 'essential', 2),
('monitor_24', '24" Monitor', 'furniture', '[{"brand":"Dell","model":"P2422H","price":220}]', '{"width_cm":55,"depth_cm":20,"height_cm":40}', null, 'essential', 3),
('webcam_hd', 'HD USB Webcam', 'camera', '[{"brand":"Logitech","model":"C920","price":70},{"brand":"Logitech","model":"C922","price":100},{"brand":"Elgato","model":"Facecam","price":180}]', '{"width_cm":8,"depth_cm":5,"height_cm":5}', null, 'essential', 4),
('ringlight_18', '18" Ring Light', 'light', '[{"brand":"Neewer","model":"18-inch LED","price":50}]', '{"width_cm":46,"depth_cm":46,"height_cm":180}', null, 'essential', 5),
('mic_usb', 'USB Condenser Mic', 'mic', '[{"brand":"Blue","model":"Yeti","price":130},{"brand":"Audio-Technica","model":"AT2020 USB+","price":100},{"brand":"Rode","model":"NT-USB Mini","price":100}]', '{"width_cm":12,"depth_cm":12,"height_cm":30}', null, 'essential', 6),
('boom_arm', 'Mic Boom Arm', 'mic', '[{"brand":"Rode","model":"PSA1","price":100},{"brand":"InnoGear","model":"Mic Arm","price":15}]', '{"width_cm":80,"depth_cm":10,"height_cm":50}', null, 'recommended', 7),
('pop_filter', 'Pop Filter', 'mic', '[{"brand":"Generic","model":"Dual-layer nylon","price":10}]', '{"width_cm":15,"depth_cm":5,"height_cm":15}', null, 'recommended', 8),
('softbox', 'Softbox Fill Light', 'light', '[{"brand":"Neewer","model":"LED Panel","price":30}]', '{"width_cm":60,"depth_cm":25,"height_cm":180}', null, 'recommended', 9),
('headphones', 'Wired Headphones', 'mic', '[{"brand":"Sony","model":"MDR-7506","price":80},{"brand":"Audio-Technica","model":"ATH-M50x","price":150}]', '{"width_cm":18,"depth_cm":8,"height_cm":20}', null, 'recommended', 10),
('bookshelf', 'Bookcase', 'furniture', '[{"brand":"IKEA","model":"KALLAX 2x2","price":50}]', '{"width_cm":80,"depth_cm":30,"height_cm":80}', null, 'optional', 11),
('plant', 'Decorative Plant', 'accessory', '[{"brand":"Various","model":"Faux plant","price":20}]', '{"width_cm":25,"depth_cm":25,"height_cm":60}', null, 'optional', 12),
('diploma_frame', 'Diploma Frame', 'accessory', '[{"brand":"Various","model":"8.5x11 frame","price":15}]', '{"width_cm":40,"depth_cm":2,"height_cm":30}', null, 'optional', 13),
('curtain', 'Window Curtain', 'accessory', '[{"brand":"Various","model":"Blackout curtain","price":30}]', '{"width_cm":120,"depth_cm":5,"height_cm":220}', null, 'essential', 14),
('timer_desk', 'Desk Timer', 'session', '[{"brand":"Various","model":"Digital timer","price":15}]', '{"width_cm":10,"depth_cm":5,"height_cm":10}', null, 'essential', 15),
('notepad', 'Notepad + Pen', 'session', '[{"brand":"Various","model":"Legal pad","price":5}]', '{"width_cm":20,"depth_cm":1,"height_cm":25}', null, 'essential', 16),
('tissue_box', 'Tissue Box', 'session', '[{"brand":"Various","model":"Standard","price":3}]', '{"width_cm":12,"depth_cm":12,"height_cm":8}', null, 'recommended', 17),
('water_bottle', 'Water Bottle', 'session', '[{"brand":"Various","model":"Insulated","price":15}]', '{"width_cm":8,"depth_cm":8,"height_cm":25}', null, 'essential', 18),
('ethernet_cable', 'Ethernet Cable', 'accessory', '[{"brand":"Various","model":"Cat6 50ft","price":15}]', null, null, 'recommended', 19)
ON CONFLICT (id) DO NOTHING;
