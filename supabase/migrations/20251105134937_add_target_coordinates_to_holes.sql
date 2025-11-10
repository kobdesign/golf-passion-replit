-- Add target coordinates to holes table for default target position
ALTER TABLE holes ADD COLUMN IF NOT EXISTS target_latitude double precision;
ALTER TABLE holes ADD COLUMN IF NOT EXISTS target_longitude double precision;

-- Add helpful comment
COMMENT ON COLUMN holes.target_latitude IS 'Default target latitude for hole (typically midpoint on fairway between tee and pin)';
COMMENT ON COLUMN holes.target_longitude IS 'Default target longitude for hole (typically midpoint on fairway between tee and pin)';
