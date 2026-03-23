/**
 * Event Operations
 *
 * Functions for subscribing to Docker events
 */
import { docker } from "./client";
import type { DockerEvent, EventFilters } from "./types";

/**
 * Subscribe to Docker events
 * Returns a function to stop the event stream
 */
export function subscribeToEvents(
  onEvent: (event: DockerEvent) => void,
  filters?: EventFilters,
): () => void {
  // Build filter string from filters object
  let filterString = "";
  if (filters) {
    const filterObj: Record<string, unknown> = {};
    if (filters.event) filterObj.event = filters.event;
    if (filters.image) filterObj.image = filters.image;
    if (filters.container) filterObj.container = filters.container;
    if (filters.volume) filterObj.volume = filters.volume;
    if (filters.network) filterObj.network = filters.network;
    if (filters.daemon) filterObj.daemon = filters.daemon;
    if (filters.node) filterObj.node = filters.node;
    if (filters.service) filterObj.service = filters.service;
    if (filters.type) filterObj.type = filters.type;
    filterString = JSON.stringify(filterObj);
  }

  const eventStream = docker.getEvents({
    filters: filterString || undefined,
  } as unknown as Parameters<typeof docker.getEvents>[0]);

  const handleEvent = (chunk: Buffer) => {
    try {
      const event = JSON.parse(chunk.toString()) as DockerEvent;
      onEvent(event);
    } catch (error) {
      console.error("Error parsing Docker event:", error);
    }
  };

  eventStream.then((stream) => {
    stream.on("data", handleEvent);
    stream.on("error", (error: Error) => {
      console.error("Docker events stream error:", error);
    });
  });

  // Return cleanup function
  return () => {
    eventStream.then((stream) => {
      stream.removeListener("data", handleEvent);
      // @ts-expect-error - destroy exists on the underlying stream
      stream.destroy?.();
    });
  };
}
