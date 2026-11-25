import type { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

const istYear = (now: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", year: "2-digit" }).format(now);

/**
 * Next registration number, `IBMV/YY/#####`, from an atomic per-year counter.
 * Call it inside the transaction that creates the learner profile so a failed create does not skip a number.
 */
export async function nextRegistrationNo(tx: Tx, now = new Date()) {
    const year = istYear(now);
    const counter = await tx.counter.upsert({
        where: { key: `reg:${year}` },
        create: { key: `reg:${year}`, value: 1 },
        update: { value: { increment: 1 } },
    });
    return `IBMV/${year}/${String(counter.value).padStart(5, "0")}`;
}
