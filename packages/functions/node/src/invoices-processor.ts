import { Sqs, withAws } from "@printworks/core/utils/aws";
import { nanoIdSchema } from "@printworks/core/utils/shared";
import { Resource } from "sst";
import * as v from "valibot";

import type { EventBridgeHandler, SQSEvent, SQSRecord } from "aws-lambda";

// TODO: Finish implementing invoices processor

export const handler: EventBridgeHandler<
  "InvoicesProcessor",
  string,
  void
> = async (event) =>
  withAws({ sqs: { client: new Sqs.Client() } }, async () => {
    const { Records } = JSON.parse(event.detail) as SQSEvent;

    const failures: Array<SQSRecord> = [];

    for (const record of Records)
      try {
        await processRecord(record);
      } catch (e) {
        console.error("Failed to process record: ", record, e);

        failures.push(record);
      }

    if (failures.length === Records.length)
      throw new Error("Failed to process all records");

    try {
      for (const failure of failures)
        await Sqs.sendMessage({
          QueueUrl: Resource.InvoicesProcessorDeadLetterQueue.url,
          MessageBody: JSON.stringify(failure),
        });
    } catch (e) {
      console.error(
        "Failed to send invoices processor failures to dead letter queue: ",
        e,
      );
    }
  });

async function processRecord(record: SQSRecord) {
  const { invoiceId, tenantId } = v.parse(
    v.object({ invoiceId: v.string(), tenantId: nanoIdSchema }),
    record.body,
  );
}
