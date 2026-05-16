-- Create user_follows table for social networking
CREATE TABLE public.user_follows (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(follower_id, following_id)
);

-- Turn on Row Level Security
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- Allow users to read all follows
CREATE POLICY "Anyone can read follows" ON public.user_follows
  FOR SELECT USING (true);

-- Allow authenticated users to follow others (insert their own follow)
CREATE POLICY "Users can follow others" ON public.user_follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

-- Allow authenticated users to unfollow (delete their own follow)
CREATE POLICY "Users can unfollow" ON public.user_follows
  FOR DELETE USING (auth.uid() = follower_id);
