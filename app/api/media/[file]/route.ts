import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { MEDIA_DIR } from '@/lib/db';
import { isAuthed } from '@/lib/auth';

const TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { file: string } },
) {
  if (!isAuthed()) {
    return new NextResponse('Não autorizado', { status: 401 });
  }
  // Prevent path traversal: only allow a bare filename.
  const safe = path.basename(params.file);
  const filePath = path.join(MEDIA_DIR, safe);
  if (!filePath.startsWith(MEDIA_DIR) || !fs.existsSync(filePath)) {
    return new NextResponse('Não encontrado', { status: 404 });
  }
  const ext = path.extname(safe).toLowerCase();
  const data = fs.readFileSync(filePath);
  return new NextResponse(data, {
    status: 200,
    headers: {
      'Content-Type': TYPES[ext] ?? 'application/octet-stream',
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
