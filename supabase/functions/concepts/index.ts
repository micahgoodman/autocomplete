import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface Database {
  public: {
    Tables: {
      module_data: {
        Row: {
          id: string;
          module_type: string;
          data: any;
          sub_modules: any[];
          permissions: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          module_type: string;
          data: any;
          sub_modules?: any[];
          permissions?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          module_type?: string;
          data?: any;
          sub_modules?: any[];
          permissions?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const url = new URL(req.url);
    const filter = url.searchParams.get('filter');
    const all = url.searchParams.get('all') === 'true';
    const contextType = url.searchParams.get('contextType');
    const contextId = url.searchParams.get('contextId');
    const identityKey = url.searchParams.get('identityKey');
    const parentsOnly = url.searchParams.get('parentsOnly') === 'true';
    const childType = url.searchParams.get('childType');
    const childId = url.searchParams.get('childId');

    switch (req.method) {
      case 'GET': {
        // Parents-of lookup shortcut
        if (parentsOnly && childType && childId) {
          const { data: parents, error: perr } = await supabaseClient
            .from('module_data')
            .select('id, module_type, data')
            .contains('sub_modules', { [childType]: [childId] } as any);
          if (perr) throw perr;

          const payload = (parents ?? []).map((p: any) => ({
            id: p.id,
            type: p.module_type,
            title: p.data?.name ?? p.data?.text ?? p.id,
          }));

          return new Response(JSON.stringify(payload), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }

        let query = supabaseClient
          .from('module_data')
          .select('*');

        if (filter) {
          query = query.eq('module_type', filter);
        }

        if (identityKey) {
          query = query.eq('data->>identity_key', identityKey);
        }

        if (contextType && contextId && filter) {
          // Association-based lookup: read children listed under parent's sub_modules[filter]
          const { data: parentRow, error: parentErr } = await supabaseClient
            .from('module_data')
            .select('*')
            .eq('module_type', contextType)
            .eq('id', contextId)
            .single();
          if (parentErr) throw parentErr;

          const subs = (parentRow?.sub_modules ?? {}) as Record<string, any>;
          const childIds: string[] = Array.isArray((subs as any)[filter]) ? (subs as any)[filter] : [];

          if (childIds.length === 0) {
            return new Response(JSON.stringify([]), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
          }

          const { data: children, error: childErr } = await supabaseClient
            .from('module_data')
            .select('*')
            .eq('module_type', filter)
            .in('id', childIds);
          if (childErr) throw childErr;

          // Preserve order of childIds
          const map = new Map(children?.map((c: any) => [c.id, c]) ?? []);
          const ordered = childIds.map((id) => map.get(id)).filter(Boolean) as any[];

          const transformed = ordered.map((item: any) => ({
            id: item.id,
            ...item.data,
            context: null,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
          }));

          return new Response(JSON.stringify(transformed), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }

        const { data, error } = await query.order('created_at', { ascending: true });

        if (error) throw error;

        // Transform data to match expected format (context is not used; always null)
        const transformedData = data?.map((item) => ({
          id: item.id,
          ...item.data,
          context: null,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        })) || [];

        return new Response(JSON.stringify(transformedData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      case 'POST': {
        // Generic association operations via action parameter
        const action = url.searchParams.get('action');
        if (action === 'associate' || action === 'disassociate') {
          const body = await req.json();
          const parentType = String(body?.parentType || '');
          const parentId = String(body?.parentId || '');
          const childType = String(body?.childType || '');
          const childId = String(body?.childId || '');

          if (!parentType || !parentId || !childType || !childId) {
            return new Response(JSON.stringify({ error: 'parentType, parentId, childType, childId are required' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            });
          }

          const { data: parentRow, error: parentErr } = await supabaseClient
            .from('module_data')
            .select('id, sub_modules')
            .eq('module_type', parentType)
            .eq('id', parentId)
            .single();
          if (parentErr) throw parentErr;

          const subs = (parentRow?.sub_modules ?? {}) as Record<string, string[]>;
          const arr = Array.isArray(subs[childType]) ? subs[childType] : [];
          let nextArr = arr.slice();
          if (action === 'associate') {
            if (!nextArr.includes(childId)) nextArr.push(childId);
          } else {
            nextArr = nextArr.filter((id) => id !== childId);
          }
          const nextSubs = { ...subs, [childType]: nextArr } as any;

          const { error: updErr } = await supabaseClient
            .from('module_data')
            .update({ sub_modules: nextSubs })
            .eq('id', parentId);
          if (updErr) throw updErr;

          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }

        const body = await req.json();
        const { context, ...data } = body;

        if (!filter) {
          return new Response(JSON.stringify({ error: 'filter (module_type) is required' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          });
        }

        const insertData = {
          module_type: filter,
          data,
        } as any;

        const { data: result, error } = await supabaseClient
          .from('module_data')
          .insert(insertData)
          .select('id')
          .single();

        if (error) throw error;

        // If context provided, associate the newly created item to the parent
        if (context && context.type && typeof context.id !== 'undefined' && context.id !== null) {
          const { data: parentRow, error: parentErr } = await supabaseClient
            .from('module_data')
            .select('id, sub_modules')
            .eq('module_type', context.type)
            .eq('id', String(context.id))
            .single();
          if (parentErr) throw parentErr;

          const subs = (parentRow?.sub_modules ?? {}) as Record<string, string[]>;
          const arr = Array.isArray(subs[filter]) ? subs[filter] : [];
          const nextArr = arr.includes(result.id) ? arr : [...arr, result.id];
          const nextSubs = { ...subs, [filter]: nextArr } as any;

          const { error: updErr } = await supabaseClient
            .from('module_data')
            .update({ sub_modules: nextSubs })
            .eq('id', String(context.id));
          if (updErr) throw updErr;
        }

        return new Response(JSON.stringify({ id: result.id }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      case 'PATCH': {
        const segments = url.pathname.split('/');
        const id = segments[segments.length - 1];
        const body = await req.json();

        // Fetch existing row to merge data and enforce constraints
        const { data: existing, error: fetchErr } = await supabaseClient
          .from('module_data')
          .select('*')
          .eq('id', id)
          .single();
        if (fetchErr) throw fetchErr;

        const currentData = existing?.data || {};
        const newData = { ...currentData, ...body };

        const { error } = await supabaseClient
          .from('module_data')
          .update({ data: newData })
          .eq('id', id);

        if (error) throw error;

        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      case 'DELETE': {
        const segments = url.pathname.split('/');
        const id = segments[segments.length - 1];

        const { error } = await supabaseClient
          .from('module_data')
          .delete()
          .eq('id', id);

        if (error) throw error;

        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      default:
        return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});