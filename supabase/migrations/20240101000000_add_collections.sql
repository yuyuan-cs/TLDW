-- Create video_collections table
CREATE TABLE IF NOT EXISTS video_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  video_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create collection_videos table (junction table)
CREATE TABLE IF NOT EXISTS collection_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES video_collections(id) ON DELETE CASCADE,
  video_analysis_id UUID NOT NULL REFERENCES video_analyses(id) ON DELETE CASCADE,
  order INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(collection_id, video_analysis_id)
);

-- Add source column to video_analyses
ALTER TABLE video_analyses 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'youtube';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_video_collections_user_id ON video_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_videos_collection_id ON collection_videos(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_videos_video_analysis_id ON collection_videos(video_analysis_id);
CREATE INDEX IF NOT EXISTS idx_video_analyses_source ON video_analyses(source);

-- Create functions to manage video counts
CREATE OR REPLACE FUNCTION increment_collection_video_count(collection_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE video_collections
  SET video_count = video_count + 1,
      updated_at = NOW()
  WHERE id = collection_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_collection_video_count(collection_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE video_collections
  SET video_count = GREATEST(0, video_count - 1),
      updated_at = NOW()
  WHERE id = collection_id;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE video_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_videos ENABLE ROW LEVEL SECURITY;

-- Policies for video_collections
CREATE POLICY "Users can view their own collections"
  ON video_collections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own collections"
  ON video_collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections"
  ON video_collections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections"
  ON video_collections FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for collection_videos
CREATE POLICY "Users can view videos in their collections"
  ON collection_videos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM video_collections
      WHERE video_collections.id = collection_videos.collection_id
      AND video_collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add videos to their collections"
  ON collection_videos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM video_collections
      WHERE video_collections.id = collection_videos.collection_id
      AND video_collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove videos from their collections"
  ON collection_videos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM video_collections
      WHERE video_collections.id = collection_videos.collection_id
      AND video_collections.user_id = auth.uid()
    )
  );
