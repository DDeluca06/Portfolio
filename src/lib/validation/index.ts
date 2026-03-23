import { z } from "zod";

export const historyQuerySchema = z.object({
  measurement: z
    .enum([
      "cpu",
      "memory",
      "disk",
      "system",
      "docker_containers",
      "docker_system",
    ])
    .default("cpu"),
  range: z.enum(["1h", "6h", "24h", "7d", "30d"]).default("1h"),
  server_id: z.string().optional(),
  aggregate: z.enum(["mean", "min", "max", "first", "last"]).default("mean"),
});

export const aggregateQuerySchema = z.object({
  measurement: z
    .enum([
      "cpu",
      "memory",
      "disk",
      "system",
      "docker_containers",
      "docker_system",
    ])
    .default("cpu"),
  range: z.enum(["1h", "6h", "24h", "7d", "30d"]).default("24h"),
  server_id: z.string().optional(),
});

export type HistoryQuery = z.infer<typeof historyQuerySchema>;
export type AggregateQuery = z.infer<typeof aggregateQuerySchema>;
