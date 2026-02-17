-- Seed data: Default Chase categories and app settings
-- Run after migration 001_initial.sql

INSERT OR IGNORE INTO categories (name, source) VALUES
    ('Automotive', 'chase'),
    ('Bills & Utilities', 'chase'),
    ('Education', 'chase'),
    ('Entertainment', 'chase'),
    ('Fees & Adjustments', 'chase'),
    ('Food & Drink', 'chase'),
    ('Gas', 'chase'),
    ('Gifts & Donations', 'chase'),
    ('Groceries', 'chase'),
    ('Health & Wellness', 'chase'),
    ('Home', 'chase'),
    ('Insurance', 'chase'),
    ('Kids', 'chase'),
    ('Miscellaneous', 'chase'),
    ('Personal', 'chase'),
    ('Pets', 'chase'),
    ('Professional Services', 'chase'),
    ('Shopping', 'chase'),
    ('Travel', 'chase');

INSERT OR IGNORE INTO settings (key, value) VALUES
    ('theme', 'system'),
    ('summary_bar_visible', 'true'),
    ('default_date_range', 'current_month'),
    ('sidebar_collapsed', 'false');
