'use server';

/**
 * @fileOverview AI-powered maintenance rescheduling assistant.
 *
 * - rescheduleMaintenanceSuggestions - Analyzes maintenance schedules and suggests optimal rescheduling.
 * - RescheduleMaintenanceSuggestionsInput - Input type for the rescheduleMaintenanceSuggestions function.
 * - RescheduleMaintenanceSuggestionsOutput - Return type for the rescheduleMaintenanceSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MaintenancePeriodSchema = z.object({
  id: z.string(),
  name: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  subdivision: z.string(),
  assignedEngineerIds: z.array(z.string()),
  equipmentDetails: z.string().optional(),
  status: z.string(),
});

const RescheduleMaintenanceSuggestionsInputSchema = z.object({
  periodToReschedule: MaintenancePeriodSchema.describe(
    'The specific maintenance period that needs to be rescheduled.'
  ),
  otherScheduledPeriods: z
    .array(MaintenancePeriodSchema)
    .describe('A list of other maintenance periods that are already scheduled.'),
  serviceHistory: z
    .string()
    .describe('The service history for the objects in JSON format.'),
  engineerAvailability: z
    .string()
    .describe('The availability of the service engineers in JSON format.'),
});
export type RescheduleMaintenanceSuggestionsInput = z.infer<
  typeof RescheduleMaintenanceSuggestionsInputSchema
>;

const SuggestionSchema = z.object({
  newDate: z
    .string()
    .describe(
      'The suggested new start date for the maintenance period in ISO 8601 format (YYYY-MM-DD).'
    ),
  reason: z
    .string()
    .describe('A clear and concise reason for why this new date is optimal.'),
  originalPeriodId: z
    .string()
    .describe(
      'The ID of the original maintenance period this suggestion is for.'
    ),
});

const RescheduleMaintenanceSuggestionsOutputSchema = z.object({
  suggestions: z
    .array(SuggestionSchema)
    .describe(
      'A list of suggestions for rescheduling the maintenance task.'
    ),
});
export type RescheduleMaintenanceSuggestionsOutput = z.infer<
  typeof RescheduleMaintenanceSuggestionsOutputSchema
>;

export async function rescheduleMaintenanceSuggestions(
  input: RescheduleMaintenanceSuggestionsInput
): Promise<RescheduleMaintenanceSuggestionsOutput> {
  return rescheduleMaintenanceSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'rescheduleMaintenanceSuggestionsPrompt',
  input: {schema: RescheduleMaintenanceSuggestionsInputSchema},
  output: {schema: RescheduleMaintenanceSuggestionsOutputSchema},
  prompt: `You are an AI assistant designed to analyze maintenance schedules and suggest optimal rescheduling for a specific task.

You will be provided with the following information:
- The maintenance period to reschedule (JSON format):
{{{json periodToReschedule}}}
- Other currently scheduled maintenance periods (JSON format):
{{{json otherScheduledPeriods}}}
- Service history for the objects (JSON format):
{{{serviceHistory}}}
- Availability of service engineers (JSON format):
{{{engineerAvailability}}}

Your task is to analyze this information and provide a few optimal alternative start dates for the given maintenance period.

For each suggestion, provide:
1.  A new start date ('newDate').
2.  A clear reason ('reason') explaining why this date is a good choice. Consider factors like avoiding conflicts with other tasks, engineer availability, and logical sequencing based on service history.
3.  The ID of the original period ('originalPeriodId'), which must match the ID from the input 'periodToReschedule'.

Output a list of suggestions in JSON format.
`,
});

const rescheduleMaintenanceSuggestionsFlow = ai.defineFlow(
  {
    name: 'rescheduleMaintenanceSuggestionsFlow',
    inputSchema: RescheduleMaintenanceSuggestionsInputSchema,
    outputSchema: RescheduleMaintenanceSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
