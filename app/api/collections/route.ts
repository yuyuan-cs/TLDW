import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withSecurity, SECURITY_PRESETS } from '@/lib/security-middleware';

async function getHandler(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Fetch user's collections
    const { data: collections, error } = await supabase
      .from('video_collections')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch collections error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch collections' },
        { status: 500 }
      );
    }

    return NextResponse.json({ collections });
  } catch (error) {
    console.error('Get collections error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collections' },
      { status: 500 }
    );
  }
}

async function postHandler(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { title, description, thumbnail } = await request.json();

    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Collection title is required' },
        { status: 400 }
      );
    }

    // Create collection
    const { data: collection, error } = await supabase
      .from('video_collections')
      .insert({
        user_id: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        thumbnail: thumbnail || null,
        video_count: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Create collection error:', error);
      return NextResponse.json(
        { error: 'Failed to create collection' },
        { status: 500 }
      );
    }

    return NextResponse.json({ collection });
  } catch (error) {
    console.error('Create collection error:', error);
    return NextResponse.json(
      { error: 'Failed to create collection' },
      { status: 500 }
    );
  }
}

async function deleteHandler(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { collectionId } = await request.json();

    if (!collectionId) {
      return NextResponse.json(
        { error: 'Collection ID is required' },
        { status: 400 }
      );
    }

    // Delete collection (this will cascade delete collection_videos)
    const { error } = await supabase
      .from('video_collections')
      .delete()
      .eq('id', collectionId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Delete collection error:', error);
      return NextResponse.json(
        { error: 'Failed to delete collection' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete collection error:', error);
    return NextResponse.json(
      { error: 'Failed to delete collection' },
      { status: 500 }
    );
  }
}

export const GET = withSecurity(getHandler, SECURITY_PRESETS.AUTHENTICATED);
export const POST = withSecurity(postHandler, SECURITY_PRESETS.AUTHENTICATED);
export const DELETE = withSecurity(deleteHandler, SECURITY_PRESETS.AUTHENTICATED);
