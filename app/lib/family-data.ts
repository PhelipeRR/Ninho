import { supabase } from './supabase';

export type AppTask = {
  id: string;
  title: string;
  meta: string;
  person: string;
  tone: string;
  done: boolean;
  priority: string;
};

export type AppList = { id: string; name: string; items: string[]; itemIds: string[]; checked: boolean[] };

export async function getFamily(userId: string) {
  const existing = await supabase.from('family_members').select('family_id, families(*)').eq('user_id', userId).limit(1).maybeSingle();
  if (existing.error) throw existing.error;
  return (existing.data?.family_id as string | null) ?? null;
}

export async function createFamily(name: string) {
  const created = await supabase.rpc('create_family', { p_name: name.trim() });
  if (created.error) throw created.error;
  return created.data as string;
}

export async function createFamilyInvite(familyId: string, email: string) {
  const { data, error } = await supabase.from('family_invitations').insert({ family_id: familyId, email: email.trim().toLowerCase() }).select('token').single();
  if (error) throw error;
  return data.token as string;
}

export async function loadTasks(familyId: string): Promise<AppTask[]> {
  const { data, error } = await supabase.from('tasks').select('id,title,due_at,priority,completed,profiles:assigned_to(display_name)').eq('family_id', familyId).order('due_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id, title: row.title, meta: row.due_at ? new Date(row.due_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Sem prazo',
    person: row.profiles?.display_name ?? 'Você', tone: 'orange', done: row.completed, priority: row.priority,
  }));
}

export async function createTask(familyId: string, userId: string, title: string) {
  const { data, error } = await supabase.from('tasks').insert({ family_id: familyId, created_by: userId, title, priority: 'Normal' }).select('id,title,priority,completed').single();
  if (error) throw error;
  return { id: data.id, title: data.title, meta: 'Criada agora', person: 'Você', tone: 'orange', done: data.completed, priority: data.priority } satisfies AppTask;
}

export async function setTaskCompleted(id: string, completed: boolean) {
  const { error } = await supabase.from('tasks').update({ completed, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function loadLists(familyId: string): Promise<AppList[]> {
  const { data, error } = await supabase.from('shopping_lists').select('id,name,shopping_items(id,label,checked)').eq('family_id', familyId).order('created_at');
  if (error) throw error;
  return (data ?? []).map((row: any) => ({ id: row.id, name: row.name, items: (row.shopping_items ?? []).map((item: any) => item.label), itemIds: (row.shopping_items ?? []).map((item: any) => item.id), checked: (row.shopping_items ?? []).map((item: any) => item.checked) }));
}

export async function seedFirstList(familyId: string, userId: string) {
  const { data: existing } = await supabase.from('shopping_lists').select('id').eq('family_id', familyId).limit(1);
  if (existing?.length) return;
  const { data: list, error } = await supabase.from('shopping_lists').insert({ family_id: familyId, created_by: userId, name: 'Lista da casa' }).select('id').single();
  if (!error && list) await supabase.from('shopping_items').insert([{ list_id: list.id, created_by: userId, label: 'Adicionar o primeiro item' }]);
}

export async function setShoppingItemChecked(id: string, checked: boolean) {
  const { error } = await supabase.from('shopping_items').update({ checked, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}
