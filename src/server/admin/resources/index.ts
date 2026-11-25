import type { ResourceDef } from "@/server/admin/registry";
import { NotFound } from "@/server/http/errors";
import "server-only";
import { announcementResource } from "./announcements";
import { batchResource } from "./batches";
import { bookResource } from "./books";
import { courseResource } from "./courses";
import { leadResource } from "./leads";
import { learnerResource } from "./learners";
import { legalResource } from "./legal";
import { magazineResource } from "./magazines";
import { moduleResource } from "./modules";
import { peopleResource } from "./people";
import { teamResource } from "./team";
import { testimonialResource } from "./testimonials";
import { videoResource } from "./videos";

const definitions: ResourceDef[] = [
  teamResource, courseResource, bookResource, peopleResource, magazineResource, videoResource, testimonialResource, leadResource, legalResource, learnerResource, batchResource, announcementResource, moduleResource,
];

const byKey = new Map(definitions.map((def) => [def.key, def]));

/** Screens not yet migrated to the database have no entry and answer 404. */
export function getResource(key: string): ResourceDef {
  const def = byKey.get(key);
  if (!def) throw new NotFound();
  return def;
}

export function resourceKeys() {
  return [...byKey.keys()];
}
