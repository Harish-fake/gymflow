import dotenv from 'dotenv';
dotenv.config();

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'test-service-key';

export const adminToken = 'test-admin-token';
export const trainerToken = 'test-trainer-token';
export const memberToken = 'test-member-token';
export const uuid = '00000000-0000-0000-0000-000000000001';

export default { adminToken, trainerToken, memberToken, uuid };
