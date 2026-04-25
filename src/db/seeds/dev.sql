-- Dev seed data
-- Run with: npm run seed

-- Sample leads
INSERT INTO leads (id, name, business, email, phone, pos, website, message, status) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Jane Smith', 'Jane''s Bistro', 'jane@janesbistro.com', '(555) 123-4567', 'Square', 'https://janesbistro.com', 'Want a custom site I can actually update myself. My current one I have to email someone every time the special changes.', 'converted'),
  ('a0000000-0000-0000-0000-000000000002', 'Mike Torres', 'Fresh Cuts Barbershop', 'mike@freshcuts.com', '(555) 234-5678', 'Clover', NULL, 'Looking for someone to handle the whole site so I can focus on the shop. Tired of WordPress freelancers ghosting.', 'new'),
  ('a0000000-0000-0000-0000-000000000003', 'Sarah Chen', 'Urban Threads Boutique', 'sarah@urbanthreads.com', '(555) 345-6789', 'Square', 'https://urbanthreads.squarespace.com', 'Site is slow, looks dated, and I can''t change my own product photos without help. Need an upgrade.', 'contacted')
ON CONFLICT DO NOTHING;

-- Sample client (converted from lead 1)
INSERT INTO clients (id, lead_id, firebase_uid, name, business, email) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'dev-client-uid-001', 'Jane Smith', 'Jane''s Bistro', 'jane@janesbistro.com')
ON CONFLICT DO NOTHING;

-- Sample project
INSERT INTO projects (id, client_id, title, description, status, start_date) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Jane''s Bistro Website', 'Custom restaurant site with self-serve menu editing. Square online ordering wired in.', 'development', '2026-04-01')
ON CONFLICT DO NOTHING;

-- Sample milestones
INSERT INTO milestones (project_id, title, description, status, sort_order) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Discovery call', 'Initial call to understand the business and what the owner needs to control day-to-day.', 'complete', 1),
  ('c0000000-0000-0000-0000-000000000001', 'Design mockup', 'Homepage and menu page design review.', 'in_progress', 2),
  ('c0000000-0000-0000-0000-000000000001', 'WordPress build + admin walkthrough', 'Build out the site and walk Jane through editing menu items, hours, and photos herself.', 'pending', 3),
  ('c0000000-0000-0000-0000-000000000001', 'Square integration', 'Wire up online ordering and menu sync.', 'pending', 4),
  ('c0000000-0000-0000-0000-000000000001', 'Launch', 'Go live with the new website.', 'pending', 5)
ON CONFLICT DO NOTHING;

-- Sample messages
INSERT INTO messages (project_id, sender_uid, sender_role, body) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'dev-admin-uid', 'admin', 'Hi Jane! I''ve started working on the design. I''ll have mockups ready for review by Friday.'),
  ('c0000000-0000-0000-0000-000000000001', 'dev-client-uid-001', 'client', 'Great! Can you make sure the menu is front and center? Also — I want to be able to update the daily specials myself before each service.')
ON CONFLICT DO NOTHING;
