import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
const databaseKey = process.env.DATABASE_KEY;

export const database = (databaseUrl && databaseKey)
  ? createClient(databaseUrl, databaseKey)
  : {
      from() {
        throw new Error(
          'Database is not configured. Set DATABASE_URL and DATABASE_KEY in your environment.'
        );
      },
    };


