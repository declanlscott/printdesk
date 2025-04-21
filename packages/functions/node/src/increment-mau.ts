import { withActor } from "@printdesk/core/actors/context";
import { DynamoDb } from "@printdesk/core/aws";
import { withAws } from "@printdesk/core/aws/context";
import { Users } from "@printdesk/core/users";
import { Constants } from "@printdesk/core/utils/constants";
import { nanoIdSchema } from "@printdesk/core/utils/shared";
import * as v from "valibot";

import type {
  DynamoDBBatchItemFailure,
  DynamoDBStreamHandler,
} from "aws-lambda";

export const handler: DynamoDBStreamHandler = async (event) =>
  withAws(
    () => ({
      dynamoDb: {
        documentClient: DynamoDb.DocumentClient.from(new DynamoDb.Client()),
      },
    }),
    async () => {
      const batchItemFailures: Array<DynamoDBBatchItemFailure> = [];

      for (const { dynamodb: record } of event.Records) {
        const itemIdentifier = record?.SequenceNumber;
        if (!itemIdentifier) {
          console.error("Missing sequence number in stream record:", record);
          continue;
        }

        const pk = record.NewImage?.[Constants.PK].S;
        if (!pk) {
          console.error("Missing pk in stream record:", record);
          continue;
        }

        try {
          const [, tenantId, , month] = v.parse(
            v.tuple([
              v.literal(Constants.TENANT),
              nanoIdSchema,
              v.literal(Constants.MONTH),
              v.pipe(
                v.string(),
                v.regex(Constants.MONTH_TRUNCATED_ISO_DATE_REGEX),
              ),
            ]),
            DynamoDb.splitKey(pk),
          );

          await withActor(
            () => ({
              kind: Constants.ACTOR_KINDS.SYSTEM,
              properties: { tenantId },
            }),
            async () => Users.incrementMonthlyActive(month),
          );
        } catch (e) {
          console.error("Error processing stream record:", e);
          batchItemFailures.push({ itemIdentifier });
          continue;
        }
      }

      return { batchItemFailures };
    },
  );
