'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import fs from 'node:fs';
import path from 'node:path';
import { checkPassword, isAuthed, signIn, signOut } from '@/lib/auth';
import { MEDIA_DIR } from '@/lib/db';
import * as repo from '@/lib/repo';
import type { NewPersonInput, Person, RelativeKind } from '@/lib/types';

function guard() {
  if (!isAuthed()) throw new Error('Não autenticado.');
}

export async function login(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const pw = String(formData.get('password') ?? '');
  if (!checkPassword(pw)) {
    return { error: 'Palavra-passe incorreta.' };
  }
  signIn();
  redirect('/');
}

export async function logout(): Promise<void> {
  signOut();
  redirect('/login');
}

export async function createPersonAction(input: NewPersonInput): Promise<string> {
  guard();
  const id = repo.createPerson(input);
  revalidatePath('/');
  return id;
}

export async function updatePersonAction(
  id: string,
  patch: Partial<Person>,
): Promise<void> {
  guard();
  repo.updatePerson(id, patch);
  revalidatePath('/');
}

export async function deletePersonAction(id: string): Promise<void> {
  guard();
  repo.deletePerson(id);
  revalidatePath('/');
}

export async function addRelativeAction(
  kind: RelativeKind,
  anchorId: string,
  input: NewPersonInput,
): Promise<repo.AddRelativeResult> {
  guard();
  const result = repo.addRelative(kind, anchorId, input);
  revalidatePath('/');
  return result;
}

export async function addEventAction(
  individualId: string,
  title: string,
  date: string,
  description: string,
): Promise<void> {
  guard();
  repo.addEvent(individualId, title, date, description);
  revalidatePath('/');
}

export async function deleteEventAction(id: string): Promise<void> {
  guard();
  repo.deleteEvent(id);
  revalidatePath('/');
}

export async function setHomeAction(id: string): Promise<void> {
  guard();
  repo.setSetting('home_id', id);
  revalidatePath('/');
}

export async function seedExampleAction(): Promise<void> {
  guard();
  repo.seedExample();
  revalidatePath('/');
}

export async function uploadPhotoAction(formData: FormData): Promise<{ error?: string }> {
  guard();
  const personId = String(formData.get('personId') ?? '');
  const file = formData.get('file');
  if (!personId || !(file instanceof File) || file.size === 0) {
    return { error: 'Ficheiro inválido.' };
  }
  if (file.size > 8 * 1024 * 1024) {
    return { error: 'A imagem excede 8 MB.' };
  }
  const type = file.type;
  const ext = type.includes('png')
    ? 'png'
    : type.includes('webp')
      ? 'webp'
      : type.includes('gif')
        ? 'gif'
        : 'jpg';
  const filename = `${personId}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
  fs.writeFileSync(path.join(MEDIA_DIR, filename), buffer);
  repo.setPhoto(personId, filename);
  revalidatePath('/');
  return {};
}

export async function exportDataAction(): Promise<string> {
  guard();
  return JSON.stringify(repo.getAllData(), null, 2);
}
