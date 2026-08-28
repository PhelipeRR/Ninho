import { supabase } from '../lib/supabase';

export async function createDocumentUpload(familyId: string, file: { name: string; type: string; size: number }) {
  const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic'];
  if (!allowed.includes(file.type)) throw new Error('Formato de documento não permitido.');
  if (file.size > 10 * 1024 * 1024) throw new Error('O arquivo excede o limite de 10 MB.');

  const extension = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const storagePath = `${familyId}/${crypto.randomUUID()}.${extension}`;
  return { storagePath, bucket: 'family-documents' };
}

export async function getDocumentDownloadUrl(storagePath: string) {
  const { data, error } = await supabase.storage.from('family-documents').createSignedUrl(storagePath, 300);
  if (error) throw error;
  return data.signedUrl;
}
