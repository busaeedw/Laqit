import { drizzle } from 'drizzle-orm/node-postgres';
import { laqitInspections } from './shared/schema';
import { eq } from 'drizzle-orm';
import { Client } from 'pg';

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const db = drizzle(client);
  const results = await db.select().from(laqitInspections).where(eq(laqitInspections.customerId, '0b8a4e84-60cc-4c68-8922-004822aaf686'));
  const drafts = results.filter((r: any) => r.status === 'draft');
  if (drafts.length === 0) {
    console.log('No draft orders found.');
  } else {
    drafts.forEach((d: any) => {
      console.log(`- ${d.inspectionNo} | ${d.status} | ${d.createdAt}`);
    });
  }
  await client.end();
}
main();
