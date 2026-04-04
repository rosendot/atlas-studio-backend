-- Dev seed data
-- Run with: npm run seed

-- Sample leads
INSERT INTO leads (id, name, business, email, phone, pos, website, message, status) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Jane Smith', 'Jane''s Bistro', 'jane@janesbistro.com', '(555) 123-4567', 'Square', 'https://janesbistro.com', 'Looking for a modern website with online ordering.', 'converted'),
  ('a0000000-0000-0000-0000-000000000002', 'Mike Torres', 'Fresh Cuts Barbershop', 'mike@freshcuts.com', '(555) 234-5678', 'Clover', NULL, 'Need a site with appointment booking.', 'new'),
  ('a0000000-0000-0000-0000-000000000003', 'Sarah Chen', 'Urban Threads Boutique', 'sarah@urbanthreads.com', '(555) 345-6789', 'Square', 'https://urbanthreads.squarespace.com', 'Current site is slow and outdated.', 'contacted')
ON CONFLICT DO NOTHING;

-- Sample client (converted from lead 1)
INSERT INTO clients (id, lead_id, firebase_uid, name, business, email) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'dev-client-uid-001', 'Jane Smith', 'Jane''s Bistro', 'jane@janesbistro.com')
ON CONFLICT DO NOTHING;

-- Sample project
INSERT INTO projects (id, client_id, title, description, status, start_date) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Jane''s Bistro Website', 'Modern restaurant website with Square online ordering integration.', 'development', '2026-04-01')
ON CONFLICT DO NOTHING;

-- Sample milestones
INSERT INTO milestones (project_id, title, description, status, sort_order) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Discovery call', 'Initial call to understand business needs.', 'complete', 1),
  ('c0000000-0000-0000-0000-000000000001', 'Design mockup', 'Homepage and menu page design review.', 'in_progress', 2),
  ('c0000000-0000-0000-0000-000000000001', 'Square integration', 'Connect online ordering and menu sync.', 'pending', 3),
  ('c0000000-0000-0000-0000-000000000001', 'Launch', 'Go live with the new website.', 'pending', 4)
ON CONFLICT DO NOTHING;

-- Sample messages
INSERT INTO messages (project_id, sender_uid, sender_role, body) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'dev-admin-uid', 'admin', 'Hi Jane! I''ve started working on the design. I''ll have mockups ready for review by Friday.'),
  ('c0000000-0000-0000-0000-000000000001', 'dev-client-uid-001', 'client', 'Great! Can you make sure the menu is front and center? That''s what most customers are looking for.')
ON CONFLICT DO NOTHING;
