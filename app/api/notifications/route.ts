import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notificationUpdateSchema, parseBody } from '@/lib/api/validation';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get('unread') === 'true';
    const limit = parseInt(url.searchParams.get('limit') || '20');

    let notifications: any[] = [];
    let unreadCount = 0;

    const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_notifications', {
      p_user_id: user.id,
      p_unread_only: unreadOnly,
      p_limit: limit,
    });

    if (!rpcError && rpcData) {
      notifications = rpcData.notifications || [];
      unreadCount = rpcData.unread_count || 0;
    } else {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (unreadOnly) {
        query = query.eq('is_read', false);
      }

      const { data, error } = await query;
      if (error) {
        return NextResponse.json({ notifications: [], unread_count: 0 });
      }
      notifications = data || [];

      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      unreadCount = count || 0;
    }

    return NextResponse.json({ notifications, unread_count: unreadCount });
  } catch (error: any) {
    console.error('Notifications GET error:', error);
    return NextResponse.json({ notifications: [], unread_count: 0 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rawBody = await request.json();
    const { data: body, error: validationError } = parseBody(notificationUpdateSchema, rawBody);
    if (validationError) return validationError;
    const { notification_id, mark_all_read } = body;

    const { error: rpcError } = await supabase.rpc('mark_notification_read', {
      p_user_id: user.id,
      p_notification_id: notification_id || null,
      p_mark_all: mark_all_read || false,
    });

    if (!rpcError) {
      return NextResponse.json({ success: true });
    }

    if (mark_all_read) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      return NextResponse.json({ success: true });
    }

    if (notification_id) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification_id)
        .eq('user_id', user.id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Missing notification_id or mark_all_read' }, { status: 400 });
  } catch (error: any) {
    console.error('Notifications PATCH error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update notification' }, { status: 500 });
  }
}
