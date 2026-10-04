import { handle, json } from '@/lib/server/http';
import { vkIdMode } from '@/lib/server/vkid';

// GET /api/auth/providers -> { vk: 'live' | 'mock' | 'off' } — lets the UI show or hide "Войти с VK ID"
export const GET = handle(async () => json({ vk: vkIdMode() }));
