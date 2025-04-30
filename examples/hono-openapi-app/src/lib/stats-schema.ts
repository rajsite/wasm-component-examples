import { z, createRoute } from '@hono/zod-openapi';

const StatsRequestBodySchema = z.object({
  values: z.array(z.number()).openapi({
    example: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  }),
});

const StatsResponseSchema = z.object({
  min: z.number().openapi({
    example: 1,
  }),
  max: z.number().openapi({
    example: 10,
  }),
  mean: z.number().openapi({
    example: 5.5,
  }),
  stdDev: z.number().openapi({
    example: 2.5,
  }),
  count: z.number().openapi({
    example: 10,
  }),
}).openapi('StatsResponse');

export const statsPostRoute = createRoute({
  method: 'post',
  path: '/stats',
  request: {
    body: {
      content: { 'application/json': { schema: StatsRequestBodySchema } },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: StatsResponseSchema,
        },
      },
      description: 'Get statistics',
    },
  },
});