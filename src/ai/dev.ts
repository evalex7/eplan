'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/reschedule-maintenance-suggestions.ts';
