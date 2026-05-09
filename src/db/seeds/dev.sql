-- Dev seed data for D1 (SQLite).
-- Run with: npm run seed
--
-- The auth user rows below mirror what Better Auth would create on signup,
-- so the client row's auth_uid FK is satisfied. Passwords aren't seeded;
-- to actually log in locally, hit the Better Auth signup endpoint.

INSERT OR IGNORE INTO leads (id, name, business, email, phone, pos, website, message, status) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Jane Smith', 'Jane''s Bistro', 'jane@janesbistro.com', '(555) 123-4567', 'Square', 'https://janesbistro.com', 'Our site looks dated and doesn''t match the shop. Want something custom that someone actually maintains for us.', 'converted'),
  ('a0000000-0000-0000-0000-000000000002', 'Mike Torres', 'Fresh Cuts Barbershop', 'mike@freshcuts.com', '(555) 234-5678', 'Clover', NULL, 'Looking for someone to handle the whole site so I can focus on the shop. Tired of freelancers ghosting.', 'new'),
  ('a0000000-0000-0000-0000-000000000003', 'Sarah Chen', 'Urban Threads Boutique', 'sarah@urbanthreads.com', '(555) 345-6789', 'Square', 'https://urbanthreads.squarespace.com', 'Site is slow, looks dated, and Squarespace is fighting me on the design. Need an upgrade.', 'contacted');

INSERT OR IGNORE INTO user (id, name, email, email_verified) VALUES
  ('dev-client-uid-001', 'Jane Smith', 'jane@janesbistro.com', 1);

INSERT OR IGNORE INTO clients (id, lead_id, auth_uid, name, business, email) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'dev-client-uid-001', 'Jane Smith', 'Jane''s Bistro', 'jane@janesbistro.com');

INSERT OR IGNORE INTO projects (id, client_id, title, description, status, start_date) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Jane''s Bistro Website', 'Custom Astro site for the bistro — menu, hours, location, story. Online ordering via Square wired in.', 'development', '2026-04-01');

INSERT OR IGNORE INTO milestones (id, project_id, title, description, status, sort_order) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Discovery call', 'Initial call to understand the business and what the owner needs the site to do.', 'complete', 1),
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Design mockup', 'Homepage and menu page design review.', 'in_progress', 2),
  ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'Astro build', 'Build the site, wire up SEO, accessibility, and the contact form.', 'pending', 3),
  ('d0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'Square online ordering', 'Wire up online ordering through Square checkout from the menu page.', 'pending', 4),
  ('d0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000001', 'Launch', 'Point DNS, smoke test, go live.', 'pending', 5);

INSERT OR IGNORE INTO messages (id, project_id, sender_uid, sender_role, body) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'dev-admin-uid', 'admin', 'Hi Jane! Started the design — mockups ready Friday.'),
  ('e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'dev-client-uid-001', 'client', 'Great. Make sure the menu is front and center on the homepage, and the order button is hard to miss.');
